import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { getWebSocketURL } from './getEnvironment';

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
let wsConnection: WebSocket | null = null;
let heartbeatInterval: number | NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let currentSessionId: string | null = null;

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
function updateWsStatus(status: 'connected' | 'connecting' | 'disconnected', error: string | null = null) {
  const newStatus = {
    connected: status === 'connected',
    connecting: status === 'connecting',
    error
  };
  
  Object.assign(wsConnectionStatus, newStatus);
  
  // 通知所有监听器
  wsStatusListeners.forEach(listener => {
    listener({ ...wsConnectionStatus });
  });
}

// 初始化WebSocket连接
export function initWebSocketConnection(sessionId: string, userLanguage?: string) {
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
    // 获取WebSocket URL - 使用本地服务器的WebSocket端点
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/translate`;
    
    console.log(`尝试连接到WebSocket URL: ${wsUrl}`);
    
    // 创建WebSocket连接
    wsConnection = new WebSocket(wsUrl);
    
    // 连接成功事件
    wsConnection.onopen = () => {
      console.log('WebSocket连接已建立');
      updateWsStatus('connected');
      reconnectAttempts = 0;
      
      // 开始心跳检测
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      heartbeatInterval = setInterval(() => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        }
      }, 30000); // 每30秒发送一次心跳
      
      // 发送初始化消息
      if (wsConnection) {
        wsConnection.send(JSON.stringify({
          type: 'init',
          session_id: sessionId,
          user_language: userLanguage || 'zh'
        }));
      }
    };
    
    // 连接关闭事件
    wsConnection.onclose = () => {
      console.log('WebSocket连接已关闭');
      updateWsStatus('disconnected');
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // 尝试重新连接，最多尝试5次
      if (reconnectAttempts < 5) {
        reconnectAttempts++;
        const delay = Math.min(1000 * reconnectAttempts, 5000);
        
        console.log(`将在${delay}毫秒后尝试重新连接(尝试 ${reconnectAttempts}/5)`);
        
        setTimeout(() => {
          if (currentSessionId) {
            initWebSocketConnection(currentSessionId, userLanguage);
          }
        }, delay);
      } else {
        console.log('达到最大重试次数，停止尝试重新连接');
        updateWsStatus('disconnected', '无法建立WebSocket连接，请稍后再试');
      }
    };
    
    // 连接错误事件
    wsConnection.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      updateWsStatus('disconnected', '连接出错，请刷新页面重试');
    };
    
    // 接收消息事件
    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('收到WebSocket消息:', message);
        
        // 处理不同类型的消息
        switch (message.type) {
          case 'pong':
            // 心跳响应，无需特殊处理
            break;
            
          case 'translation_complete':
            // 处理翻译完成消息
            if (message.messageId) {
              messageTranslations[message.messageId] = {
                translated_content: message.translation,
                translation_status: 'completed'
              };
            }
            break;
            
          case 'error':
            console.error('WebSocket服务器错误:', message.error);
            break;
            
          default:
            // 处理其他类型的消息
            break;
        }
      } catch (error) {
        console.error('解析WebSocket消息时出错:', error);
      }
    };
    
    return true;
  } catch (error) {
    console.error('创建WebSocket连接失败:', error);
    updateWsStatus('disconnected', '创建连接失败');
    return false;
  }
}

// 安全请求翻译
export async function translateMessage(
  messageId: number, 
  content: string, 
  sourceLanguage: string = 'auto',
  targetLanguage?: string
): Promise<boolean> {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    console.warn('尝试发送翻译请求但WebSocket未连接');
    
    // 尝试重新连接
    if (currentSessionId) {
      initWebSocketConnection(currentSessionId);
    }
    
    // 返回假以指示请求未发送
    return false;
  }
  
  try {
    // 发送翻译请求
    wsConnection.send(JSON.stringify({
      type: 'translate',
      message_id: messageId,
      content,
      source_language: sourceLanguage,
      target_language: targetLanguage || 'zh'
    }));
    
    return true;
  } catch (error) {
    console.error('发送翻译请求失败:', error);
    return false;
  }
}

// 获取主机信息
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  console.log('获取主机信息:', userId);
  
  if (!supabase) {
    return {
      id: userId,
      name: "商家",
      business_type: "服务",
      business_intro: "欢迎光临",
      avatar_url: "https://ui-avatars.com/api/?name=商家&background=random&size=128",
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      business_type: data.business_type || '',
      business_intro: data.business_intro || '',
      avatar_url: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&size=128`,
    };
  } catch (error) {
    console.error('获取主机信息出错:', error);
    return null;
  }
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
  console.log('订阅消息更新:', sessionId);
  
  if (!supabase) {
    console.warn('Supabase客户端未初始化，无法订阅实时更新');
    return () => {};
  }
  
  // 订阅消息表的插入事件
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
        console.log('收到实时消息更新:', payload);
        
        const message = payload.new;
        if (message) {
          const senderType = message.is_host ? ('host' as const) : ('guest' as const);
          
          callback({
            id: message.id,
            content: message.content,
            sender: senderType,
            timestamp: new Date(message.timestamp),
            original_language: message.original_language || 'auto',
            translated_content: message.translated_content,
            translation_status: message.translation_status || 'pending'
          });
        }
      }
    )
    .subscribe();
  
  // 返回取消订阅函数
  return () => {
    console.log('取消订阅消息更新');
    supabase?.removeChannel(subscription);
  };
}

// 初始化Supabase客户端
initSupabase();