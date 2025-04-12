import React, { createContext, useContext, useState, useEffect } from 'react';

// 支持的语言列表
export const SUPPORTED_LANGUAGES = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ru: "Русский",
  pt: "Português",
  ar: "العربية",
  hi: "हिन्दी",
  auto: "Auto Detect"
};

// 语言代码类型
export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// 语言上下文类型
interface LanguageContextType {
  preferredLanguage: LanguageCode;
  setPreferredLanguage: (lang: LanguageCode) => void;
  toggleMessageTranslation: (messageId: number) => void;
  translatedMessageIds: Set<number>;
  autoTranslate: boolean;
  setAutoTranslate: (auto: boolean) => void;
}

// 创建上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 自定义钩子，用于在组件中使用语言上下文
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// 语言提供者组件
export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // 尝试从本地存储加载首选语言，默认为中文(测试用)
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('zh');
  // 默认为用户系统/浏览器语言，初始设为中文(测试用)，稍后会根据浏览器语言自动检测
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>('zh');
  // 自动翻译设置，默认为开启状态
  const [autoTranslate, setAutoTranslate] = useState<boolean>(true);
  // 已经翻译的消息ID集合
  const [translatedMessageIds, setTranslatedMessageIds] = useState<Set<number>>(new Set());

  // 检测浏览器语言
  useEffect(() => {
    try {
      // 获取浏览器首选语言
      const browserLang = navigator.language.split('-')[0] as LanguageCode;
      
      // 检查是否支持该语言，如果不支持则使用默认语言(英语)
      if (browserLang && SUPPORTED_LANGUAGES[browserLang]) {
        setDetectedLanguage(browserLang);
        console.log('检测到浏览器语言:', browserLang);
      } else {
        setDetectedLanguage('en');
        console.log('浏览器语言不受支持，使用默认语言(英语)');
      }
    } catch (error) {
      console.error('检测浏览器语言时出错:', error);
    }
  }, []);

  // 在组件挂载时从本地存储加载设置
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('preferredLanguage') as LanguageCode;
      const savedAutoTranslate = localStorage.getItem('autoTranslate');
      
      if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
        setPreferredLanguage(savedLanguage);
      } else {
        // 如果没有保存的语言设置，则使用检测到的浏览器语言
        setPreferredLanguage(detectedLanguage);
      }
      
      if (savedAutoTranslate) {
        setAutoTranslate(savedAutoTranslate === 'true');
      }
    } catch (error) {
      console.error('从本地存储加载语言设置时出错:', error);
    }
  }, [detectedLanguage]);

  // 当首选语言改变时保存到本地存储
  useEffect(() => {
    try {
      localStorage.setItem('preferredLanguage', preferredLanguage);
    } catch (error) {
      console.error('Error saving language preference to localStorage:', error);
    }
  }, [preferredLanguage]);

  // 当自动翻译设置改变时保存到本地存储
  useEffect(() => {
    try {
      localStorage.setItem('autoTranslate', autoTranslate.toString());
    } catch (error) {
      console.error('Error saving autoTranslate setting to localStorage:', error);
    }
  }, [autoTranslate]);

  // 切换特定消息的翻译状态
  const toggleMessageTranslation = (messageId: number) => {
    setTranslatedMessageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // 提供上下文值
  const value = {
    preferredLanguage,
    setPreferredLanguage,
    toggleMessageTranslation,
    translatedMessageIds,
    autoTranslate,
    setAutoTranslate
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};