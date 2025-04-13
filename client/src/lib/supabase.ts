import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChatMessage, HostInfo, TranslationResponse, WebSocketMessage } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { detectEnvironment } from './getEnvironment';

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 存储Supabase客户端实例
let supabaseClient: SupabaseClient | null = null;

// 初始化Supabase客户端
export const initSupabase = () => {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase client initialized');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  } else if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or key is missing');
  }
  return supabaseClient;
};

// 获取当前Supabase客户端实例
export const getSupabaseClient = () => {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
};

// 存储WebSocket连接
let ws: WebSocket | null = null;
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let wsConnectionStatus: 'connected' | 'connecting' | 'disconnected' | 'failed' = 'disconnected';
let reconnectAttempts = 0;
let sessionIdForWs: string | null = null;
let userLanguage: string | null = null;
const MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket状态监听器
type StatusListener = (status: 'connected' | 'connecting' | 'disconnected' | 'failed') => void;
const statusListeners: StatusListener[] = [];

// 添加WebSocket状态监听器
export const addWsStatusListener = (listener: StatusListener) => {
  statusListeners.push(listener);
  // 立即触发一次当前状态
  listener(wsConnectionStatus);
  
  // 返回删除监听器的函数
  return () => {
    const index = statusListeners.indexOf(listener);
    if (index !== -1) {
      statusListeners.splice(index, 1);
    }
  };
};

// 更新WebSocket连接状态
const updateWsStatus = (status: 'connected' | 'connecting' | 'disconnected' | 'failed') => {
  wsConnectionStatus = status;
  // 通知所有监听器
  statusListeners.forEach(listener => listener(status));
};

// 获取WebSocket连接状态
export const getWsConnectionStatus = () => wsConnectionStatus;

// 关闭WebSocket连接
export const closeWebSocketConnection = () => {
  if (ws) {
    console.log('手动关闭WebSocket连接');
    ws.onclose = null; // 防止触发自动重连
    ws.close();
    ws = null;
  }
  
  // 清除任何重连计时器
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }
  
  updateWsStatus('disconnected');
  sessionIdForWs = null;
};

// 初始化WebSocket连接
export const initWebSocketConnection = (sessionId: string, language = 'auto') => {
  // 如果已经有一个连接且会话ID不同，先关闭它
  if (sessionIdForWs && sessionIdForWs !== sessionId && ws) {
    closeWebSocketConnection();
  }
  
  // 保存会话ID和语言设置
  sessionIdForWs = sessionId;
  userLanguage = language;
  
  // 如果已经连接且会话ID相同，不需要重新连接
  if (ws && ws.readyState === WebSocket.OPEN && sessionIdForWs === sessionId) {
    console.log('WebSocket已连接，不需要重新连接');
    return;
  }
  
  // 如果正在连接中，不要重复连接
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    console.log('WebSocket正在连接中，不要重复连接');
    return;
  }
  
  // 重置重连尝试次数
  reconnectAttempts = 0;
  
  // 连接WebSocket
  connectWebSocket(sessionId, language);
};

