import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, HostInfo } from '@shared/schema';

// Check if Supabase is properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

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

// 内存中存储消息翻译
// 键格式：`${messageId}`，值格式：{ translated_content, translation_status }
export const messageTranslations: Record<string, { translated_content?: string, translation_status: 'pending' | 'completed' | 'failed' }> = {};

// 添加回调函数存储，用于翻译完成时立即通知UI
export const translationCallbacks: Record<string, ((translated: string) => void)[]> = {};

// Initialize Supabase client if configured
export const supabase = (isSupabaseConfigured && !forceLocalMode)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 注册翻译结果回调函数
export function registerTranslationCallback(messageId: number, callback: (translated: string) => void) {
  const key = messageId.toString();
  if (!translationCallbacks[key]) {
    translationCallbacks[key] = [];
  }
  translationCallbacks[key].push(callback);
  
  // 如果翻译已经完成，立即触发回调
  const translation = messageTranslations[key];
  if (translation?.translation_status === 'completed' && translation?.translated_content) {
    callback(translation.translated_content);
  }
}

// 移除翻译结果回调函数
export function unregisterTranslationCallback(messageId: number, callback: (translated: string) => void) {
  const key = messageId.toString();
  if (translationCallbacks[key]) {
    translationCallbacks[key] = translationCallbacks[key].filter(cb => cb !== callback);
    if (translationCallbacks[key].length === 0) {
      delete translationCallbacks[key];
    }
  }
}

// 调用翻译功能
export async function translateMessage(
  messageId: number, 
  content: string, 
  sourceLanguage: string = 'auto',
  targetLanguage?: string
): Promise<boolean> {
  try {
    // 确保目标语言永远不会是undefined
    const finalTargetLanguage = targetLanguage || 'en';
    
    console.log(`尝试翻译消息 ${messageId}`);
    console.log(`源语言: ${sourceLanguage}, 目标语言: ${finalTargetLanguage}`);
    
    // 先标记为处理中
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'pending'
    };
    
    // 模拟翻译处理
    setTimeout(() => {
      // 简单翻译逻辑，实际项目中替换为你的翻译服务
      const translatedContent = `${content} (翻译后的内容)`;
      
      // 保存翻译结果
      messageTranslations[`${messageId}`] = {
        translated_content: translatedContent,
        translation_status: 'completed'
      };
      
      // 触发回调
      if (translationCallbacks[`${messageId}`]) {
        translationCallbacks[`${messageId}`].forEach(callback => {
          callback(translatedContent);
        });
      }
      
      console.log(`模拟翻译完成: ${translatedContent}`);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('调用翻译函数出错:', error);
    
    // 标记为失败
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'failed'
    };
    
    return false;
  }
}

// Fetch host information (merchant details)
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  try {
    console.log('Fetching host info for userId:', userId);
    
    // If Supabase is not configured, use demo host info
    if (!supabase) {
      console.log('Using local mode for host info (supabase client is null)');
      return {
        id: userId,
        name: "示例商家",
        title: "客户服务",
        url: "https://example.com",
        avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=merchant",
      };
    }
    
    // In a real implementation, we would fetch this from a table
    // For demo, use static data based on ID
    const hostInfo: HostInfo = {
      id: userId,
      name: "示例商家",
      title: "客户服务",
      url: "https://example.com",
      avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=" + userId,
    };
    
    return hostInfo;
  } catch (error) {
    console.error('Error fetching host info:', error);
    return null;
  }
}

