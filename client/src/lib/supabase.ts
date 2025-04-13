// 仅更新WebSocket连接相关部分的代码，不修改其他功能
import { getWebSocketURL } from './getEnvironment';

// 保持其他代码不变...

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
    
    // 原有的WebSocket事件处理...
    
  } catch (error) {
    console.error('创建WebSocket连接失败:', error);
    updateWsStatus('disconnected');
  }
}

// 保留其余代码不变