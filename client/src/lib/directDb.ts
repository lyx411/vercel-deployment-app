import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// 使用Supabase客户端功能而不是直接SQL
import { supabase } from './supabase';

// 模拟数据获取，不使用直接SQL
export async function getMessagesDirectSql(sessionId: string): Promise<ChatMessage[]> {
  try {
    console.log('获取消息历史 (模拟方法):', sessionId);
    
    // 使用Supabase查询而不是直接SQL
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', sessionId)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('获取消息错误:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.log('未找到消息或格式无效');
      return [];
    }
    
    return data.map((msg: any) => {
      // 使用is_host确定sender类型
      const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
      
      return {
        id: msg.id,
        content: msg.content,
        sender: senderType,
        timestamp: new Date(msg.timestamp),
        original_language: msg.original_language,
        translated_content: msg.translated_content,
        translation_status: msg.translation_status
      };
    });
  } catch (error) {
    console.error('获取消息方法错误:', error);
    return [];
  }
}

// 使用Supabase客户端发送消息，而不是直接SQL
export async function sendMessageDirectSql(
  sessionId: string,
  content: string,
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  try {
    console.log('发送消息 (模拟方法):', sessionId, content);
    
    // 生成默认的发送者ID
    const senderId = isHost ? 
      '00000000-0000-4000-a000-000000000000' : // 默认主机ID
      '00000000-0000-4000-a000-000000000001'; // 默认客人ID
    
    const senderName = isHost ? 'Host' : 'Guest';
    
    // 使用Supabase插入而不是直接SQL
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_session_id: sessionId,
        content: content,
        sender_id: senderId,
        sender_name: senderName,
        is_host: isHost,
        original_language: language || 'auto'
      })
      .select()
      .single();
    
    if (error) {
      console.error('发送消息错误:', error);
      return null;
    }
    
    if (!data) {
      console.error('发送消息失败或格式无效');
      return null;
    }
    
    // 使用类型断言确保sender类型
    const senderType = isHost ? ('host' as const) : ('guest' as const);
    
    // 创建返回的消息对象
    const newMessage: ChatMessage = {
      id: data.id,
      content: data.content,
      sender: senderType, 
      timestamp: new Date(data.timestamp),
      original_language: data.original_language || language || 'auto',
      translated_content: data.translated_content,
      translation_status: data.translation_status || 'pending'
    };
    
    // 对于主机消息尝试触发翻译
    if (supabase && isHost) {
      try {
        const { translateMessage } = await import('./supabase');
        translateMessage(newMessage.id, newMessage.content, 'auto', language)
          .catch(err => console.error('翻译错误:', err));
      } catch (err) {
        console.error('导入translateMessage函数失败:', err);
      }
    }
    
    return newMessage;
  } catch (error) {
    console.error('发送消息方法错误:', error);
    return null;
  }
}

// 创建聊天会话
export async function createSessionDirectSql(merchantId: string): Promise<string> {
  try {
    console.log('创建会话 (模拟方法):', merchantId);
    
    // 生成一个新的会话ID
    const sessionId = uuidv4();
    
    // 使用Supabase插入而不是直接SQL
    const { error } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId,
        host_id: merchantId,
        status: 'active'
      });
    
    if (error) {
      console.error('创建会话错误:', error);
      return uuidv4(); // 返回一个新ID
    }
    
    // 创建欢迎消息
    const { error: welcomeError } = await supabase
      .from('messages')
      .insert({
        chat_session_id: sessionId,
        content: "您好！感谢扫描二维码开始对话。请问有什么可以帮到您的？",
        sender_id: merchantId,
        sender_name: 'Host',
        is_host: true,
        original_language: "zh"
      });
    
    if (welcomeError) {
      console.error('创建欢迎消息错误:', welcomeError);
    }
    
    console.log(`会话创建成功: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error('创建会话方法错误:', error);
    // 如果失败，仍然返回一个会话ID以便继续
    return uuidv4();
  }
}

// 获取主机信息
export async function getHostInfoDirectSql(userId: string): Promise<HostInfo | null> {
  try {
    console.log('获取主机信息 (模拟方法):', userId);
    
    // 使用Supabase查询而不是直接SQL
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('获取主机信息错误:', error);
      
      // 返回硬编码数据以备份
      return {
        id: userId,
        name: '默认商家',
        business_type: '未指定',
        business_intro: '商家尚未提供介绍',
        avatar_url: `https://ui-avatars.com/api/?name=商家`
      };
    }
    
    return {
      id: data.id,
      name: data.name || '未命名商家',
      business_type: data.business_type || '未指定',
      business_intro: data.business_intro || '商家尚未提供介绍',
      avatar_url: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || '商家')}`
    };
  } catch (error) {
    console.error('获取主机信息方法错误:', error);
    
    // 返回硬编码数据以备份
    return {
      id: userId,
      name: '默认商家',
      business_type: '未指定',
      business_intro: '商家尚未提供介绍',
      avatar_url: `https://ui-avatars.com/api/?name=商家`
    };
  }
}