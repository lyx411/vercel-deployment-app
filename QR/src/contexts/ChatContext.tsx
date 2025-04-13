import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// 聊天会话类型
interface ChatSession {
  id: string;
  hostId: string;
  hostName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  participants?: string[];
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  loading: boolean;
  error: string | null;
  getChatSession: (sessionId: string) => ChatSession | null;
  createChatSession: (hostId: string, hostName: string) => Promise<ChatSession>;
  joinChatSession: (sessionId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  sessions: [],
  activeSession: null,
  loading: false,
  error: null,
  getChatSession: () => null,
  createChatSession: async () => ({ id: '', hostId: '', hostName: '' }),
  joinChatSession: async () => {},
});

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 模拟获取用户的聊天会话
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟会话数据
        const mockSessions: ChatSession[] = [
          {
            id: 'session1',
            hostId: user.id,
            hostName: user.name,
            lastMessage: '您好，有什么可以帮助您的？',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
          },
          {
            id: 'session2',
            hostId: 'host123',
            hostName: '客服助手',
            lastMessage: '感谢您的咨询！',
            lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
            unreadCount: 2,
          }
        ];
        
        setSessions(mockSessions);
      } catch (err) {
        console.error('获取聊天会话失败:', err);
        setError('获取聊天会话失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [user]);

  // 获取特定聊天会话
  const getChatSession = (sessionId: string): ChatSession | null => {
    return sessions.find(session => session.id === sessionId) || null;
  };

  // 创建新的聊天会话
  const createChatSession = async (hostId: string, hostName: string): Promise<ChatSession> => {
    setLoading(true);
    setError(null);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newSession: ChatSession = {
        id: `session_${Date.now()}`,
        hostId,
        hostName,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
      
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (err) {
      console.error('创建聊天会话失败:', err);
      setError('创建聊天会话失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 加入现有聊天会话
  const joinChatSession = async (sessionId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const session = getChatSession(sessionId);
      if (!session) {
        throw new Error('聊天会话不存在');
      }
      
      setActiveSession(session);
    } catch (err) {
      console.error('加入聊天会话失败:', err);
      setError('加入聊天会话失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSession,
        loading,
        error,
        getChatSession,
        createChatSession,
        joinChatSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// 自定义Hook
export const useChat = () => useContext(ChatContext);

export default ChatContext;