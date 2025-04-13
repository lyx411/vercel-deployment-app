import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, HostInfo } from '@shared/schema';

// Check if Supabase is properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bazwlkkiodtuhepunqwz.supabase.co';
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

// Initialize Supabase client if configured
export const supabase = (isSupabaseConfigured && !forceLocalMode)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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

// 这段代码保留原始的函数导入和导出，确保directDb.ts可以正常工作
// WebSocket连接相关代码保留原始实现
let wsConnectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';
let wsConnection: WebSocket | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000; // 重连间隔(毫秒)
let heartbeatInterval: number | null = null;
let currentSessionId: string = ''; // 当前会话ID，在初始化WebSocket时设置
let userLanguagePreference: string | null = null;
const wsStatusListeners: Array<(status: typeof wsConnectionStatus) => void> = [];
const pendingTranslations: Record<string, any> = {};

// 获取WebSocket连接状态的函数
export function getWsConnectionStatus(): typeof wsConnectionStatus {
  return wsConnectionStatus;
}

// 监听WebSocket状态变化的函数
export function addWsStatusListener(callback: (status: typeof wsConnectionStatus) => void): () => void {
  wsStatusListeners.push(callback);
  
  // 立即通知当前状态
  callback(wsConnectionStatus);
  
  // 返回移除监听器的函数
  return () => {
    const index = wsStatusListeners.indexOf(callback);
    if (index !== -1) {
      wsStatusListeners.splice(index, 1);
    }
  };
}

// 发送心跳包以保持WebSocket连接
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = window.setInterval(() => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        wsConnection.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('发送心跳包失败:', error);
      }
    }
  }, 30000);
}

// 发送翻译请求到WebSocket服务器
function sendTranslationRequest(request: any) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    try {
      wsConnection.send(JSON.stringify(request));
      console.log('已发送翻译请求到WebSocket服务器');
    } catch (error) {
      console.error('发送翻译请求失败:', error);
    }
  } else {
    console.warn('WebSocket未连接，无法发送翻译请求');
    // 保存待处理请求
    pendingTranslations[request.messageId] = request;
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

  // 设置连接状态
  wsConnectionStatus = 'connected';
  
  // 通知所有监听器
  wsStatusListeners.forEach(listener => listener('connected'));
  
  // 启动心跳
  startHeartbeat();
  
  return true;
}

