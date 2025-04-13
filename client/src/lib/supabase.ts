import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, HostInfo } from '@shared/schema';

// Check if Supabase is properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wanrxefvgarsndfceelf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

// 确认使用的实际URL和Key
console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key (first 10 chars):', supabaseKey.substring(0, 10) + '...');

// Debug info
console.log('Supabase configured:', isSupabaseConfigured);
if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables are not set correctly');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'not set');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'set' : 'not set');
}

// Force local mode for debugging (set to true to bypass Supabase)
const forceLocalMode = false;

// Track host IDs for sessions
const sessionHostIds: Record<string, string> = {};

// 内存中存储消息翻译，因为数据库中没有这些列
// 键格式：`${messageId}`，值格式：{ translated_content, translation_status }
export const messageTranslations: Record<string, { translated_content?: string, translation_status: 'pending' | 'completed' | 'failed' }> = {};

// 添加回调函数存储，用于翻译完成时立即通知UI
export const translationCallbacks: Record<string, ((translated: string) => void)[]> = {};

// 用户的语言偏好
let userLanguagePreference: string | null = null;

// WebSocket连接
let wsConnection: WebSocket | null = null;
let wsConnectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000; // 重连间隔(毫秒)
let heartbeatInterval: number | null = null;
let currentSessionId: string = ''; // 当前会话ID，在初始化WebSocket时设置

// 全局事件发射器
const wsStatusChangeEvents: Array<(status: typeof wsConnectionStatus) => void> = [];

// 获取WebSocket连接状态的函数
export function getWsConnectionStatus(): typeof wsConnectionStatus {
  return wsConnectionStatus;
}

// 监听WebSocket状态变化的函数
export function addWsStatusListener(callback: (status: typeof wsConnectionStatus) => void): () => void {
  wsStatusChangeEvents.push(callback);
  
  // 立即通知当前状态
  callback(wsConnectionStatus);
  
  // 返回移除监听器的函数
  return () => {
    const index = wsStatusChangeEvents.indexOf(callback);
    if (index !== -1) {
      wsStatusChangeEvents.splice(index, 1);
    }
  };
}

// 更新WebSocket状态并触发事件的函数
function updateWsStatus(newStatus: typeof wsConnectionStatus) {
  if (wsConnectionStatus !== newStatus) {
    wsConnectionStatus = newStatus;
    
    // 触发所有状态变化事件
    wsStatusChangeEvents.forEach(callback => {
      try {
        callback(wsConnectionStatus);
      } catch (error) {
        console.error('处理WebSocket状态变化事件时出错:', error);
      }
    });
  }
}

// 翻译映射表 - 模拟基本翻译
const translationMap: Record<string, Record<string, string>> = {
  'en': {
    'Hello! Welcome to the chat. How can I help you today?': '您好！欢迎来到聊天。今天我能为您提供什么帮助？',
    'How can I help you?': '我能帮您什么？',
    'Thank you for your message.': '感谢您的留言。',
    'Is there anything else I can assist with?': '还有什么我能帮助您的吗？'
  },
  'zh': {
    '您好！欢迎来到聊天。今天我能为您提供什么帮助？': 'Hello! Welcome to the chat. How can I help you today?',
    '我能帮您什么？': 'How can I help you?',
    '感谢您的留言。': 'Thank you for your message.',
    '还有什么我能帮助您的吗？': 'Is there anything else I can assist with?'
  }
};

// Initialize Supabase client if configured
export const supabase = (isSupabaseConfigured && !forceLocalMode)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Fetch host information (merchant details)
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  try {
    console.log('Fetching host info for userId:', userId);
    
    // If Supabase is not configured, use demo host info
    if (!supabase) {
      console.log('Using local mode for host info (supabase client is null)');
      return {
        id: userId,
        name: "示例商家",
        title: "客户服务",
        url: "https://example.com",
        avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=merchant",
      };
    }
    
    // In a real implementation, we would fetch this from a table
    // For demo, use static data based on ID
    const hostInfo: HostInfo = {
      id: userId,
      name: "示例商家",
      title: "客户服务",
      url: "https://example.com",
      avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=" + userId,
    };
    
    return hostInfo;
  } catch (error) {
    console.error('Error fetching host info:', error);
    return null;
  }
}

