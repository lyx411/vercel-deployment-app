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
function updateWsStatus(newStatus: typeof wsConnectionStatus) {
  Object.assign(wsConnectionStatus, newStatus);
  
  // 通知所有监听器
  wsStatusListeners.forEach(listener => {
    listener({ ...wsConnectionStatus });
  });
}

// 初始化WebSocket
export function initWebSocketConnection(sessionId: string, userLanguage?: string) {
  // 使用模拟WebSocket提供基本功能
  console.log('初始化模拟WebSocket连接');
  
  setTimeout(() => {
    updateWsStatus({ connected: true, connecting: false, error: null });
    console.log('模拟WebSocket连接已建立');
  }, 1000);
  
  return true;
}

// 安全请求翻译
export async function translateMessage(
  messageId: number, 
  content: string, 
  sourceLanguage: string = 'auto',
  targetLanguage?: string
): Promise<boolean> {
  console.log('模拟翻译请求:', { messageId, content, sourceLanguage, targetLanguage });
  
  // 存储一个模拟的翻译结果
  setTimeout(() => {
    const translatedContent = `[翻译] ${content}`;
    messageTranslations[`${messageId}`] = {
      translated_content: translatedContent,
      translation_status: 'completed'
    };
    
    console.log('模拟翻译完成:', translatedContent);
  }, 1000);
  
  return true;
}

// 获取主机信息
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  console.log('获取主机信息:', userId);
  
  return {
    id: userId,
    name: "商家",
    business_type: "服务",
    business_intro: "欢迎光临",
    avatar_url: "https://ui-avatars.com/api/?name=商家&background=random&size=128",
  };
}

// 获取聊天消息
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  console.log('获取聊天消息:', sessionId);
  
  if (!supabase) {
    return [];
  }
  
  try {
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
      
      return {
        id: msg.id,
        content: msg.content,
        sender: senderType,
        timestamp: new Date(msg.timestamp),
        original_language: msg.original_language || 'auto',
        translated_content: msg.translated_content,
        translation_status: msg.translation_status || 'pending'
      };
    });
  } catch (error) {
    console.error('获取消息出错:', error);
    return [];
  }
}

// 发送消息
export async function sendMessage(
  sessionId: string, 
  content: string, 
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  console.log('发送消息:', { sessionId, content, isHost });
  
  if (!supabase) {
    // 返回模拟消息
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
      throw new Error('发送消息失败');
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
    console.error('发送消息出错:', error);
    
    // 使用directDb作为备用
    try {
      const { sendMessageDirectSql } = await import('./directDb');
      return await sendMessageDirectSql(sessionId, content, isHost, language);
    } catch (fallbackError) {
      console.error('备用方法也失败:', fallbackError);
      return null;
    }
  }
}

// 获取或创建聊天会话
export async function getOrCreateChatSession(merchantId: string): Promise<string> {
  console.log('获取或创建聊天会话:', merchantId);
  
  if (!supabase) {
    return uuidv4();
  }
  
  try {
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
    console.error('获取或创建会话出错:', error);
    
    // 使用directDb作为备用
    try {
      const { createSessionDirectSql } = await import('./directDb');
      return await createSessionDirectSql(merchantId);
    } catch (fallbackError) {
      console.error('备用方法也失败:', fallbackError);
      return uuidv4();
    }
  }
}

// 订阅消息更新
export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  console.log('订阅消息更新 (模拟):', sessionId);
  
  // 无实际订阅功能，仅返回取消订阅函数
  return () => {
    console.log('取消订阅消息更新');
  };
}

// 初始化Supabase客户端
initSupabase();