import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// 定义语言上下文类型
interface LanguageContextType {
  userLanguage: string;
  setUserLanguage: (language: string) => void;
  detectBrowserLanguage: () => string;
}

// 创建语言上下文
const LanguageContext = createContext<LanguageContextType | null>(null);

// 语言提供者组件
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 获取浏览器语言
  const detectBrowserLanguage = (): string => {
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) {
      return 'zh-CN';
    } else if (browserLang.startsWith('en')) {
      return 'en';
    } else if (browserLang.startsWith('es')) {
      return 'es';
    } else if (browserLang.startsWith('fr')) {
      return 'fr';
    } else if (browserLang.startsWith('de')) {
      return 'de';
    } else if (browserLang.startsWith('ja')) {
      return 'ja';
    } else if (browserLang.startsWith('ko')) {
      return 'ko';
    } else if (browserLang.startsWith('ar')) {
      return 'ar';
    } else if (browserLang.startsWith('hi')) {
      return 'hi';
    } else if (browserLang.startsWith('pt')) {
      return 'pt';
    }
    // 默认返回中文
    return 'zh-CN';
  };

  // 状态：用户选择的语言
  const [userLanguage, setUserLanguageState] = useState<string>(() => {
    // 尝试从本地存储获取语言设置
    const savedLang = localStorage.getItem('user-language');
    // 如果本地存储中有语言设置，使用它；否则，检测浏览器语言
    return savedLang || detectBrowserLanguage();
  });

  // 当语言变化时，保存到本地存储
  useEffect(() => {
    localStorage.setItem('user-language', userLanguage);
  }, [userLanguage]);

  // 设置语言的处理函数
  const setUserLanguage = (language: string) => {
    setUserLanguageState(language);
  };

  return (
    <LanguageContext.Provider value={{ userLanguage, setUserLanguage, detectBrowserLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// 使用语言上下文的自定义钩子
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};