// 获取主机消息并请求翻译
async function fetchHostMessagesForTranslation(sessionId: string) {
  if (!sessionId) {
    console.error('fetchHostMessagesForTranslation: sessionId 不能为空');
    return;
  }
  
  console.log(`正在获取会话 ${sessionId} 的主机消息以进行翻译...`);
  
  try {
    // 获取会话的所有消息
    const messages = await getChatMessages(sessionId);
    
    // 找出所有需要翻译的主机消息
    const hostMessages = messages.filter(msg => 
      msg.sender === 'host' && 
      (!msg.translated_content || msg.translation_status === 'failed') &&
      msg.content
    );
    
    console.log(`找到 ${hostMessages.length} 条需要翻译的主机消息`);
    
    if (hostMessages.length === 0) {
      console.log('没有需要翻译的主机消息');
      return;
    }
    
    // 获取用户首选语言
    const targetLanguage = localStorage.getItem('preferredLanguage') || 'zh';
    
    // 为每条消息请求翻译
    for (const message of hostMessages) {
      console.log(`请求翻译主机消息 ID=${message.id}: ${message.content.substring(0, 30)}...`);
      
      await translateMessage(
        message.id,
        message.content,
        'auto', // 让Edge Function自动检测语言
        targetLanguage
      );
      
      // 短暂等待，避免一次发送太多请求
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error('获取并翻译主机消息时出错:', error);
  }
}

// Get chat messages for a session
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    console.log('Getting chat messages for session:', sessionId);
    console.log('Supabase client initialized:', !!supabase);
    
    // When Supabase is not configured, return empty array initially
    if (!supabase) {
      console.log('Using local mode for messages (supabase client is null)');
      return [];
    }
    
    console.log('Querying Supabase for messages in session:', sessionId);
    
    const { data, error } = await supabase
      .from('messages')
      .select('id, chat_session_id, content, sender_id, sender_name, is_host, timestamp, translated_content, translation_status, original_language')
      .eq('chat_session_id', sessionId)
      .order('timestamp', { ascending: true });
      
    if (error) {
      console.error('Supabase query error for messages:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} messages in Supabase`);
    
    return (data || []).map(msg => {
      // 获取消息ID
      const msgId = msg.id;
      
      // 从内存缓存中获取翻译信息（如果存在）
      const cachedTranslation = messageTranslations[`${msgId}`];
      
      // 优先使用内存中的翻译数据，其次是数据库中的数据
      const translatedContent = cachedTranslation?.translated_content || msg.translated_content;
      const translationStatus = cachedTranslation?.translation_status || msg.translation_status || 'pending';
      
      return {
        id: msg.id,
        content: msg.content,
        sender: msg.is_host ? 'host' : 'guest', // 根据is_host转换为sender格式
        timestamp: new Date(msg.timestamp),
        translated_content: translatedContent,
        translation_status: translationStatus,
        original_language: msg.original_language
      };
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Send a new message
export async function sendMessage(
  sessionId: string, 
  content: string, 
  isHost: boolean
): Promise<ChatMessage | null> {
  // Determine message sender type
  const sender = isHost ? 'host' : 'guest';
  try {
    console.log(`Sending ${sender} message to session:`, sessionId);
    console.log('Supabase client initialized:', !!supabase);
    console.log('Message content:', content.substring(0, 20) + (content.length > 20 ? '...' : ''));
    
    // If Supabase is not configured, generate a local message
    if (!supabase) {
      console.log('Using local mode for sending message (supabase client is null)');
      const timestamp = new Date();
      const messageId = Date.now();
      
      // 为本地消息创建翻译记录
      if (isHost) {
        translateMessage(messageId, content, 'auto', 'en')
          .catch(error => console.error('Failed to translate local host message:', error));
      }
      
      return {
        id: messageId,
        content,
        sender,
        timestamp,
        translated_content: messageTranslations[`${messageId}`]?.translated_content,
        translation_status: messageTranslations[`${messageId}`]?.translation_status || 'pending'
      };
    }
    
    // Get saved host_id or generate a new ID
    let senderId: string;
    if (sender === 'host' && sessionHostIds[sessionId]) {
      // If this is a host message and we have a host_id for this session, use it
      senderId = sessionHostIds[sessionId];
      console.log('Using existing host_id for host message:', senderId);
    } else if (sender === 'guest') {
      // If this is a guest message, generate a unique UUID for the guest
      senderId = uuidv4();
      console.log('Generated new guest_id:', senderId);
    } else {
      // Default to generating a new UUID
      senderId = uuidv4();
      console.log('Generated fallback sender_id:', senderId);
    }
    
    // Create message object with correct column names
    const message = {
      chat_session_id: sessionId,
      content: content,
      sender_id: senderId,
      sender_name: isHost ? "客服" : "访客",
      is_host: isHost
    };
    
    console.log('Sending message to Supabase:', message);
    
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error when sending message:', error);
      throw error;
    }
    
    console.log('Message successfully sent to Supabase:', data?.id);
    
    // 为主机消息触发翻译
    if (isHost && data && data.id) {
      translateMessage(data.id, content, 'auto', 'en')
        .catch(error => console.error('Failed to translate host message:', error));
    }
    
    return {
      id: data.id,
      content: data.content,
      sender: isHost ? 'host' : 'guest',
      timestamp: new Date(data.timestamp),
      translated_content: messageTranslations[`${data.id}`]?.translated_content,
      translation_status: messageTranslations[`${data.id}`]?.translation_status || 'pending'
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

// Get or create a chat session
export async function getOrCreateChatSession(merchantId: string): Promise<string> {
  try {
    console.log('Getting or creating chat session for merchant:', merchantId);
    console.log('Supabase client initialized:', !!supabase);
    
    // If Supabase is not configured, return a local session ID (using UUID for consistency)
    if (!supabase) {
      console.log('Using local mode for session (supabase client is null)');
      const localSessionId = uuidv4();
      console.log('Generated local session UUID:', localSessionId);
      return localSessionId;
    }
    
    // Generate a new session ID for each visitor
    const sessionId = uuidv4();
    console.log('Generated new UUID session ID:', sessionId);
    
    // Create chat session record
    try {
      // Define session data using fixed merchant ID rather than random generation
      const chatSession = {
        id: sessionId,
        host_id: merchantId,
        host_name: "客服",
        guest_id: uuidv4(),
        guest_name: "访客"
      };
      
      // Save host_id for later use
      sessionHostIds[sessionId] = merchantId;
      
      console.log('Creating chat session record:', chatSession);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([chatSession])
        .select()
        .single();
        
      if (sessionError) {
        console.error('Error creating chat session:', sessionError);
        throw sessionError;
      }
      
      console.log('Chat session created successfully:', sessionData?.id);
      
      // Create welcome message
      const welcomeMessage = {
        chat_session_id: sessionId,
        content: "您好！感谢扫描二维码开始对话。请问有什么可以帮到您的？", 
        sender_id: merchantId,
        sender_name: "客服",
        is_host: true
      };
      
      console.log('Creating initial welcome message for session:', welcomeMessage);
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([welcomeMessage])
        .select()
        .single();
        
      if (messageError) {
        console.error('Error creating welcome message:', messageError);
        // Continue execution even if welcome message fails
      } else {
        console.log('Welcome message created successfully:', messageData?.id);
        
        // 触发欢迎消息的翻译
        if (messageData && messageData.id) {
          translateMessage(messageData.id, welcomeMessage.content, 'auto', 'en')
            .catch(error => console.error('Failed to translate welcome message:', error));
        }
      }
    } catch (error) {
      console.error('Error establishing session:', error);
      // Continue with the session ID anyway, even if session creation failed
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error managing chat session:', error);
    // For fallback, generate a proper UUID instead of a string
    const fallbackSessionId = uuidv4();
    console.log('Using fallback UUID session ID:', fallbackSessionId);
    return fallbackSessionId; // Fallback session ID
  }
}

// Subscribe to new messages
export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  // If Supabase is not configured, return a no-op cleanup function
  if (!supabase) {
    console.log('Using local mode for message subscription (supabase client is null)');
    return {
      unsubscribe: () => {},
    };
  }
  
  console.log('Setting up Supabase realtime subscription for session:', sessionId);
  
  return supabase
    .channel(`messages:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_session_id=eq.${sessionId}`,
      },
      (payload) => {
        console.log('New message received from realtime subscription:', payload);
        const message = payload.new as any;
        
        // 获取翻译状态（如果存在）
        const cachedTranslation = messageTranslations[`${message.id}`];
        
        const messageWithTranslation = {
          id: message.id,
          content: message.content,
          sender: message.is_host ? 'host' : 'guest',
          timestamp: new Date(message.timestamp),
          translated_content: cachedTranslation?.translated_content || message.translated_content,
          translation_status: cachedTranslation?.translation_status || message.translation_status || 'pending'
        };
        
        callback(messageWithTranslation);
        
        // 如果是主机消息，自动触发翻译
        if (message.is_host) {
          translateMessage(message.id, message.content, 'auto', 'en')
            .catch(error => console.error('Failed to translate new host message:', error));
        }
      }
    )
    .subscribe((status) => {
      console.log('Supabase realtime subscription status:', status);
    });
}

// 注册翻译结果回调函数
export function registerTranslationCallback(messageId: number, callback: (translated: string) => void) {
  const key = messageId.toString();
  if (!translationCallbacks[key]) {
    translationCallbacks[key] = [];
  }
  translationCallbacks[key].push(callback);
  
  // 如果翻译已经完成，立即触发回调
  const translation = messageTranslations[key];
  if (translation?.translation_status === 'completed' && translation?.translated_content) {
    callback(translation.translated_content);
  }
}

// 移除翻译结果回调函数
export function unregisterTranslationCallback(messageId: number, callback: (translated: string) => void) {
  const key = messageId.toString();
  if (translationCallbacks[key]) {
    translationCallbacks[key] = translationCallbacks[key].filter(cb => cb !== callback);
    if (translationCallbacks[key].length === 0) {
      delete translationCallbacks[key];
    }
  }
}

// 初始化WebSocket连接
export function initWebSocketConnection(sessionId: string, preferredLanguage?: string) {
  // 保存用户语言偏好
  if (preferredLanguage) {
    userLanguagePreference = preferredLanguage;
  }
  
  // 保存当前会话ID
  currentSessionId = sessionId;
  
  // 如果已经有连接，先关闭它
  if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
    console.log('关闭现有的WebSocket连接');
    wsConnection.close();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  updateWsStatus('connecting');
  reconnectAttempts = 0;
  
  // 创建新的WebSocket连接
  try {
    // 配置WebSocket连接策略
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 本地WebSocket URL - 通过本地服务器转发
    const localWsUrl = `${protocol}//${window.location.host}/ws/translate`;
    
    // 根据用户提供的信息，Supabase Edge Function URL
    // 支持多种部署环境的WebSocket连接设置
    const environmentConfig = {
      // Supabase Edge Function的URL (默认)
      supabase: {
        wsUrl: 'wss://wanrxefvgarsndfceelf.supabase.co/functions/v1/websocket-translator',
        name: 'Supabase Edge Function'
      },
      // 本地代理URL (通过本地服务器代理连接到Edge Function)
      local: {
        wsUrl: `${protocol}//${window.location.host}/ws/edge-proxy`,
        name: '本地代理'
      },
      // Cloudflare代理URL (通过Cloudflare Pages代理)
      cloudflare: {
        wsUrl: `${protocol}//${window.location.host}/ws/translate`,
        name: 'Cloudflare代理'
      }
    };
    
    // 获取当前环境
    const isCloudflare = window.location.host.includes('.pages.dev') || 
                         window.location.host.includes('.workers.dev');
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    const isReplit = window.location.host.includes('.replit.dev') || 
                     window.location.host.includes('.replit.app');
    
    // 根据当前环境选择适当的WebSocket URL
    let environment = 'supabase'; // 默认使用Supabase直连
    
    if (isCloudflare) {
      environment = 'cloudflare';
    } else if (isLocalhost) {
      environment = 'local';
    } else if (isReplit) {
      // 在Replit上，可以直接连接到Supabase，因为域名已在白名单中
      environment = 'supabase';
    }
    
    // 从环境配置中获取WebSocket URL
    const selectedConfig = environmentConfig[environment];
    const wsUrl = selectedConfig.wsUrl;
    
    console.log(`检测到部署环境: ${environment} (${selectedConfig.name})`);
    console.log(`将使用WebSocket连接URL: ${wsUrl}`);
    
    // 创建WebSocket连接
    wsConnection = new WebSocket(wsUrl);
    
    // 连接开启时
    wsConnection.onopen = () => {
      console.log('WebSocket连接已建立');
      updateWsStatus('connected');
      reconnectAttempts = 0;
      
      // 获取用户偏好语言并发送到Edge Function
      try {
        // 优先使用传入的语言参数，其次从localStorage获取，最后使用浏览器语言
        const storedLang = localStorage.getItem('preferredLanguage');
        const effectiveLanguage = preferredLanguage || storedLang || navigator.language.split('-')[0] || 'zh';
        
        console.log(`发送用户偏好语言到Edge Function: ${effectiveLanguage}`);
        
        // 发送用户语言偏好设置到Edge Function
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            action: 'set_user_language',
            language: effectiveLanguage,
            sessionId
          }));
        }
      } catch (langError) {
        console.error('发送用户语言偏好设置失败:', langError);
      }
      
      // 设置心跳以保持连接
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      heartbeatInterval = setInterval(() => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          // 发送心跳消息
          wsConnection.send(JSON.stringify({
            action: 'heartbeat',
            timestamp: new Date().toISOString(),
            sessionId
          }));
        }
      }, 30000) as unknown as number; // 30秒一次心跳
      
      // 连接成功后，请求翻译当前所有需要翻译的消息
      setTimeout(() => {
        fetchHostMessagesForTranslation(sessionId);
      }, 1000);
    };
    
    // 接收消息时
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('收到WebSocket消息:', data);
        
        // 处理翻译响应
        if (data.type === 'translation_complete' || data.type === 'translation_result') {
          // 处理翻译响应
          const messageId = data.messageId || data.message_id;
          const translation = data.translation || data.translated_text || data.translated_content;
          
          if (messageId && translation) {
            // 保存翻译结果到内存
            messageTranslations[`${messageId}`] = {
              translated_content: translation,
              translation_status: 'completed'
            };
            
            console.log(`消息 ${messageId} 翻译完成: ${translation.substring(0, 30)}...`);
            
            // 触发回调函数
            if (translationCallbacks[`${messageId}`]) {
              translationCallbacks[`${messageId}`].forEach(callback => {
                try {
                  callback(translation);
                } catch (callbackError) {
                  console.error('执行翻译回调时出错:', callbackError);
                }
              });
            }
          }
        } 
        // 处理翻译错误
        else if (data.type === 'translation_error' || data.type === 'error') {
          const messageId = data.messageId || data.message_id;
          const errorMsg = data.error || data.message || '未知错误';
          
          console.error(`翻译消息 ${messageId} 失败:`, errorMsg);
          
          if (messageId) {
            // 标记翻译失败
            messageTranslations[`${messageId}`] = {
              translated_content: undefined,
              translation_status: 'failed'
            };
          }
        }
      } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
      }
    };
    
    // 连接关闭时
    wsConnection.onclose = () => {
      console.log('WebSocket连接已关闭');
      updateWsStatus('disconnected');
      
      // 清除心跳
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // 尝试重连
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`尝试重新连接 (${reconnectAttempts}/${maxReconnectAttempts})...`);
        // 保持上次使用的userLanguage参数，传递到新的连接
        const storedLang = localStorage.getItem('preferredLanguage');
        const effectiveLanguage = preferredLanguage || (storedLang ? storedLang : undefined);
        setTimeout(() => initWebSocketConnection(sessionId, effectiveLanguage), reconnectInterval);
      } else {
        console.log('达到最大重连次数，不再尝试');
        updateWsStatus('failed');
      }
    };
    
    // 连接错误时
    wsConnection.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
    };
    
  } catch (error) {
    console.error('初始化WebSocket连接时出错:', error);
    updateWsStatus('failed');
  }
}