// 连接WebSocket函数
const connectWebSocket = (sessionId: string, language: string) => {
  // 检测当前环境以选择合适的WebSocket URL
  const environment = detectEnvironment();
  let wsUrl = '';
  
  // 根据环境选择WebSocket URL
  switch (environment) {
    case 'development-local':
      wsUrl = 'ws://localhost:8787';
      break;
    case 'development-cloudflare':
    case 'production-cloudflare':
      // 使用Cloudflare Workers的WebSocket URL
      wsUrl = 'wss://translation-worker.your-username.workers.dev';
      break;
    case 'production-vercel':
      // 使用Vercel Edge Function的WebSocket URL
      wsUrl = 'wss://vercel-deployment-app.vercel.app/api/translate';
      break;
    case 'replit':
      // 使用Replit的WebSocket URL
      wsUrl = 'wss://vercel-deployment-app.your-username.repl.co';
      break;
    default:
      // 默认使用Vercel Edge Function URL
      wsUrl = 'wss://vercel-deployment-app.vercel.app/api/translate';
  }
  
  console.log(`检测到的环境: ${environment}, 使用WebSocket URL: ${wsUrl}`);
  console.log('正在连接WebSocket服务器...');
  updateWsStatus('connecting');
  
  try {
    // 创建WebSocket连接
    ws = new WebSocket(wsUrl);

    // 打开连接时
    ws.addEventListener('open', () => {
      console.log('WebSocket连接已建立');
      
      // 发送连接请求，包含会话ID和用户语言偏好
      if (ws && sessionId) {
        const connectMessage: WebSocketMessage = {
          action: 'connect',
          session_id: sessionId,
          user_language: language
        };
        ws.send(JSON.stringify(connectMessage));
        console.log('发送连接请求，包含会话ID:', sessionId, '和用户语言:', language);
      }
    });

    // 收到消息时
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
      }
    });

    // 连接关闭时
    ws.addEventListener('close', (event) => {
      console.log(`WebSocket连接已关闭: ${event.code} ${event.reason}`);
      handleWebSocketClosure();
    });

    // 连接错误时
    ws.addEventListener('error', (error) => {
      console.error('WebSocket连接错误:', error);
      handleWebSocketError();
    });

    // 设置心跳机制保持连接
    const heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ action: 'heartbeat' }));
        } catch (error) {
          console.error('发送心跳消息失败:', error);
          clearInterval(heartbeatInterval);
        }
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 每30秒发送一次心跳

    // 清理函数
    return () => {
      clearInterval(heartbeatInterval);
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  } catch (error) {
    console.error('创建WebSocket连接时出错:', error);
    handleWebSocketError();
    return () => {};
  }
};

// 处理WebSocket消息
const handleWebSocketMessage = (data: WebSocketMessage) => {
  console.log('收到WebSocket消息:', data.action);
  
  // 根据消息类型处理
  switch (data.action) {
    case 'connect_result':
    case 'status':
      if (data.status === 'connected') {
        console.log('WebSocket连接成功，会话ID:', data.session_id);
        updateWsStatus('connected');
        reconnectAttempts = 0; // 连接成功，重置重连计数
      } else {
        console.error('WebSocket连接失败:', data.message);
        updateWsStatus('failed');
      }
      break;
      
    case 'translate_result':
      const translationResult = data as TranslationResponse;
      console.log('收到翻译结果:', translationResult);
      
      if (translationResult.status === 'success' && translationResult.message_id) {
        // 保存翻译结果到内存
        translation_results[translationResult.message_id] = translationResult.translated_text;
        translation_status[translationResult.message_id] = 'completed';
        
        // 触发回调通知UI
        if (translation_callbacks[translationResult.message_id]) {
          console.log(`触发消息 ${translationResult.message_id} 的翻译回调`);
          translation_callbacks[translationResult.message_id](translationResult.translated_text);
        } else {
          console.log(`没有找到消息 ${translationResult.message_id} 的回调`);
        }
        
        // 保存翻译结果到数据库
        saveTranslationToDatabase(translationResult);
      } else if (translationResult.status === 'error') {
        console.error('翻译错误:', translationResult.error);
        if (translationResult.message_id) {
          translation_status[translationResult.message_id] = 'error';
        }
      }
      break;
      
    case 'heartbeat':
      // 心跳响应，不需要特殊处理
      break;
      
    default:
      console.log('未处理的WebSocket消息类型:', data);
      break;
  }
};

// 处理WebSocket关闭
const handleWebSocketClosure = () => {
  updateWsStatus('disconnected');
  
  // 如果会话ID还存在，尝试重新连接
  if (sessionIdForWs) {
    tryReconnect();
  }
};

// 处理WebSocket错误
const handleWebSocketError = () => {
  updateWsStatus('failed');
  
  // 如果会话ID还存在，尝试重新连接
  if (sessionIdForWs) {
    tryReconnect();
  }
};

// 尝试重新连接
const tryReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`已达到最大重连尝试次数 (${MAX_RECONNECT_ATTEMPTS})，停止重连`);
    updateWsStatus('failed');
    return;
  }
  
  reconnectAttempts++;
  
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // 指数退避，最大30秒
  console.log(`计划在 ${delay}ms 后尝试重新连接 (尝试 ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
  }
  
  wsReconnectTimeout = setTimeout(() => {
    console.log(`正在尝试重新连接 (尝试 ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    if (sessionIdForWs && userLanguage) {
      connectWebSocket(sessionIdForWs, userLanguage);
    }
  }, delay);
};

