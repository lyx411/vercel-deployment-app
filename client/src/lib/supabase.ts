import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bazwlkkiodtuhepunqwz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhendsa2tpb2R0dWhlcHVucXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMwMDM5MDEsImV4cCI6MjAyODU3OTkwMX0.PimgHNYc3gPq_bj3DzSC6QZ8JRYm3PBK4QIu0k5GUak';
const MAX_RETRY_COUNT = 3;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟会话超时

// 基本类型
type MessageRole = 'user' | 'host';

type Message = {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  translated_content?: string | null;
  created_at: string;
  source_language?: string | null;
  target_language?: string | null;
  translation_status?: 'pending' | 'completed' | 'failed' | null;
};

// 支持的语言
export const supportedLanguages = {
  'zh-CN': '中文(简体)',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'ru': 'Русский',
};

// 日志工具
const LOG_PREFIX = '[SUPABASE]';
const log = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`${LOG_PREFIX} ${message}`, data || '');
  }
};

const error = (message: string, err?: any) => {
  console.error(`${LOG_PREFIX} ${message}`, err || '');
};

// 浏览器环境检测
const isBrowser = typeof window !== 'undefined';

function getHost() {
  if (!isBrowser) return '';
  return window.location.host;
}

function getProtocol() {
  if (!isBrowser) return 'http:';
  return window.location.protocol;
}

function getWsProtocol() {
  if (!isBrowser) return 'ws:';
  return getProtocol() === 'https:' ? 'wss:' : 'ws:';
}

// 环境检测
export function getEnv() {
  const host = getHost();
  const protocol = getProtocol();
  const wsProtocol = getWsProtocol();
  
  let env = 'production';
  if (host.includes('localhost')) {
    env = 'local';
  } else if (host.includes('repl.co') || host.includes('.repl.dev')) {
    env = 'replit';
  } else if (host.includes('cloudflare')) {
    env = 'cloudflare';
  }

  log(`环境检测: ${env}, 主机: ${host}`);
  
  return { host, protocol, wsProtocol, env };
}

// Supabase 实例
let supabaseInstance: any = null;

// 初始化 Supabase
export function initSupabase() {
  if (supabaseInstance) return supabaseInstance;
  
  try {
    log('初始化 Supabase 客户端');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL或Key未设置');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    log('Supabase 客户端初始化成功');
    return supabaseInstance;
  } catch (err) {
    error('Supabase 客户端初始化失败', err);
    return null;
  }
}

// 获取或初始化 Supabase
export function getSupabase() {
  return supabaseInstance || initSupabase();
}

// WebSocket 连接管理
let wsConnection: WebSocket | null = null;
let connectAttempts = 0;
let userLanguage = 'zh-CN';
let translationCallbacks: Record<string, (text: string) => void> = {};
let translationResults: Record<string, string> = {};

// 获取 WebSocket 连接状态
export function getWsConnectionStatus() {
  if (!wsConnection) return 'closed';
  
  switch (wsConnection.readyState) {
    case 0: return 'connecting';
    case 1: return 'open';
    case 2: return 'closing';
    case 3: return 'closed';
    default: return 'unknown';
  }
}

