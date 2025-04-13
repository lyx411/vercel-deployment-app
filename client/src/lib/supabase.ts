import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, HostInfo } from '@shared/schema';

// Check if Supabase is properly configured
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || 'https://bazwlkkiodtuhepunqwz.supabase.co';
const supabaseKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';
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