// 调用翻译功能
export async function translateMessage(
  messageId: number, 
  content: string, 
  sourceLanguage: string = 'auto',
  targetLanguage?: string
): Promise<boolean> {
  try {
    // 确保目标语言永远不会是undefined
    const finalTargetLanguage = targetLanguage || localStorage.getItem('preferredLanguage') || 'en';
    
    console.log(`尝试翻译消息 ${messageId} (源语言: ${sourceLanguage}, 目标语言: ${finalTargetLanguage})`);
    
    // 先标记为处理中
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'pending'
    };
    
    // 优先使用WebSocket连接进行翻译
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log(`通过WebSocket请求翻译消息 ${messageId}`);
      
      // 发送翻译请求到Edge Function
      wsConnection.send(JSON.stringify({
        action: 'translate',
        messageId,
        sourceText: content,
        sourceLanguage,
        targetLanguage: finalTargetLanguage,
        sessionId: currentSessionId
      }));
      
      return true;
    } 
    // 如果WebSocket不可用，使用简单的本地映射翻译（仅用于演示）
    else {
      console.log(`WebSocket不可用，使用本地模拟翻译 ${messageId}`);
      
      // 使用超级简单的翻译逻辑
      const translationKey = content.trim();
      let translatedContent = ''; 
      
      if (finalTargetLanguage === 'en' && translationMap['zh'][translationKey]) {
        translatedContent = translationMap['zh'][translationKey];
      } else if (finalTargetLanguage === 'zh' && translationMap['en'][translationKey]) {
        translatedContent = translationMap['en'][translationKey];
      } else {
        // 如果没有找到映射，简单地在原文后添加一个标记
        translatedContent = `${content} (${finalTargetLanguage === 'en' ? 'translated to English' : 'translated to Chinese'})`;
      }
      
      // 模拟网络延迟
      setTimeout(() => {
        // 保存翻译结果到内存
        messageTranslations[`${messageId}`] = {
          translated_content: translatedContent,
          translation_status: 'completed'
        };
        
        console.log(`消息 ${messageId} 本地翻译完成: ${translatedContent.substring(0, 30)}...`);
        
        // 触发回调函数
        if (translationCallbacks[`${messageId}`]) {
          translationCallbacks[`${messageId}`].forEach(callback => {
            try {
              callback(translatedContent);
            } catch (callbackError) {
              console.error('执行翻译回调时出错:', callbackError);
            }
          });
        }
      }, 500);
      
      return true;
    }
  } catch (error) {
    console.error('调用翻译函数出错:', error);
    
    // 标记为失败
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'failed'
    };
    
    return false;
  }
}