// 初始化 WebSocket 连接
export function initWebSocketConnection(language: string = 'zh-CN') {
  if (!isBrowser) {
    log('非浏览器环境，跳过 WebSocket 初始化');
    return null;
  }
  
  if (wsConnection && wsConnection.readyState === 1) {
    log('WebSocket 已连接，无需重新初始化');
    return wsConnection;
  }
  
  userLanguage = language;
  const { env, wsProtocol, host } = getEnv();
  let wsUrl: string;
  
  // 根据环境选择适当的 WebSocket URL
  if (env === 'local') {
    wsUrl = `${wsProtocol}//localhost:3001/translate`;
  } else if (env === 'replit') {
    wsUrl = `${wsProtocol}//${host}/translate`;
  } else if (env === 'cloudflare') {
    wsUrl = `${wsProtocol}//${host}/translate`;
  } else {
    // 生产环境
    wsUrl = `${wsProtocol}//${host}/translate`;
  }
  
  log(`初始化 WebSocket 连接: ${wsUrl}`);
  
  try {
    wsConnection = new WebSocket(wsUrl);
    
    wsConnection.onopen = () => {
      log('WebSocket 连接成功');
      connectAttempts = 0;
      
      // 发送用户语言首选项
      if (wsConnection && wsConnection.readyState === 1) {
        wsConnection.send(JSON.stringify({
          action: 'setUserLanguage',
          language: userLanguage
        }));
        log(`设置用户语言: ${userLanguage}`);
        
        // 设置心跳保持连接活跃
        setInterval(() => {
          if (wsConnection && wsConnection.readyState === 1) {
            wsConnection.send(JSON.stringify({ action: 'heartbeat' }));
          }
        }, 30000);
      }
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, messageId } = data;
        
        if (type === 'connection') {
          log(`WebSocket 连接状态: ${data.status}`);
        } else if (type === 'translation-result' && messageId) {
          const { translatedText } = data;
          log(`收到翻译结果: ${messageId}`);
          
          // 存储翻译结果
          translationResults[messageId] = translatedText;
          
          // 保存到数据库
          const supabase = getSupabase();
          if (supabase) {
            supabase
              .from('messages')
              .update({
                translated_content: translatedText,
                translation_status: 'completed'
              })
              .eq('id', messageId)
              .then(({ error: updateError }) => {
                if (updateError) {
                  error(`保存翻译结果失败: ${messageId}`, updateError);
                }
              });
          }
          
          // 触发回调
          if (translationCallbacks[messageId]) {
            translationCallbacks[messageId](translatedText);
          }
        } else if (type === 'translation-status' && messageId) {
          log(`翻译状态更新: ${messageId} - ${data.status}`);
        } else if (type === 'error') {
          error(`WebSocket 错误: ${data.error}`);
        }
      } catch (err) {
        error('处理 WebSocket 消息失败', err);
      }
    };
    
    wsConnection.onclose = () => {
      log('WebSocket 连接关闭');
      
      // 尝试重新连接
      if (connectAttempts < MAX_RETRY_COUNT) {
        connectAttempts++;
        log(`尝试重新连接 (${connectAttempts}/${MAX_RETRY_COUNT})`);
        setTimeout(() => {
          initWebSocketConnection(userLanguage);
        }, 2000 * connectAttempts); // 递增重试延迟
      } else {
        error(`达到最大重试次数 (${MAX_RETRY_COUNT})，WebSocket 不可用`);
      }
    };
    
    wsConnection.onerror = (err) => {
      error('WebSocket 连接错误', err);
    };
    
    return wsConnection;
  } catch (err) {
    error('初始化 WebSocket 失败', err);
    return null;
  }
}

// 注册翻译回调
export function registerTranslationCallback(messageId: string, callback: (text: string) => void) {
  translationCallbacks[messageId] = callback;
  log(`注册翻译回调: ${messageId}`);
  
  // 如果已有翻译结果，立即触发回调
  if (translationResults[messageId]) {
    callback(translationResults[messageId]);
  }
}

// 注销翻译回调
export function unregisterTranslationCallback(messageId: string) {
  if (translationCallbacks[messageId]) {
    delete translationCallbacks[messageId];
    log(`注销翻译回调: ${messageId}`);
  }
}

// 通过 WebSocket 翻译消息
export function translateMessage(message: Message) {
  if (getWsConnectionStatus() !== 'open') {
    error('WebSocket 未连接，无法发送翻译请求');
    return false;
  }
  
  try {
    const request = {
      action: 'translate',
      messageId: message.id,
      text: message.content,
      targetLanguage: message.target_language || userLanguage,
      sourceLanguage: message.source_language || 'auto'
    };
    
    wsConnection!.send(JSON.stringify(request));
    log(`发送翻译请求: ${message.id}`);
    return true;
  } catch (err) {
    error('发送翻译请求失败', err);
    return false;
  }
}

