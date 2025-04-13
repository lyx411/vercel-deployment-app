import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// 返回模拟数据，避免任何服务器端逻辑
export async function getMessagesDirectSql(sessionId: string): Promise<ChatMessage[]> {
  console.log('获取消息历史 (模拟方法):', sessionId);
  
  // 返回空数组
  return [];
}

export async function sendMessageDirectSql(
  sessionId: string,
  content: string,
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  console.log('发送消息 (模拟方法):', { sessionId, content, isHost });
  
  // 返回模拟消息
  const messageId = uuidv4();
  const senderType = isHost ? ('host' as const) : ('guest' as const);
  
  return {
    id: messageId,
    content: content,
    sender: senderType,
    timestamp: new Date(),
    original_language: language || 'auto',
    translated_content: null,
    translation_status: 'pending'
  };
}

export async function createSessionDirectSql(merchantId: string): Promise<string> {
  console.log('创建会话 (模拟方法):', merchantId);
  
  // 返回新的会话ID
  return uuidv4();
}

export async function getHostInfoDirectSql(userId: string): Promise<HostInfo | null> {
  console.log('获取主机信息 (模拟方法):', userId);
  
  // 返回硬编码的商家信息
  return {
    id: userId,
    name: '测试商家',
    business_type: '服务',
    business_intro: '这是一个测试商家账号',
    avatar_url: `https://ui-avatars.com/api/?name=测试商家`
  };
}