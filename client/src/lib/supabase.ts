import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// 环境变量中获取Supabase配置
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 追踪WebSocket连接状态
const wsConnectionStatus = {
  connected: false,
  connecting: false,
  error: null as string | null
};

// 用于存储消息翻译的内存缓存
const messageTranslations: Record<string, { translated_content: string; translation_status: string }> = {};

// 存储WebSocket状态监听器
const wsStatusListeners: ((status: typeof wsConnectionStatus) => void)[] = [];

// 全局Supabase客户端实例
export let supabase: ReturnType<typeof createClient> | null = null;

// 全局WebSocket连接
let translateWs: WebSocket | null = null;
let pingInterval: number | NodeJS.Timeout | null = null;

// 支持的语言列表
const supportedLanguages = ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt', 'it', 'zh-TW'];

// 常用短语翻译映射表（用于快速响应无需调用API）
const basicPhraseMap: Record<string, Record<string, string>> = {
  'en': {
    'Hello': 'Hello',
    'Thank you': 'Thank you',
    'Yes': 'Yes',
    'No': 'No',
    'Goodbye': 'Goodbye',
    '你好': 'Hello',
    '谢谢': 'Thank you',
    '是的': 'Yes',
    '不': 'No',
    '再见': 'Goodbye'
  },
  'zh-CN': {
    'Hello': '你好',
    'Thank you': '谢谢',
    'Yes': '是的',
    'No': '不',
    'Goodbye': '再见',
    '你好': '你好',
    '谢谢': '谢谢',
    '是的': '是的',
    '不': '不',
    '再见': '再见'
  }
};

// 检查是否为基本短语
function isBasicPhrase(text: string): boolean {
  // 先检查英文映射
  if (basicPhraseMap['en'][text]) return true;
  
  // 再检查中文映射
  if (basicPhraseMap['zh-CN'][text]) return true;
  
  return false;
}

// 获取基本短语的翻译
function getBasicPhraseTranslation(text: string, targetLang: string): string | null {
  // 检查目标语言是否支持
  if (!basicPhraseMap[targetLang]) return null;
  
  // 先查找英文短语
  if (basicPhraseMap['en'][text]) {
    return basicPhraseMap[targetLang][text] || null;
  }
  
  // 再查找中文短语
  if (basicPhraseMap['zh-CN'][text]) {
    return basicPhraseMap[targetLang][text] || null;
  }
  
  return null;
}

// 初始化Supabase客户端
export function initSupabase() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase URL or key missing, running in local mode');
      return null;
    }
    
    if (!supabase) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('Supabase client initialized successfully');
    }
    
    return supabase;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
}

// 获取WebSocket连接状态
export function getWsConnectionStatus(): typeof wsConnectionStatus {
  return { ...wsConnectionStatus };
}

// 添加WebSocket状态变更监听器
export function addWsStatusListener(callback: (status: typeof wsConnectionStatus) => void): () => void {
  wsStatusListeners.push(callback);
  
  // 立即通知当前状态
  callback({ ...wsConnectionStatus });
  
  // 返回取消订阅函数
  return () => {
    const index = wsStatusListeners.indexOf(callback);
    if (index !== -1) {
      wsStatusListeners.splice(index, 1);
    }
  };
}

// 更新WebSocket状态并通知所有监听器
function updateWsStatus(newStatus: Partial<typeof wsConnectionStatus>) {
  Object.assign(wsConnectionStatus, newStatus);
  
  // 通知所有监听器
  wsStatusListeners.forEach(listener => {
    listener({ ...wsConnectionStatus });
  });
}

// 从WebSocket中安全解析JSON
function safeParseJson(data: string) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('WebSocket: Error parsing message data:', error);
    return null;
  }
}

