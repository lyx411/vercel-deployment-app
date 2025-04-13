import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// 模拟数据库连接和查询，当Supabase API调用失败时使用
let lastMessageId = Date.now();

// 内存中的会话和消息存储
const memoryStorage: {
  sessions: Record<string, {
    id: string;
    host_id: string;
    created_at: Date;
    status: 'active' | 'closed';
  }>;
  messages: Record<string, ChatMessage[]>;
  hosts: Record<string, HostInfo>;
} = {
  sessions: {},
  messages: {},
  hosts: {}
};

// 模拟一些测试数据
memoryStorage.hosts['default-host'] = {
  id: 'default-host',
  name: '商家',
  business_type: '服务',
  business_intro: '欢迎光临我的店铺！我们提供优质的产品和服务。',
  avatar_url: 'https://ui-avatars.com/api/?name=商家&background=random&size=128',
};

// 直接创建会话，绕过Supabase
export async function createSessionDirectSql(hostId: string): Promise<string> {
  console.log('使用直接会话创建(绕过Supabase):', hostId);
  
  // 生成唯一的会话ID
  const sessionId = uuidv4();
  
  // 将会话存储在内存中
  memoryStorage.sessions[sessionId] = {
    id: sessionId,
    host_id: hostId,
    created_at: new Date(),
    status: 'active'
  };
  
  // 初始化此会话的消息数组
  memoryStorage.messages[sessionId] = [];
  
  // 添加欢迎消息
  const welcomeMessage: ChatMessage = {
    id: ++lastMessageId,
    content: '您好！欢迎来到聊天。今天我能为您提供什么帮助？',
    sender: 'host',
    timestamp: new Date(),
    original_language: 'zh',
    translated_content: 'Hello! Welcome to the chat. How can I help you today?',
    translation_status: 'completed'
  };
  
  memoryStorage.messages[sessionId].push(welcomeMessage);
  
  console.log(`直接创建的会话 ${sessionId} 用于主机 ${hostId}`);
  return sessionId;
}

// 直接获取会话的消息，绕过Supabase
export async function getMessagesDirectSql(sessionId: string): Promise<ChatMessage[]> {
  console.log('使用直接消息获取(绕过Supabase):', sessionId);
  
  // 从内存中获取消息
  const messages = memoryStorage.messages[sessionId] || [];
  
  // 如果没有消息，创建一条欢迎消息
  if (messages.length === 0) {
    const welcomeMessage: ChatMessage = {
      id: ++lastMessageId,
      content: '您好！欢迎来到聊天。今天我能为您提供什么帮助？',
      sender: 'host',
      timestamp: new Date(),
      original_language: 'zh',
      translated_content: 'Hello! Welcome to the chat. How can I help you today?',
      translation_status: 'completed'
    };
    
    messages.push(welcomeMessage);
    memoryStorage.messages[sessionId] = messages;
  }
  
  // 返回消息
  return messages;
}

// 直接发送消息，绕过Supabase
export async function sendMessageDirectSql(
  sessionId: string, 
  content: string, 
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  console.log('使用直接消息发送(绕过Supabase):', sessionId);
  
  // 创建消息对象
  const message: ChatMessage = {
    id: ++lastMessageId,
    content,
    sender: isHost ? 'host' : 'guest',
    timestamp: new Date(),
    original_language: language || 'zh',
    translated_content: null,
    translation_status: 'pending'
  };
  
  // 将消息添加到内存中
  if (!memoryStorage.messages[sessionId]) {
    memoryStorage.messages[sessionId] = [];
  }
  
  memoryStorage.messages[sessionId].push(message);
  
  return message;
}

// 直接获取主机信息，绕过Supabase
export async function getHostInfoDirectSql(hostId: string): Promise<HostInfo | null> {
  console.log('使用直接主机信息获取(绕过Supabase):', hostId);
  
  // 从内存中获取主机信息
  const hostInfo = memoryStorage.hosts[hostId] || memoryStorage.hosts['default-host'];
  
  if (!hostInfo) {
    // 创建默认主机信息
    return {
      id: hostId,
      name: '商家',
      business_type: '服务',
      business_intro: '欢迎光临！',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent('商家')}&background=random&size=128`,
    };
  }
  
  return hostInfo;
}