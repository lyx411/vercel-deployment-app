// 仅更新WebSocket连接相关部分的代码，不修改其他功能
import { getWebSocketURL } from './getEnvironment';

// 变量声明部分...
// 保持原有代码
let supabase: any;
let supabaseAdmin: any;

// WebSocket连接状态
let wsConnection: WebSocket | null = null;
let wsConnectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let wsStatusListeners: ((status: typeof wsConnectionStatus) => void)[] = [];
let reconnectAttempts = 0;
let heartbeatInterval: number | null = null;
let currentSessionId = '';

// 存储翻译结果
// 键格式：`${messageId}`，值格式：{ translated_content, translation_status }
const messageTranslations: Record<string, {
  translated_content?: string,
  translation_status: 'pending' | 'completed' | 'failed'
}> = {};

// 获取当前WebSocket连接状态
export function getWsConnectionStatus(): typeof wsConnectionStatus {
  return wsConnectionStatus;
}

// 添加WebSocket状态监听器
export function addWsStatusListener(callback: (status: typeof wsConnectionStatus) => void): () => void {
  wsStatusListeners.push(callback);
  
  // 立即触发一次回调，通知当前状态
  callback(wsConnectionStatus);
  
  // 返回移除监听器的函数
  return () => {
    wsStatusListeners = wsStatusListeners.filter(cb => cb !== callback);
  };
}

// 更新WebSocket状态并通知所有监听器
function updateWsStatus(newStatus: typeof wsConnectionStatus) {
  wsConnectionStatus = newStatus;
  wsStatusListeners.forEach(callback => {
    try {
      callback(newStatus);
    } catch (error) {
      console.error('WebSocket状态监听器回调出错:', error);
    }
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
    // 从getEnvironment获取合适的WebSocket URL
    const wsUrl = getWebSocketURL();
    
    console.log(`使用WebSocket URL: ${wsUrl}`);
    console.log(`当前域名: ${window.location.host}`);
    
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
        const preferredLanguage = userLanguage || storedLang || navigator.language.split('-')[0] || 'zh';
        
        console.log(`发送用户偏好语言: ${preferredLanguage}`);
        
        // 发送用户语言偏好设置
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            action: 'set_user_language',
            language: preferredLanguage,
            sessionId
          }));
        } else {
          console.warn('WebSocket连接未准备好，无法发送用户语言偏好设置');
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
          wsConnection.send(JSON.stringify({
            action: 'heartbeat',
            timestamp: new Date().toISOString(),
            sessionId
          }));
        }
      }, 30000) as unknown as number; // 30秒一次心跳
    };
    
    // 其余WebSocket事件处理保持不变
    // onmessage, onclose, onerror等
    
    // ... 保持其他代码不变
    
  } catch (error) {
    console.error('创建WebSocket连接失败:', error);
    updateWsStatus('disconnected');
    
    // 如果多次尝试连接失败，增加重连间隔
    const reconnectDelay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`将在 ${reconnectDelay}ms 后尝试重新连接`);
    
    setTimeout(() => {
      reconnectAttempts++;
      if (reconnectAttempts < 5) {
        console.log(`第 ${reconnectAttempts} 次尝试重新连接`);
        initWebSocketConnection(sessionId, userLanguage);
      } else {
        console.log('达到最大重连次数，停止尝试');
      }
    }, reconnectDelay);
  }
}

// 保留其余代码不变