// 本地翻译实现，当WebSocket失败时使用
const localTranslate = async (text: string, targetLanguage: string): Promise<string> => {
  // 这只是一个非常简单的演示实现
  return `[本地翻译] ${text}`;
};

// 翻译缓存
const translation_results: Record<number, string> = {};
const translation_status: Record<number, string> = {};
const translation_callbacks: Record<number, (translation: string) => void> = {};

// 注册翻译回调
export const registerTranslationCallback = (messageId: number, callback: (translation: string) => void) => {
  console.log(`注册消息 ${messageId} 的翻译回调`);
  translation_callbacks[messageId] = callback;
  
  // 如果已经有翻译结果，立即触发回调
  if (translation_results[messageId] && translation_status[messageId] === 'completed') {
    console.log(`消息 ${messageId} 已有翻译结果，立即触发回调`);
    setTimeout(() => callback(translation_results[messageId]), 0);
  }
};

// 取消注册翻译回调
export const unregisterTranslationCallback = (messageId: number) => {
  console.log(`取消注册消息 ${messageId} 的翻译回调`);
  delete translation_callbacks[messageId];
};

// 翻译消息
export const translateMessage = async (messageId: number, text: string, sourceLanguage: string = 'auto', targetLanguage: string) => {
  console.log(`请求翻译消息 ${messageId}，目标语言: ${targetLanguage}`);
  
  // 标记翻译状态为处理中
  translation_status[messageId] = 'processing';
  
  try {
    // 优先使用WebSocket连接
    if (ws && ws.readyState === WebSocket.OPEN) {
      const translationRequest: WebSocketMessage = {
        action: 'translate',
        message_id: messageId,
        source_text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      };
      
      ws.send(JSON.stringify(translationRequest));
      console.log(`通过WebSocket发送翻译请求：消息ID ${messageId}`);
      return "processing"; // 返回处理中状态
    } else {
      // WebSocket不可用，尝试使用本地翻译
      console.warn('WebSocket不可用，回退到本地翻译');
      const result = await localTranslate(text, targetLanguage);
      
      // 保存结果
      translation_results[messageId] = result;
      translation_status[messageId] = 'completed';
      
      // 触发回调
      if (translation_callbacks[messageId]) {
        translation_callbacks[messageId](result);
      }
      
      // 保存到数据库
      await saveTranslationToDatabase({
        action: 'translate_result',
        message_id: messageId,
        translated_text: result,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        status: 'success'
      });
      
      return result;
    }
  } catch (error) {
    console.error('翻译请求失败:', error);
    translation_status[messageId] = 'error';
    return null;
  }
};

// 保存翻译结果到数据库
const saveTranslationToDatabase = async (translationResult: TranslationResponse) => {
  try {
    if (!translationResult.message_id) return;
    
    const client = getSupabaseClient();
    if (!client) {
      console.warn('Supabase客户端不可用，无法保存翻译结果');
      return;
    }
    
    const { error } = await client
      .from('messages')
      .update({
        translated_content: translationResult.translated_text,
        original_language: translationResult.source_language,
        target_language: translationResult.target_language,
        translation_status: translationResult.status === 'success' ? 'completed' : 'error'
      })
      .eq('id', translationResult.message_id);
    
    if (error) {
      console.error('保存翻译结果到数据库失败:', error);
    } else {
      console.log(`已保存消息 ${translationResult.message_id} 的翻译结果到数据库`);
    }
  } catch (error) {
    console.error('保存翻译结果时出错:', error);
  }
};

// 获取主机信息
export const getHostInfo = async (hostId: string): Promise<HostInfo | null> => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await client
      .from('hosts')
      .select('*')
      .eq('id', hostId)
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
      title: data.title,
      url: data.url,
      avatarUrl: data.avatar_url
    };
  } catch (error) {
    console.error('Error fetching host info:', error);
    return null;
  }
};

// 获取聊天消息
export const getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
};