// 初始化WebSocket
export function initWebSocketConnection(sessionId: string, userLanguage?: string) {
  if (wsConnectionStatus.connected || wsConnectionStatus.connecting) {
    console.log('WebSocket: Already connected or connecting');
    return true;
  }

  try {
    // 在WebSocket服务器上提供的API路径
    let wsUrl = `${supabaseUrl.replace('https://', 'wss://')}/translate-service/v1/ws`;
    
    // 添加会话信息作为URL参数
    wsUrl += `?session_id=${encodeURIComponent(sessionId)}`;
    if (userLanguage) {
      wsUrl += `&lang=${encodeURIComponent(userLanguage)}`;
    }
    
    // 更新WebSocket状态为连接中
    updateWsStatus({ connecting: true, error: null });
    
    translateWs = new WebSocket(wsUrl);
    
    translateWs.onopen = () => {
      // 连接建立成功
      console.log('WebSocket: Connection established');
      updateWsStatus({ connected: true, connecting: false, error: null });
      
      // 设置保持连接的ping间隔
      if (pingInterval) {
        clearInterval(pingInterval as NodeJS.Timeout);
      }
      
      pingInterval = setInterval(() => {
        if (translateWs && translateWs.readyState === WebSocket.OPEN) {
          translateWs.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // 每30秒ping一次
    };
    
    translateWs.onmessage = (event) => {
      const data = safeParseJson(event.data);
      if (!data) return;
      
      if (data.type === 'pong') {
        // Ping-pong心跳响应
        console.log('WebSocket: Received pong');
        return;
      }
      
      if (data.type === 'translation_result') {
        // 接收到翻译结果
        const { message_id, translated_content, status } = data;
        if (message_id) {
          messageTranslations[message_id] = {
            translated_content: translated_content || '',
            translation_status: status || 'completed'
          };
          
          console.log(`WebSocket: Received translation for message ${message_id}`);
        }
      }
    };
    
    translateWs.onerror = (error) => {
      console.error('WebSocket: Connection error:', error);
      updateWsStatus({ 
        error: 'Failed to connect to translation service. Please try again later.' 
      });
    };
    
    translateWs.onclose = (event) => {
      console.log(`WebSocket: Connection closed with code ${event.code}`);
      
      // 清除ping间隔
      if (pingInterval) {
        clearInterval(pingInterval as NodeJS.Timeout);
        pingInterval = null;
      }
      
      updateWsStatus({ 
        connected: false, 
        connecting: false,
        error: event.code === 1000 ? null : 'Connection to translation service was closed unexpectedly'
      });
      
      // 如果不是正常关闭，尝试在短暂延迟后重新连接
      if (event.code !== 1000) {
        setTimeout(() => {
          console.log('WebSocket: Attempting to reconnect...');
          initWebSocketConnection(sessionId, userLanguage);
        }, 5000);
      }
      
      translateWs = null;
    };
    
    return true;
  } catch (error) {
    console.error('WebSocket: Error initializing connection:', error);
    updateWsStatus({ 
      connected: false, 
      connecting: false,
      error: 'Failed to initialize translation service connection'
    });
    return false;
  }
}

// 安全关闭WebSocket连接
export function closeWebSocketConnection() {
  if (translateWs) {
    try {
      translateWs.close(1000, 'Normal closure');
      console.log('WebSocket: Connection closed normally');
    } catch (error) {
      console.error('WebSocket: Error closing connection:', error);
    }
  }
  
  // 清除ping间隔
  if (pingInterval) {
    clearInterval(pingInterval as NodeJS.Timeout);
    pingInterval = null;
  }
  
  translateWs = null;
  updateWsStatus({ connected: false, connecting: false, error: null });
}

// 安全请求翻译
export async function translateMessage(
  messageId: number, 
  content: string, 
  sourceLanguage: string = 'auto',
  targetLanguage?: string
): Promise<boolean> {
  console.debug(`Translation request for message ${messageId}: ${content.substring(0, 30)}...`);
  
  // 检查内容是否为空
  if (!content || content.trim() === '') {
    console.warn(`Translation skipped for message ${messageId}: Empty content`);
    return false;
  }
  
  // 检查目标语言是否支持
  if (targetLanguage && !supportedLanguages.includes(targetLanguage)) {
    console.warn(`Translation skipped for message ${messageId}: Unsupported target language ${targetLanguage}`);
    return false;
  }
  
  // 如果是基本短语，使用映射表快速翻译
  if (targetLanguage && isBasicPhrase(content)) {
    const quickTranslation = getBasicPhraseTranslation(content, targetLanguage);
    if (quickTranslation) {
      console.log(`Quick translation for message ${messageId} using phrase map`);
      messageTranslations[messageId] = {
        translated_content: quickTranslation,
        translation_status: 'completed'
      };
      return true;
    }
  }
  
  // 首先检查WebSocket连接
  if (!translateWs || translateWs.readyState !== WebSocket.OPEN) {
    console.warn(`Translation failed for message ${messageId}: WebSocket not connected`);
    return false;
  }
  
  try {
    // 发送翻译请求
    const request = {
      type: 'translate',
      message_id: messageId,
      content,
      source_language: sourceLanguage,
      target_language: targetLanguage || 'auto'
    };
    
    translateWs.send(JSON.stringify(request));
    console.log(`Translation request sent for message ${messageId}`);
    return true;
  } catch (error) {
    console.error(`Translation failed for message ${messageId}:`, error);
    return false;
  }
}

// 获取翻译结果
export function getTranslation(messageId: number | string): { 
  translated_content: string | null; 
  translation_status: string;
} {
  const result = messageTranslations[messageId];
  
  if (!result) {
    return {
      translated_content: null,
      translation_status: 'pending'
    };
  }
  
  return result;
}

// 获取主机信息
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  if (!supabase) {
    console.log('Using mock host info for:', userId);
    
    return {
      id: userId,
      name: "商家",
      business_type: "服务",
      business_intro: "欢迎光临",
      avatar_url: "https://ui-avatars.com/api/?name=商家&background=random&size=128",
    };
  }
  
  try {
    console.log('Fetching host info for:', userId);
    
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('Host not found');
    }
    
    return {
      id: data.id,
      name: data.name || "商家",
      business_type: data.business_type || "服务",
      business_intro: data.business_intro || "欢迎光临",
      avatar_url: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "商家")}&background=random&size=128`,
    };
  } catch (error) {
    console.error('Error fetching host info:', error);
    
    // 使用directDb作为备用
    try {
      const { getHostInfoDirectSql } = await import('./directDb');
      return await getHostInfoDirectSql(userId);
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      
      // 返回基本信息
      return {
        id: userId,
        name: "商家",
        business_type: "服务",
        business_intro: "欢迎光临",
        avatar_url: "https://ui-avatars.com/api/?name=商家&background=random&size=128",
      };
    }
  }
}

// 获取聊天消息
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  if (!supabase) {
    console.log('Using mock messages for session:', sessionId);
    return [];
  }
  
  try {
    console.log('Fetching messages for session:', sessionId);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('id', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return (data || []).map((msg: any) => {
      const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
      
      // 检查是否有存储在内存中的翻译
      const storedTranslation = messageTranslations[msg.id];
      
      return {
        id: msg.id,
        content: msg.content,
        sender: senderType,
        timestamp: new Date(msg.timestamp),
        original_language: msg.original_language || 'auto',
        translated_content: storedTranslation?.translated_content || msg.translated_content,
        translation_status: storedTranslation?.translation_status || msg.translation_status || 'pending'
      };
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    // 使用directDb作为备用
    try {
      const { getMessagesDirectSql } = await import('./directDb');
      return await getMessagesDirectSql(sessionId);
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      return [];
    }
  }
}

// 发送消息
export async function sendMessage(
  sessionId: string, 
  content: string, 
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  if (!supabase) {
    console.log('Using mock message sending for session:', sessionId);
    
    // 模拟消息ID
    const messageId = Date.now();
    const senderType = isHost ? ('host' as const) : ('guest' as const);
    
    return {
      id: messageId,
      content,
      sender: senderType,
      timestamp: new Date(),
      original_language: language || 'auto',
      translated_content: null,
      translation_status: 'pending'
    };
  }
  
  try {
    console.log('Sending message to session:', sessionId);
    
    // 使用Supabase客户端API发送消息
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_session_id: sessionId,
        content,
        is_host: isHost,
        original_language: language || 'auto'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('Failed to send message');
    }
    
    const senderType = isHost ? ('host' as const) : ('guest' as const);
    
    return {
      id: data.id,
      content: data.content,
      sender: senderType,
      timestamp: new Date(data.timestamp),
      original_language: data.original_language || language || 'auto',
      translated_content: null,
      translation_status: 'pending'
    };
  } catch (error) {
    console.error('Error sending message:', error);
    
    // 使用directDb作为备用
    try {
      const { sendMessageDirectSql } = await import('./directDb');
      return await sendMessageDirectSql(sessionId, content, isHost, language);
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      return null;
    }
  }
}

// 获取或创建聊天会话
export async function getOrCreateChatSession(merchantId: string): Promise<string> {
  if (!supabase) {
    console.log('Using mock session for merchant:', merchantId);
    return uuidv4();
  }
  
  try {
    console.log('Getting or creating session for merchant:', merchantId);
    
    // 尝试查找现有会话
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('host_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      return data.id;
    }
    
    // 创建新会话
    const sessionId = uuidv4();
    const { error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId,
        host_id: merchantId,
        status: 'active'
      });
    
    if (insertError) {
      throw insertError;
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error getting or creating session:', error);
    
    // 使用directDb作为备用
    try {
      const { createSessionDirectSql } = await import('./directDb');
      return await createSessionDirectSql(merchantId);
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      return uuidv4();
    }
  }
}

// 订阅消息更新
export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  if (!supabase) {
    console.log('Mock subscription for session:', sessionId);
    return () => {}; // 返回空的取消订阅函数
  }
  
  try {
    console.log('Setting up real-time subscription for session:', sessionId);
    
    // 使用Supabase实时订阅
    const subscription = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_session_id=eq.${sessionId}`
        },
        (payload) => {
          if (!payload.new) return;
          
          const msg = payload.new;
          const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
          
          // 创建消息对象
          const message: ChatMessage = {
            id: msg.id,
            content: msg.content,
            sender: senderType,
            timestamp: new Date(msg.timestamp),
            original_language: msg.original_language || 'auto',
            translated_content: msg.translated_content,
            translation_status: msg.translation_status || 'pending'
          };
          
          // 调用回调
          callback(message);
        }
      )
      .subscribe();
    
    // 返回取消订阅函数
    return () => {
      console.log('Unsubscribing from messages');
      supabase?.channel(`messages:${sessionId}`).unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up subscription:', error);
    return () => {}; // 返回空的取消订阅函数
  }
}

