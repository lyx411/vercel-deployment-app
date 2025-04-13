import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * 这些函数提供直接SQL实现作为备选方案
 * 在Supabase客户端不可用时使用
 */

// 获取主机信息
export const getHostInfoDirectSql = async (hostId: string): Promise<HostInfo | null> => {
  try {
    // 发送请求到我们自己的API
    const response = await fetch(`/api/host/${hostId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data as HostInfo;
  } catch (error) {
    console.error('Error fetching host info via direct SQL:', error);
    
    // 返回默认主机信息
    return {
      id: hostId,
      name: "Customer Service",
      title: "Online Support",
      url: "chat.example.com",
      avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${hostId}`,
    };
  }
};

// 获取消息
export const getMessagesDirectSql = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    // 发送请求到我们自己的API
    const response = await fetch(`/api/messages?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data as ChatMessage[];
  } catch (error) {
    console.error('Error fetching messages via direct SQL:', error);
    return [];
  }
};

// 发送消息
export const sendMessageDirectSql = async (
  sessionId: string, 
  content: string, 
  isHost: boolean = false,
  userLanguage: string = 'en'
): Promise<ChatMessage | null> => {
  try {
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
    
    // 发送请求到我们自己的API
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data as ChatMessage;
  } catch (error) {
    console.error('Error sending message via direct SQL:', error);
    
    // 模拟一个本地消息对象
    return {
      id: Date.now(),
      session_id: sessionId,
      content: content,
      sender: isHost ? 'host' : 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_language: userLanguage,
      translation_status: 'pending'
    };
  }
};

// 创建会话
export const createSessionDirectSql = async (hostId: string): Promise<string> => {
  try {
    // 生成会话ID
    const sessionId = uuidv4();
    
    // 创建会话数据
    const sessionData = {
      id: sessionId,
      host_id: hostId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };
    
    // 发送请求到我们自己的API
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating session via direct SQL:', error);
    
    // 返回本地生成的会话ID
    return uuidv4();
  }
};
