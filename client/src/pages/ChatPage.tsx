import React, { useEffect, useState } from 'react';
import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import {
  initSupabase,
  initWebSocketConnection,
  getOrCreateChatSession,
  getChatMessages,
  sendMessage,
  subscribeToMessages
} from '../lib/supabase';

type Message = {
  id: string;
  content: string;
  translated_content?: string | null;
  role: 'user' | 'host';
  created_at: string;
  session_id: string;
};

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [userLanguage, setUserLanguage] = useState('zh-CN');

  useEffect(() => {
    // 页面加载时初始化所需的资源
    const initChat = async () => {
      // 初始化 Supabase 客户端
      initSupabase();

      // 初始化 WebSocket 连接
      initWebSocketConnection(userLanguage);

      // 获取或创建聊天会话
      const { sessionId } = await getOrCreateChatSession();
      setSessionId(sessionId);

      // 获取历史消息
      const chatMessages = await getChatMessages(sessionId);
      setMessages(chatMessages);

      // 订阅新消息
      subscribeToMessages(sessionId, (newMessage) => {
        setMessages((prev) => {
          // 避免重复消息
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      });

      setIsLoading(false);

      // 发送欢迎消息
      if (chatMessages.length === 0) {
        sendMessage('您好！这是一个使用WebSocket进行实时翻译的聊天演示。您可以用中文发送消息，客服回复后会自动翻译。', sessionId, 'host');
      }
    };

    initChat();
  }, []);

  // 切换语言时重新初始化WebSocket连接
  useEffect(() => {
    initWebSocketConnection(userLanguage);
  }, [userLanguage]);

  // 发送用户消息
  const handleSendMessage = async (content: string) => {
    if (!sessionId) return;

    // 添加用户消息
    const userMessage = await sendMessage(content, sessionId, 'user');
    
    // 模拟客服回复
    setTimeout(async () => {
      const response = `我收到了您的消息: "${content}". 这是一个测试回复，会被自动翻译。`;
      await sendMessage(response, sessionId, 'host');
    }, 1000);
  };

  // 语言切换处理
  const handleLanguageChange = (language: string) => {
    setUserLanguage(language);
  };

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader 
        onLanguageChange={handleLanguageChange}
        selectedLanguage={userLanguage}
      />
      <MessageList messages={messages} loading={isLoading} />
      <MessageInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading || !sessionId}
      />
    </div>
  );
};

export default ChatPage;