// 发送语言偏好
function sendLanguagePreference(language: string) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    try {
      wsConnection.send(JSON.stringify({
        type: 'set_language_preference',
        language
      }));
    } catch (error) {
      console.error('发送语言偏好失败:', error);
    }
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
    const finalTargetLanguage = targetLanguage || 'en';
    
    console.log(`尝试翻译消息 ${messageId}`);
    console.log(`源语言: ${sourceLanguage}, 目标语言: ${finalTargetLanguage}`);
    
    // 先标记为处理中
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'pending'
    };
    
    // 模拟翻译处理
    setTimeout(() => {
      // 简单翻译逻辑，实际项目中替换为你的翻译服务
      const translatedContent = `${content} (翻译后的内容)`;
      
      // 保存翻译结果
      messageTranslations[`${messageId}`] = {
        translated_content: translatedContent,
        translation_status: 'completed'
      };
      
      // 触发回调
      if (translationCallbacks[`${messageId}`]) {
        translationCallbacks[`${messageId}`].forEach(callback => {
          callback(translatedContent);
        });
      }
      
      console.log(`模拟翻译完成: ${translatedContent}`);
    }, 1000);
    
    return true;
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
    
    try {
      // 从数据库获取消息
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_session_id, content, is_host, timestamp, original_language, translated_content')
        .eq('chat_session_id', sessionId)
        .order('id', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      return (data || []).map(msg => {
        // 使用类型断言确保sender的类型
        const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
        // 获取消息ID
        const msgId = msg.id;
        
        // 从内存缓存中获取翻译信息（如果存在）
        const cachedTranslation = messageTranslations[`${msgId}`];
        
        return {
          id: msgId,
          content: msg.content,
          sender: senderType,
          timestamp: new Date(msg.timestamp),
          original_language: msg.original_language || 'auto',
          translated_content: cachedTranslation?.translated_content || msg.translated_content,
          translation_status: cachedTranslation?.translation_status || 'pending'
        };
      });
    } catch (error) {
      console.error('Error in getChatMessages:', error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Send a new message
export async function sendMessage(
  sessionId: string, 
  content: string, 
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  try {
    console.log(`Sending ${isHost ? 'host' : 'guest'} message to session:`, sessionId);
    console.log('Supabase client initialized:', !!supabase);
    
    // If Supabase is not configured, generate a local message
    if (!supabase) {
      console.log('Using local mode for sending message (supabase client is null)');
      const timestamp = new Date();
      const senderType = isHost ? ('host' as const) : ('guest' as const);
      return {
        id: Date.now(),
        content,
        sender: senderType,
        timestamp,
        original_language: language || 'auto',
        translated_content: undefined,
        translation_status: 'pending'
      };
    }
    
    // 创建消息对象
    const message = {
      chat_session_id: sessionId,
      content: content,
      is_host: isHost,
      sender_id: isHost ? '00000000-0000-4000-a000-000000000000' : '00000000-0000-4000-a000-000000000001',
      sender_name: isHost ? 'Host' : 'Guest',
      timestamp: new Date().toISOString(),
      original_language: language || 'auto'
    };
    
    // 发送消息到数据库
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();
    
    if (error) {
      console.error('Error sending message:', error);
      return null;
    }
    
    // 确定sender类型
    const senderType = isHost ? ('host' as const) : ('guest' as const);
    
    // 创建返回的消息对象
    const newMessage: ChatMessage = {
      id: data.id,
      content: data.content,
      sender: senderType,
      timestamp: new Date(data.timestamp),
      original_language: data.original_language || language || 'auto',
      translated_content: data.translated_content,
      translation_status: data.translation_status || 'pending'
    };
    
    // 只对主机消息发送后立即触发翻译
    if (isHost) {
      console.log(`为主机消息 ${newMessage.id} 触发翻译，使用语言: ${language || 'en'}`);
      translateMessage(newMessage.id, newMessage.content, 'auto', language)
        .catch((error: Error) => console.error('Failed to trigger translation:', error));
    }
    
    return newMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

// Get or create a chat session
export async function getOrCreateChatSession(merchantId: string): Promise<string> {
  try {
    console.log('Getting or creating chat session for merchant:', merchantId);
    
    // If Supabase is not configured, return a local session ID
    if (!supabase) {
      console.log('Using local mode for session (supabase client is null)');
      return uuidv4();
    }
    
    // 生成一个新的会话ID
    const sessionId = uuidv4();
    
    try {
      // 创建聊天会话记录
      const chatSession = {
        id: sessionId,
        host_id: merchantId,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      };
      
      // 保存host_id以供后续使用
      sessionHostIds[sessionId] = merchantId;
      
      // 创建会话记录
      await supabase
        .from('chat_sessions')
        .insert([chatSession]);
      
      console.log('Chat session created successfully:', sessionId);
      
      // 创建欢迎消息
      const welcomeMessage = {
        chat_session_id: sessionId,
        content: "Hello! Welcome to the chat. How can I help you today?",
        sender_id: merchantId,
        sender_name: 'Host',
        is_host: true,
        timestamp: new Date().toISOString()
      };
      
      // 插入欢迎消息
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([welcomeMessage])
        .select()
        .single();
      
      if (messageError) {
        console.error('Error creating welcome message:', messageError);
      } else if (messageData) {
        // 自动触发翻译欢迎消息
        console.log('Welcome message created successfully:', messageData.id);
        translateMessage(messageData.id, welcomeMessage.content, 'auto', 'zh')
          .catch(error => console.error('Failed to translate welcome message:', error));
      }
    } catch (error) {
      console.error('Error establishing session:', error);
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error managing chat session:', error);
    return uuidv4(); // 返回回退会话ID
  }
}

// Subscribe to new messages
export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  if (!supabase) {
    console.log('Using local mode for message subscription (supabase client is null)');
    return {
      unsubscribe: () => {},
    };
  }
  
  // 使用Supabase实时订阅功能
  const subscription = supabase
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
        console.log('New message received from realtime subscription');
        const message = payload.new as any;
        
        // 确定sender类型
        const senderType = message.is_host ? ('host' as const) : ('guest' as const);
        
        // 创建消息对象
        const chatMessage: ChatMessage = {
          id: message.id,
          content: message.content,
          sender: senderType,
          timestamp: new Date(message.timestamp),
          original_language: message.original_language || 'auto',
          translated_content: message.translated_content,
          translation_status: message.translation_status || 'pending'
        };
        
        // 触发回调
        callback(chatMessage);
      }
    )
    .subscribe();
  
  // 返回取消订阅的函数
  return {
    unsubscribe: () => {
      subscription.unsubscribe();
    },
  };
}

// Fetch host information
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  try {
    console.log('Fetching host info for userId:', userId);
    
    // If Supabase is not configured, use demo host info
    if (!supabase) {
      console.log('Using local mode for host info (supabase client is null)');
      return {
        id: userId,
        name: "Host",
        title: "Online Chat",
        url: "example.com",
        avatarUrl: ""
      };
    }
    
    // 在实际实现中，可以从数据库获取主机信息
    // 这里使用静态数据
    return {
      id: userId,
      name: "Host",
      title: "Online Chat",
      url: "example.com",
      avatarUrl: ""
    };
  } catch (error) {
    console.error('Error fetching host info:', error);
    return null;
  }
}