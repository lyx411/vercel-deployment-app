// 聊天会话类型
export interface ChatSession {
  id: string;
  created_at: string;
  host_id: string;
  host_name: string;
  guest_id?: string;
  guest_name?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

// 消息类型
export interface Message {
  id: string;
  chat_session_id: string;
  content: string;
  translated_content?: string;
  sender_id: string;
  sender_name: string;
  is_host: boolean;
  created_at: string;
  read: boolean;
}

// 用户类型
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  preferred_language?: string;
}

// 翻译结果类型
export interface TranslationResult {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
}

// 语言选项类型
export interface LanguageOption {
  code: string;
  label: string;
  nativeName: string;
}