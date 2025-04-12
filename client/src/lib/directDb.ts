import { ChatMessage, HostInfo } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// 使用原始Supabase函数，但直接执行SQL绕过架构缓存
import { supabase } from './supabase';

// 创建一个安全的SQL执行函数，确保参数不会导致SQL注入
async function executeSql(sql: string, params: any[] = []): Promise<any> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    // 将参数插入到SQL语句中，使用简单的占位符替换 (仅用于演示)
    // 注意：在生产中应使用参数化查询避免SQL注入
    let finalSql = sql;
    params.forEach((param, index) => {
      // 对字符串类型的参数进行引号转义
      const escapedParam = typeof param === 'string' 
        ? `'${param.replace(/'/g, "''")}'`  // 简单的SQL转义
        : param;
      
      finalSql = finalSql.replace(`$${index + 1}`, escapedParam.toString());
    });
    
    console.log('Executing SQL:', finalSql);
    
    const { data, error } = await supabase.rpc('execute_sql', { sql: finalSql });
    
    if (error) {
      console.error('SQL execution error:', error);
      throw error;
    }
    
    console.log('SQL execution successful. Results:', data);
    return data;
  } catch (error) {
    console.error('Error in executeSql:', error);
    throw error;
  }
}

// 通过直接SQL获取消息
export async function getMessagesDirectSql(sessionId: string): Promise<ChatMessage[]> {
  try {
    // 更新SQL查询以匹配实际表结构，包括翻译相关字段
    const sql = `
      SELECT id, chat_session_id, content, is_host, timestamp, 
             original_language, translated_content
      FROM messages
      WHERE chat_session_id = $1
      ORDER BY id ASC
    `;
    
    const result = await executeSql(sql, [sessionId]);
    
    if (!result || !Array.isArray(result)) {
      console.log('No messages found or invalid result format');
      return [];
    }
    
    return result.map((msg: any) => {
      // 使用is_host确定sender类型，并使用类型断言保证类型安全
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
    console.error('Error fetching messages via direct SQL:', error);
    return [];
  }
}

// 通过直接SQL发送消息
export async function sendMessageDirectSql(
  sessionId: string,
  content: string,
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  try {
    // 生成默认的发送者ID (UUID格式)
    const senderId = isHost ? 
      '00000000-0000-4000-a000-000000000000' : // 默认主机ID
      '00000000-0000-4000-a000-000000000001'; // 默认客人ID
    
    // 插入消息，使用正确的表结构
    const insertSql = `
      INSERT INTO messages (
        chat_session_id, 
        content, 
        sender_id,
        sender_name,
        is_host, 
        original_language
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, chat_session_id, content, is_host, timestamp, 
                original_language, translated_content
    `;
    
    const senderName = isHost ? 'Host' : 'Guest';
    const result = await executeSql(
      insertSql, 
      [sessionId, content, senderId, senderName, isHost, language || 'auto']
    );
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      console.error('Failed to insert message or invalid result format');
      return null;
    }
    
    const msg = result[0];
    
    // 使用类型断言确保sender类型
    const senderType = isHost ? ('host' as const) : ('guest' as const);
    
    // 创建返回的消息对象
    const newMessage: ChatMessage = {
      id: msg.id,
      content: msg.content,
      sender: senderType, 
      timestamp: new Date(msg.timestamp),
      original_language: msg.original_language || language || 'auto',
      translated_content: msg.translated_content,
      translation_status: msg.translation_status || 'pending'
    };
    
    // 只为主机消息尝试触发翻译
    if (supabase && isHost) {
      try {
        const { translateMessage } = await import('./supabase');
        translateMessage(newMessage.id, newMessage.content, 'auto', language)
          .catch(err => console.error('Translation error after direct SQL insert:', err));
      } catch (err) {
        console.error('Failed to import translateMessage function:', err);
      }
    }
    
    return newMessage;
  } catch (error) {
    console.error('Error sending message via direct SQL:', error);
    return null;
  }
}

// 创建聊天会话
export async function createSessionDirectSql(merchantId: string): Promise<string> {
  try {
    // 生成一个新的会话ID (使用一个简单格式的UUID)
    const sessionId = uuidv4();
    
    // 插入聊天会话，使用正确的表结构
    const insertSql = `
      INSERT INTO chat_sessions (id, host_id, created_at, status)
      VALUES ($1, $2, NOW(), 'active')
      RETURNING id, host_id
    `;
    
    await executeSql(insertSql, [sessionId, merchantId]);
    
    // 创建欢迎消息，使用正确的表结构
    const welcomeSql = `
      INSERT INTO messages (
        chat_session_id, 
        content, 
        sender_id,
        sender_name,
        is_host, 
        original_language
      )
      VALUES ($1, $2, $3, 'Host', TRUE, $4)
    `;
    
    await executeSql(welcomeSql, [
      sessionId,
      "您好！感谢扫描二维码开始对话。请问有什么可以帮到您的？",
      merchantId, // 发送者ID使用商家ID
      "zh" // 指定欢迎消息是中文
    ]);
    
    console.log(`Session created successfully: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error('Error creating session via direct SQL:', error);
    // 如果失败，仍然返回一个会话ID以便继续
    return uuidv4();
  }
}

// 获取主机信息的函数保持不变，因为它使用的是静态数据
export async function getHostInfoDirectSql(userId: string): Promise<HostInfo | null> {
  try {
    // 我们仍然使用静态数据，因为Supabase可能没有Users表
    return {
      id: userId,
      name: "示例商家",
      title: "客户服务",
      url: "https://example.com",
      avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=" + userId,
    };
  } catch (error) {
    console.error('Error fetching host info:', error);
    return null;
  }
}