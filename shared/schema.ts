/**
 * 共享类型定义
 */

// 主机信息
export interface HostInfo {
  id: string;
  name: string;
  title?: string;
  url?: string;
  avatarUrl?: string;
}

// 消息
export interface ChatMessage {
  id: number;
  session_id: string;
  content: string;
  sender: 'user' | 'host'; // user 代表客户端用户，host 代表商家端用户
  created_at: string;
  updated_at: string;
  host_id?: string;
  read?: boolean;
  
  // 翻译相关字段
  translated_content?: string;
  original_language?: string;
  target_language?: string;
  translation_status?: 'pending' | 'processing' | 'completed' | 'error';
}

// 会话
export interface ChatSession {
  id: string;
  host_id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'closed';
  last_message_at?: string;
  user_language?: string;
}

// 翻译请求
export interface TranslationRequest {
  action: 'translate';
  source_text: string;
  source_language?: string; // 可选，如果不提供则使用自动检测
  target_language: string; // 目标语言代码
  message_id?: number; // 如果是消息翻译，则提供消息ID
}

// 翻译响应
export interface TranslationResponse {
  action: 'translate_result';
  translated_text: string;
  detected_language?: string;
  source_language: string;
  target_language: string;
  status: 'success' | 'error';
  message_id?: number; // 如枟原请求提供了消息ID，则响应中也包含此ID
  error?: string;
}

// WebSocket连接请求
export interface WebSocketConnectRequest {
  action: 'connect';
  session_id: string;
  user_language?: string; // 用户首选语言
}

// WebSocket状态响应
export interface WebSocketStatusResponse {
  action: 'connect_result' | 'heartbeat' | 'status';
  status: 'connected' | 'error';
  message?: string;
  session_id?: string;
  timestamp?: string;
}

// WebSocket消息类型
export type WebSocketMessage =
  | WebSocketConnectRequest
  | WebSocketStatusResponse
  | TranslationRequest
  | TranslationResponse;
