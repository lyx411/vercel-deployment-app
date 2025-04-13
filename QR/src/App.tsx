import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import QRCodePage from './pages/QRCodePage';
import ConnectPage from './pages/ConnectPage';
import './styles.css';

interface User {
  id: string;
  name: string;
}

// 创建上下文
export const AuthContext = React.createContext<{
  user: User | null;
  userLanguage: string;
  setUserLanguage: (lang: string) => void;
}>({
  user: null,
  userLanguage: 'zh-CN',
  setUserLanguage: () => {},
});

// 定义语言上下文提供程序
export const LanguageContext = React.createContext<{
  userLanguage: string;
  setUserLanguage: (lang: string) => void;
}>({
  userLanguage: 'zh-CN',
  setUserLanguage: () => {},
});

// 聊天上下文（简化版）
export const ChatContext = React.createContext<{}>({});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userLanguage, setUserLanguage] = useState('zh-CN');
  const [loading, setLoading] = useState(true);

  // 模拟用户登录
  useEffect(() => {
    // 模拟API调用
    setTimeout(() => {
      const mockUser = {
        id: 'user123',
        name: '测试用户',
      };
      setUser(mockUser);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return <div className="loading-container">加载中...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, userLanguage, setUserLanguage }}>
      <LanguageContext.Provider value={{ userLanguage, setUserLanguage }}>
        <ChatContext.Provider value={{}}>
          <Router>
            <Routes>
              <Route path="/qrcode/:sessionId?" element={<QRCodePage />} />
              <Route path="/connect/:sessionId" element={<ConnectPage />} />
              <Route path="/connect/user/:userId" element={<ConnectPage />} />
              <Route path="/" element={<Navigate to="/qrcode" replace />} />
            </Routes>
          </Router>
        </ChatContext.Provider>
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}

// 导出AuthContext的hook
export const useAuth = () => {
  return React.useContext(AuthContext);
};

// 导出LanguageContext的hook
export const useLanguage = () => {
  return React.useContext(LanguageContext);
};

// 导出ChatContext的hook
export const useChat = () => {
  return React.useContext(ChatContext);
};

export default App;