// 使用备用方法翻译（HTTP API）
export async function translateMessageFallback(message: Message) {
  try {
    const { env, protocol, host } = getEnv();
    let apiUrl: string;
    
    if (env === 'local') {
      apiUrl = `${protocol}//localhost:5000/api/translate`;
    } else {
      apiUrl = `${protocol}//${host}/api/translate`;
    }
    
    log(`使用备用翻译 API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.content,
        source: message.source_language || 'auto',
        target: message.target_language || userLanguage,
        messageId: message.id
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.translation) {
      // 更新数据库
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('messages')
          .update({
            translated_content: data.translation,
            translation_status: 'completed'
          })
          .eq('id', message.id);
      }
      
      // 触发回调
      if (translationCallbacks[message.id]) {
        translationCallbacks[message.id](data.translation);
      }
      
      return data.translation;
    }
    
    throw new Error('翻译失败，响应格式无效');
  } catch (err) {
    error('备用翻译失败', err);
    return null;
  }
}

// 获取聊天消息
export async function getChatMessages(sessionId: string) {
  const supabase = getSupabase();
  if (!supabase) {
    error('获取聊天消息失败 - Supabase 客户端未初始化');
    return [];
  }
  
  try {
    log(`获取会话消息: ${sessionId}`);
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (queryError) throw queryError;
    
    log(`获取到 ${data?.length || 0} 条消息`);
    return data || [];
  } catch (err) {
    error('获取聊天消息失败', err);
    return [];
  }
}

// 发送消息
export async function sendMessage(content: string, sessionId: string, role: MessageRole = 'user', options = {}) {
  if (!content.trim()) {
    error('消息内容不能为空');
    return null;
  }
  
  // 生成唯一ID
  const messageId = uuidv4();
  const now = new Date().toISOString();
  const sourceLang = role === 'host' ? 'en' : 'zh-CN';
  const targetLang = role === 'host' ? 'zh-CN' : 'en';
  
  // 创建消息对象
  const message: Message = {
    id: messageId,
    created_at: now,
    content: content,
    translated_content: null,
    role: role,
    session_id: sessionId,
    source_language: sourceLang,
    target_language: targetLang,
    translation_status: role === 'host' ? 'pending' : null
  };
  
  log(`发送${role}消息: ${messageId}`);
  
  // 保存到数据库
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: insertError } = await supabase.from('messages').insert(message);
      
      if (insertError) throw insertError;
      
      log(`消息已保存到数据库: ${messageId}`);
    } catch (err) {
      error('保存消息到数据库失败', err);
    }
  } else {
    log('无法保存消息到数据库 - 使用本地模式');
  }
  
  // 如果是客服消息且需要翻译
  if (role === 'host') {
    if (getWsConnectionStatus() === 'open') {
      translateMessage(message);
    } else {
      // 使用备用方法
      initWebSocketConnection(userLanguage);
      setTimeout(() => translateMessageFallback(message), 1000);
    }
  }
  
  return message;
}

// 获取或创建聊天会话
export async function getOrCreateChatSession() {
  const supabase = getSupabase();
  if (!supabase) {
    const sessionId = `local-${uuidv4()}`;
    log(`使用本地会话ID: ${sessionId}`);
    return { sessionId };
  }
  
  const sessionId = uuidv4();
  log(`创建新会话: ${sessionId}`);
  
  try {
    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        created_at: new Date().toISOString(),
        status: 'active'
      });
    
    if (insertError) throw insertError;
    
    // 验证会话创建成功
    const { data, error: queryError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    
    if (queryError || !data) {
      throw queryError || new Error('会话创建失败');
    }
    
    log(`会话创建成功: ${sessionId}`);
    return { sessionId };
  } catch (err) {
    error('创建会话失败', err);
    return { sessionId: `local-${uuidv4()}` };
  }
}

// 订阅新消息
export function subscribeToMessages(sessionId: string, onNewMessage: (message: Message) => void) {
  if (!sessionId) {
    error('无效的会话ID');
    return null;
  }
  
  log(`设置消息订阅: ${sessionId}`);
  const supabase = getSupabase();
  let lastProcessed: Record<string, boolean> = {};
  
  // 使用轮询方式获取新消息
  const intervalId = setInterval(async () => {
    if (!supabase) return;
    
    try {
      const { data, error: queryError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (queryError) throw queryError;
      
      if (data && data.length > 0) {
        for (const msg of data) {
          if (!lastProcessed[msg.id]) {
            lastProcessed[msg.id] = true;
            onNewMessage(msg);
          }
        }
      }
    } catch (err) {
      error('获取新消息失败', err);
    }
  }, 3000);
  
  return {
    unsubscribe: () => {
      clearInterval(intervalId);
      log(`取消消息订阅: ${sessionId}`);
    }
  };
}

// 默认导出
export default {
  initSupabase,
  getSupabase,
  initWebSocketConnection,
  registerTranslationCallback,
  unregisterTranslationCallback,
  translateMessage,
  translateMessageFallback,
  getChatMessages,
  sendMessage,
  getOrCreateChatSession,
  subscribeToMessages,
  getWsConnectionStatus,
  supportedLanguages
};