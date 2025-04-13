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

// WebSocket连接
let wsConnection: WebSocket | null = null;
let wsConnectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000; // 重连间隔(毫秒)
let heartbeatInterval: number | null = null;
let currentSessionId: string = ''; // 当前会话ID，在初始化WebSocket时设置

// 用户的语言偏好
let userLanguagePreference: string | null = null;

// 全局事件发射器
const wsStatusListeners: Array<(status: typeof wsConnectionStatus) => void> = [];

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

// 发送用户的语言偏好到WebSocket服务器
function sendLanguagePreference(language: string) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    try {
      wsConnection.send(JSON.stringify({
        type: 'set_language_preference',
        language
      }));
      console.log(`已发送用户语言偏好到WebSocket服务器: ${language}`);
    } catch (error) {
      console.error('发送语言偏好时出错:', error);
    }
  } else {
    console.warn('WebSocket未连接，无法发送语言偏好');
  }
}

// 处理WebSocket接收到的消息
function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    console.log('收到WebSocket消息:', data);
    
    if (data.type === 'connection_established') {
      wsConnectionStatus = 'connected';
      console.log('WebSocket连接已建立，可以开始翻译');
      
      // 通知所有注册的状态监听器
      wsStatusListeners.forEach(listener => listener('connected'));
      
      // 发送用户语言偏好
      if (userLanguagePreference) {
        sendLanguagePreference(userLanguagePreference);
      }
      
      // 如果有待处理的翻译请求，立即发送
      if (typeof pendingTranslations === 'object') {
        Object.keys(pendingTranslations).forEach(key => {
          const request = pendingTranslations[key];
          if (request) {
            sendTranslationRequest(request);
            // 发送后从pendingTranslations中移除
            delete pendingTranslations[key];
          }
        });
      }
      
      // 启动心跳
      startHeartbeat();
    } 
    else if (data.type === 'translation_complete' && data.messageId) {
      console.log(`收到翻译结果: 类型=${data.type}, 消息ID=${data.messageId}, 源语言=${data.sourceLanguage}`);
      
      // 将翻译结果保存到内存中
      const messageId = data.messageId.toString();
      messageTranslations[messageId] = {
        translated_content: data.translatedContent,
        translation_status: 'completed'
      };
      
      // 输出调试信息
      console.log(`消息 ${messageId} 翻译完成 (Edge Function): ${data.translatedContent?.substring(0, 50)}...`);
      
      // 触发所有注册的回调函数，立即更新UI
      if (translationCallbacks[messageId]) {
        translationCallbacks[messageId].forEach(callback => {
          callback(data.translatedContent);
        });
      }
      
      // 将翻译结果保存到数据库
      if (supabase) {
        supabase
          .from('messages')
          .update({
            translated_content: data.translatedContent,
            translation_status: 'completed',
            translated_at: new Date().toISOString(),
            source_language: data.sourceLanguage || 'auto'
          })
          .eq('id', data.messageId)
          .then(() => {
            console.log(`消息 ${data.messageId} 的翻译已保存到数据库`);
          })
          .catch((error) => {
            console.error('保存翻译结果到数据库时出错:', error);
          });
      }
    } 
    // 省略其他处理逻辑...
  } catch (error) {
    console.error('处理WebSocket消息时出错:', error);
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

  // 这里省略了大量原有代码...保留与GitHub一致
  // 实际实现保持与GitHub上的代码完全一致

  // 仅供占位使用
  return true;
}

// Initialize Supabase client if configured
export const supabase = (isSupabaseConfigured && !forceLocalMode)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 省略其他所有未修改的函数...
// 实际文件中保留所有原有函数