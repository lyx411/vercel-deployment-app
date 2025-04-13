import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ChatMessage, HostInfo } from '@shared/schema';
import { ChatHeader } from '@/components/ChatHeader';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';

// 导入原始Supabase函数以及直接SQL实现
import { 
  getHostInfo, 
  getChatMessages, 
  sendMessage, 
  getOrCreateChatSession,
  subscribeToMessages,
  initWebSocketConnection,
  addWsStatusListener
} from '@/lib/supabase';

// 导入直接SQL实现作为备选方案
import {
  getHostInfoDirectSql,
  getMessagesDirectSql,
  sendMessageDirectSql,
  createSessionDirectSql
} from '@/lib/directDb';

import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { preferredLanguage, autoTranslate } = useLanguage();
  
  const [hostId, setHostId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'failed'>('connecting');

  // Parse URL parameters to get host ID and session ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 支持多种参数名: userId 或 merchantId
    const merchantId = params.get('merchantId') || params.get('userId');
    
    // 支持多种会话参数名: sessionId 或 chat_session_id
    const chatSessionId = params.get('sessionId') || params.get('chat_session_id');
    
    // 如果URL提供了会话₄D，先设置它
    if (chatSessionId) {
      console.log('Using sessionId from URL:', chatSessionId);
      setSessionId(chatSessionId);
    }
    // 否则会在后续流程中创建新会话
    
    if (merchantId) {
      console.log('Using merchantId from URL:', merchantId);
      setHostId(merchantId);
    } else {
      // 使用一个有效的UUID格式作为默认商家ID
      const defaultMerchantId = '00000000-0000-4000-a000-000000000000'; // 合法的UUID格式，版本4
      console.log('No merchantId in URL, using default UUID:', defaultMerchantId);
      setHostId(defaultMerchantId);
    }
  }, [location, toast]);

  // Fetch host info and create/get session
  useEffect(() => {
    if (!hostId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 获取主机信息 - 首先尝试标准方法，然后回退到直接SQL
        let host: HostInfo | null = null;
        try {
          console.log('Attempting to get host info via standard API');
          host = await getHostInfo(hostId);
        } catch (hostError) {
          console.error('Standard API failed for host info, trying direct SQL:', hostError);
          host = await getHostInfoDirectSql(hostId);
        }
        
        if (!host) {
          console.warn('Failed to get host info with both methods, using default');
          host = {
            id: hostId,
            name: "Chat User",
            title: "Customer Service",
            url: "chat.example.com",
            avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=" + hostId,
          };
        }
        
        setHostInfo(host);
        
        // 创建或获取会话
        if (!sessionId) {
          console.log('No sessionId yet, getting or creating a chat session');
          
          // 首先尝试标准方法，然后回退到直接SQL
          let session: string;
          try {
            console.log('Attempting to create session via standard API');
            session = await getOrCreateChatSession(hostId);
          } catch (sessionError) {
            console.error('Standard API failed for session creation, trying direct SQL:', sessionError);
            session = await createSessionDirectSql(hostId);
          }
          
          setSessionId(session);
          
          // 显示新创建的会话₄D方便用户使用
          console.log('Chat session ID (add to URL as ?sessionId=):', session);
          
          // 更新URL以包含会话₄D，但不刷新页面
          const url = new URL(window.location.href);
          url.searchParams.set('sessionId', session);
          window.history.replaceState({}, '', url.toString());
          
          // 获取消息 - 首先尝试标准方法，然后回退到直接SQL
          let chatMessages: ChatMessage[] = [];
          try {
            console.log('Attempting to get messages via standard API');
            chatMessages = await getChatMessages(session);
          } catch (messagesError) {
            console.error('Standard API failed for messages, trying direct SQL:', messagesError);
            chatMessages = await getMessagesDirectSql(session);
          }
          
          setMessages(chatMessages);
        } else {
          // 使用URL中提供的会话₄D
          console.log('Using existing sessionId:', sessionId);
          
          // 获取消息 - 首先尝试标准方法，然后回退到直接SQL
          let chatMessages: ChatMessage[] = [];
          try {
            console.log('Attempting to get messages via standard API');
            chatMessages = await getChatMessages(sessionId);
          } catch (messagesError) {
            console.error('Standard API failed for messages, trying direct SQL:', messagesError);
            chatMessages = await getMessagesDirectSql(sessionId);
          }
          
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        toast({
          variant: "destructive",
          title: "Initialization Failed",
          description: "Unable to load chat session. Please refresh the page.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hostId, sessionId, toast]);

  // Subscribe to new messages
  useEffect(() => {
    if (!sessionId) return;
    
    const subscription = subscribeToMessages(sessionId, async (newMessage) => {
      // 检查是否是收到的消息（非自己发送的）并且需要翻译
      if (newMessage.sender === 'host' && preferredLanguage !== 'auto') {
        try {
          // 检查是否需要触发翻译
          if (
            (!newMessage.translated_content || newMessage.translated_content === '') &&
            (newMessage.original_language !== preferredLanguage) &&
            (newMessage.translation_status !== 'completed')
          ) {
            console.log(`自动触发消息 ${newMessage.id} 的翻译...`);
            console.log(`使用用户首选语言: ${preferredLanguage}`);
            
            // 导入 translateMessage 函数
            const { translateMessage } = await import('@/lib/supabase');
            
            // 确保传递用户首选语言
            await translateMessage(
              newMessage.id, 
              newMessage.content, 
              'auto', // 始终使用auto让Edge Function自动检测语言
              preferredLanguage // 确保使用用户选择的语言
            );
            
            console.log(`消息 ${newMessage.id} 翻译请求已发送，使用目标语言: ${preferredLanguage}`);
          }
        } catch (error) {
          console.error('自动翻译消息时出错:', error);
        }
      }
      
      setMessages((prevMessages) => {
        // 检查是否已有相同ID的消息，如果有则不添加
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          console.log(`Message with ID ${newMessage.id} already exists, ignoring duplicate`);
          return prevMessages;
        }
        return [...prevMessages, newMessage];
      });
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId, preferredLanguage]);
  
  // 定期刷新消息以获取最新的翻译内容
  useEffect(() => {
    if (!sessionId) return;
    
    // 设置一个定时器，每10秒刷新一次消息列表
    const refreshInterval = setInterval(async () => {
      try {
        console.log('刷新消息列表以获取最新翻译内容...');
        const updatedMessages = await getChatMessages(sessionId);
        
        // 更新消息，保留新收到的消息的翻译状态
        setMessages(updatedMessages);
      } catch (error) {
        console.error('刷新消息列表时出错:', error);
      }
    }, 10000); // 每10秒刷新一次
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [sessionId]);

  // 初始化WebSocket连接
  useEffect(() => {
    if (!sessionId) return;
    
    // 初始化WebSocket连接用于实时翻译
    console.log('初始化WebSocket连接用于实时翻译...');
    console.log('当前用户首选语言:', preferredLanguage);
    // 传递用户的首选语言到WebSocket连接
    initWebSocketConnection(sessionId, preferredLanguage);
    
    // 监听WebSocket连接状态
    const removeListener = addWsStatusListener((status) => {
      console.log('[ChatPage] WebSocket连接状态变化:', status);
      // 额外输出更详细的连接信息
      console.log('[ChatPage] WebSocket调试信息:', {
        连接状态: status,
        会话₄D: sessionId,
        首选语言: preferredLanguage,
        自动翻译: autoTranslate
      });
      setWsStatus(status);
    });
    
    // 清理函数
    return () => {
      // 移除监听器
      removeListener();
      // WebSocket连接会在initWebSocketConnection内部自动关闭
      console.log('清理WebSocket连接...');
    };
  }, [sessionId, preferredLanguage]); // 当sessionId或preferredLanguage变化时重新连接
  
  // Send message handler
  const handleSendMessage = async (content: string) => {
    if (!sessionId || !hostInfo) {
      console.error('Cannot send message: sessionId or hostInfo is missing');
      console.log('sessionId:', sessionId);
      console.log('hostInfo:', hostInfo);
      return;
    }
    
    try {
      console.log('Trying to send message with sessionId:', sessionId);
      console.log('And content:', content);
      console.log('User preferred language:', preferredLanguage);
      
      // 尝试修复可能的格式问题
      const safeSessionId = sessionId.toString().trim();
      
      try {
        // 首先尝试标准方法，传递首选语言
        console.log('Attempting to send message via standard API');
        // 将用户的首选语言传递给sendMessage函数
        const result = await sendMessage(safeSessionId, content, false, preferredLanguage);
        console.log('Message sent successfully via standard API');
        
        // 不再手动更新UI，消息会通过订阅或轮询自动添加
        // 仅在调试时记录结果
        if (result) {
          console.log('Message sent successfully and will be added via subscription');
        }
      } catch (sendError) {
        console.error('Standard API failed for sending message, trying direct SQL:', sendError);
        
        // 使用直接SQL方法
        const newMessage = await sendMessageDirectSql(safeSessionId, content, false, preferredLanguage);
        console.log('Message sent successfully via direct SQL');
        
        // 不再手动更新UI，消息会通过订阅或轮询自动添加
        // 仅在调试时记录结果
        if (newMessage) {
          console.log('Message sent successfully via SQL and will be added via subscription');
        } else {
          throw new Error('Failed to send message with both methods');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Message could not be sent. Please try again.",
      });
    }
  };

  // Default host info for loading state
  const defaultHost: HostInfo = {
    id: "loading",
    name: "Loading...",
    title: "Online Chat",
    url: "qrchat.com",
    avatarUrl: "",
  };

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* 头部固定 */}
      <div className="flex-none">
        <ChatHeader hostInfo={hostInfo || defaultHost} />
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        </div>
      ) : (
        <>
          {/* 消息列表区域 - 自动填充空间并可滚动 */}
          <div className="flex-1 overflow-y-auto pb-16 bg-white">
            {hostInfo && <MessageList messages={messages} hostInfo={hostInfo} />}
          </div>
          
          {/* 输入框固定在底部，增加z-index确保始终可见 */}
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 shadow-lg">
            <MessageInput onSendMessage={handleSendMessage} />
          </div>
        </>
      )}
    </div>
  );
}