// Get chat messages for a session
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    console.log('Getting chat messages for session:', sessionId);
    console.log('Supabase client initialized:', !!supabase);
    
    // When Supabase is not configured, return empty array initially
    if (!supabase) {
      console.log('Using local mode for messages (supabase client is null)');
      return [];
    }
    
    console.log('Querying Supabase for messages in session:', sessionId);
    
    const { data, error } = await supabase
      .from('messages')
      .select('id, session_id, content, sender, timestamp')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });
      
    if (error) {
      console.error('Supabase query error for messages:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} messages in Supabase`);
    
    return (data || []).map(msg => {
      // 获取消息ID
      const msgId = msg.id;
      
      // 从内存缓存中获取翻译信息（如果存在）
      const cachedTranslation = messageTranslations[`${msgId}`];
      
      return {
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp),
        translated_content: cachedTranslation?.translated_content,
        translation_status: cachedTranslation?.translation_status || 'pending'
      };
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Send a new message
export async function sendMessage(
  sessionId: string, 
  content: string, 
  isHost: boolean
): Promise<ChatMessage | null> {
  // Determine message sender type
  const sender = isHost ? 'host' : 'guest';
  try {
    console.log(`Sending ${sender} message to session:`, sessionId);
    console.log('Supabase client initialized:', !!supabase);
    console.log('Message content:', content.substring(0, 20) + (content.length > 20 ? '...' : ''));
    
    // If Supabase is not configured, generate a local message
    if (!supabase) {
      console.log('Using local mode for sending message (supabase client is null)');
      const timestamp = new Date();
      const messageId = Date.now();
      
      // 为本地消息创建翻译记录
      if (isHost) {
        translateMessage(messageId, content, 'auto', 'en')
          .catch(error => console.error('Failed to translate local host message:', error));
      }
      
      return {
        id: messageId,
        content,
        sender,
        timestamp,
        translated_content: messageTranslations[`${messageId}`]?.translated_content,
        translation_status: messageTranslations[`${messageId}`]?.translation_status || 'pending'
      };
    }
    
    // Get saved host_id or generate a new ID
    let senderId: string;
    if (sender === 'host' && sessionHostIds[sessionId]) {
      // If this is a host message and we have a host_id for this session, use it
      senderId = sessionHostIds[sessionId];
      console.log('Using existing host_id for host message:', senderId);
    } else if (sender === 'guest') {
      // If this is a guest message, generate a unique UUID for the guest
      senderId = uuidv4();
      console.log('Generated new guest_id:', senderId);
    } else {
      // Default to generating a new UUID
      senderId = uuidv4();
      console.log('Generated fallback sender_id:', senderId);
    }
    
    // Create message object
    const message = {
      session_id: sessionId,
      content: content,
      sender: sender
    };
    
    console.log('Sending message to Supabase:', message);
    
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error when sending message:', error);
      throw error;
    }
    
    console.log('Message successfully sent to Supabase:', data?.id);
    
    // 为主机消息触发翻译
    if (isHost && data && data.id) {
      translateMessage(data.id, content, 'auto', 'en')
        .catch(error => console.error('Failed to translate host message:', error));
    }
    
    return {
      id: data.id,
      content: data.content,
      sender: data.sender,
      timestamp: new Date(data.timestamp),
      translated_content: messageTranslations[`${data.id}`]?.translated_content,
      translation_status: messageTranslations[`${data.id}`]?.translation_status || 'pending'
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

// Get or create a chat session
export async function getOrCreateChatSession(merchantId: string): Promise<string> {
  try {
    console.log('Getting or creating chat session for merchant:', merchantId);
    console.log('Supabase client initialized:', !!supabase);
    
    // If Supabase is not configured, return a local session ID (using UUID for consistency)
    if (!supabase) {
      console.log('Using local mode for session (supabase client is null)');
      const localSessionId = uuidv4();
      console.log('Generated local session UUID:', localSessionId);
      return localSessionId;
    }
    
    // Generate a new session ID for each visitor
    const sessionId = uuidv4();
    console.log('Generated new UUID session ID:', sessionId);
    
    // Create chat session record
    try {
      // Define session data using fixed merchant ID rather than random generation
      const chatSession = {
        session_id: sessionId,
        host_id: merchantId
      };
      
      // Save host_id for later use
      sessionHostIds[sessionId] = merchantId;
      
      console.log('Creating chat session record:', chatSession);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([chatSession])
        .select()
        .single();
        
      if (sessionError) {
        console.error('Error creating chat session:', sessionError);
        throw sessionError;
      }
      
      console.log('Chat session created successfully:', sessionData?.session_id);
      
      // Create welcome message
      const welcomeMessage = {
        session_id: sessionId,
        content: "您好！感谢扫描二维码开始对话。请问有什么可以帮到您的？", 
        sender: "host"
      };
      
      console.log('Creating initial welcome message for session:', welcomeMessage);
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([welcomeMessage])
        .select()
        .single();
        
      if (messageError) {
        console.error('Error creating welcome message:', messageError);
        // Continue execution even if welcome message fails
      } else {
        console.log('Welcome message created successfully:', messageData?.id);
        
        // 触发欢迎消息的翻译
        if (messageData && messageData.id) {
          translateMessage(messageData.id, welcomeMessage.content, 'auto', 'en')
            .catch(error => console.error('Failed to translate welcome message:', error));
        }
      }
    } catch (error) {
      console.error('Error establishing session:', error);
      // Continue with the session ID anyway, even if session creation failed
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error managing chat session:', error);
    // For fallback, generate a proper UUID instead of a string
    const fallbackSessionId = uuidv4();
    console.log('Using fallback UUID session ID:', fallbackSessionId);
    return fallbackSessionId; // Fallback session ID
  }
}

// Subscribe to new messages
export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  // If Supabase is not configured, return a no-op cleanup function
  if (!supabase) {
    console.log('Using local mode for message subscription (supabase client is null)');
    return {
      unsubscribe: () => {},
    };
  }
  
  console.log('Setting up Supabase realtime subscription for session:', sessionId);
  
  return supabase
    .channel(`messages:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        console.log('New message received from realtime subscription:', payload);
        const message = payload.new as any;
        
        // 获取翻译状态（如果存在）
        const cachedTranslation = messageTranslations[`${message.id}`];
        
        callback({
          id: message.id,
          content: message.content,
          sender: message.sender,
          timestamp: new Date(message.timestamp),
          translated_content: cachedTranslation?.translated_content,
          translation_status: cachedTranslation?.translation_status || 'pending'
        });
        
        // 如果是主机消息，自动触发翻译
        if (message.sender === 'host') {
          translateMessage(message.id, message.content, 'auto', 'en')
            .catch(error => console.error('Failed to translate new host message:', error));
        }
      }
    )
    .subscribe((status) => {
      console.log('Supabase realtime subscription status:', status);
    });
}