import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  userLanguage: string;
  setUserLanguage: (language: string) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  userLanguage: 'zh-CN',
  setUserLanguage: () => {},
  isLoading: false
});

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [userLanguage, setUserLanguage] = useState('zh-CN');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 获取浏览器语言
    const detectLanguage = () => {
      const savedLanguage = localStorage.getItem('userLanguage');
      
      if (savedLanguage) {
        setUserLanguage(savedLanguage);
      } else {
        // 使用浏览器首选语言
        const browserLanguage = navigator.language;
        // 如果是中文或英文，直接使用，否则默认使用英文
        if (browserLanguage.startsWith('zh')) {
          setUserLanguage('zh-CN');
        } else {
          setUserLanguage('en');
        }
      }
      
      setIsLoading(false);
    };

    detectLanguage();
  }, []);

  // 设置用户语言偏好
  const handleSetLanguage = (language: string) => {
    setUserLanguage(language);
    localStorage.setItem('userLanguage', language);
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        userLanguage, 
        setUserLanguage: handleSetLanguage,
        isLoading
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

// 自定义Hook
export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;