// 尝试使用REST API或直接数据库调用发送消息
export const sendMessage = async (
  sessionId: string, 
  content: string, 
  isHost: boolean = false,
  userLanguage: string = 'en'
) => {
  try {
    // 检查是否可以发送相同内容（防止重复发送）
    const canSend = await canSendMessage(content);
    if (!canSend) {
      console.log('阻止发送重复消息或发送过于频繁');
      return null;
    }
    
    // 使用Supabase客户端
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }
    
    // 创建消息数据
    const messageData = {
      session_id: sessionId,
      content: content,
      sender: isHost ? 'host' : 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_language: userLanguage,
      translation_status: 'pending'
    };
    
    // 首先尝试使用REST API
    try {
      const apiEndpoint = '/api/messages';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Message sent via REST API:', result);
      
      // 如果是主机消息，并且启用了自动翻译，则触发翻译
      if (isHost && result.id && userLanguage !== 'auto') {
        translateMessage(result.id, content, 'auto', userLanguage);
      }
      
      return result;
    } catch (apiError) {
      console.warn('REST API failed, falling back to direct database call:', apiError);
      
      // 回退到直接数据库调用
      const { data, error } = await client
        .from('messages')
        .insert(messageData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // 如果是主机消息，并且启用了自动翻译，则触发翻译
      if (isHost && data.id && userLanguage !== 'auto') {
        translateMessage(data.id, content, 'auto', userLanguage);
      }
      
      return data;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// 创建或获取聊天会话
export const getOrCreateChatSession = async (hostId: string): Promise<string> => {
  try {
    // 生成会话ID
    const sessionId = uuidv4();
    
    // 使用Supabase客户端
    const client = getSupabaseClient();
    if (!client) {
      // 如果Supabase客户端不可用，使用本地会话ID
      console.warn('Supabase client not initialized, using local session ID');
      return sessionId;
    }
    
    // 创建会话数据
    const sessionData = {
      id: sessionId,
      host_id: hostId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };
    
    // 插入到数据库
    const { error } = await client
      .from('sessions')
      .insert(sessionData);
    
    if (error) {
      throw error;
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error creating chat session:', error);
    // 出错时返回本地生成的会话ID
    return uuidv4();
  }
};

// 防止过于频繁发送相同内容
const recentMessages = new Map<string, number>();
const MESSAGE_COOLDOWN_MS = 2000; // 2秒冷却时间

const canSendMessage = async (content: string): Promise<boolean> => {
  const now = Date.now();
  const lastSentTime = recentMessages.get(content);
  
  if (lastSentTime && now - lastSentTime < MESSAGE_COOLDOWN_MS) {
    return false; // 冷却期内，不允许发送
  }
  
  // 记录本次发送时间
  recentMessages.set(content, now);
  
  // 清理旧的记录
  for (const [msg, time] of recentMessages.entries()) {
    if (now - time > MESSAGE_COOLDOWN_MS * 5) { // 5倍冷却时间后清理
      recentMessages.delete(msg);
    }
  }
  
  return true;
};

// 订阅新消息
export const subscribeToMessages = (sessionId: string, onNewMessage: (message: ChatMessage) => void) => {
  // 使用轮询方式获取新消息
  let lastMessageId = 0;
  let isPolling = false;
  
  // 首先获取当前所有消息，找出最后一条消息的ID
  getChatMessages(sessionId).then(messages => {
    if (messages.length > 0) {
      lastMessageId = Math.max(...messages.map(m => m.id));
    }
  });
  
  // 设置轮询函数
  const poll = async () => {
    if (isPolling) return;
    
    try {
      isPolling = true;
      
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }
      
      const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .gt('id', lastMessageId)
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // 更新最后消息ID
        lastMessageId = Math.max(...data.map(m => m.id));
        
        // 触发回调
        for (const message of data) {
          onNewMessage(message);
        }
      }
    } catch (error) {
      console.error('Error polling for new messages:', error);
    } finally {
      isPolling = false;
    }
  };
  
  // 设置轮询间隔
  const intervalId = setInterval(poll, 2000); // 每2秒轮询一次
  
  // 返回取消订阅函数
  return {
    unsubscribe: () => {
      clearInterval(intervalId);
    }
  };
};

// 初始化Supabase客户端
initSupabase();