// 订阅消息翻译更新
export function subscribeToTranslations(
  sessionId: string,
  callback: (messageId: number, translation: string, status: string) => void
) {
  if (!supabase) {
    console.log('Mock translation subscription for session:', sessionId);
    return () => {}; // 返回空的取消订阅函数
  }
  
  try {
    console.log('Setting up real-time subscription for translations:', sessionId);
    
    // 使用Supabase实时订阅
    const subscription = supabase
      .channel(`translations:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_session_id=eq.${sessionId}`
        },
        (payload) => {
          if (!payload.new?.id || !payload.new?.translated_content) return;
          
          // 只有翻译内容变化时才调用回调
          if (payload.old?.translated_content !== payload.new.translated_content) {
            // 调用回调
            callback(
              payload.new.id,
              payload.new.translated_content,
              payload.new.translation_status || 'completed'
            );
            
            // 更新内存缓存
            messageTranslations[payload.new.id] = {
              translated_content: payload.new.translated_content,
              translation_status: payload.new.translation_status || 'completed'
            };
          }
        }
      )
      .subscribe();
    
    // 返回取消订阅函数
    return () => {
      console.log('Unsubscribing from translations');
      supabase?.channel(`translations:${sessionId}`).unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up translation subscription:', error);
    return () => {}; // 返回空的取消订阅函数
  }
}

// 初始化Supabase客户端
initSupabase();