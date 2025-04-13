import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模拟从本地存储加载用户
    const loadUser = async () => {
      setLoading(true);
      try {
        // 从本地存储获取用户信息
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('加载用户失败:', err);
        setError('加载用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // 登录函数
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // 模拟API登录请求
      // 实际使用时替换为真实的API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = {
        id: 'user123',
        name: '测试用户',
        email: email
      };
      
      // 保存到本地存储
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (err) {
      console.error('登录失败:', err);
      setError('登录失败，请检查您的凭据');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义Hook
export const useAuth = () => useContext(AuthContext);

export default AuthContext;