import { useEffect, useState } from 'react';
import { ChatMessage } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranslatableMessageProps {
  message: ChatMessage;
}

export function TranslatableMessage({ message }: TranslatableMessageProps) {
  const { preferredLanguage, translatedMessageIds, autoTranslate } = useLanguage();
  const [translatedContent, setTranslatedContent] = useState<string | null>(message.translated_content || null);
  const [translationStatus, setTranslationStatus] = useState<string>(message.translation_status || 'pending');

  // 注册回调以接收翻译更新
  useEffect(() => {
    const updateTranslation = (translation: string) => {
      console.log(`TranslatableMessage: 收到消息 ${message.id} 的翻译更新`, translation);
      setTranslatedContent(translation);
      setTranslationStatus('completed');
    };

    const registerCallback = async () => {
      if (message.sender === 'host' && preferredLanguage !== 'auto') {
        try {
          // 动态导入翻译功能
          const { registerTranslationCallback, unregisterTranslationCallback } = await import('@/lib/supabase');
          
          // 注册回调
          console.log(`为消息 ${message.id} 注册翻译回调...`);
          registerTranslationCallback(message.id, updateTranslation);
          
          return () => {
            // 当组件卸载时取消注册
            console.log(`为消息 ${message.id} 取消注册翻译回调...`);
            unregisterTranslationCallback(message.id);
          };
        } catch (error) {
          console.error('注册翻译回调时出错:', error);
        }
      }
    };

    registerCallback();
  }, [message.id, preferredLanguage]);

  // 根据消息属性和用户设置决定显示原始内容还是翻译内容
  const shouldShowTranslation = () => {
    // 如果消息是自己发送的，则始终显示原始内容
    if (message.sender === 'user') return false;
    
    // 如果首选语言是自动检测，则显示原始内容
    if (preferredLanguage === 'auto') return false;
    
    // 如果有翻译内容且翻译已完成，则根据首选项显示
    if (translatedContent && translationStatus === 'completed') {
      // 返回是否自动翻译（如果没有特定为此消息设置翻译状态）
      return autoTranslate || translatedMessageIds.has(message.id);
    }
    
    // 默认使用原始内容
    return false;
  };

  // 显示加载指示器或错误状态
  const renderTranslationStatus = () => {
    if (!translatedContent && translationStatus === 'pending' && message.sender === 'host' && preferredLanguage !== 'auto') {
      return <div className="text-xs italic text-blue-500 mt-1">翻译中...</div>;
    }
    
    if (translationStatus === 'error') {
      return <div className="text-xs italic text-red-500 mt-1">翻译失败</div>;
    }
    
    return null;
  };

  const displayContent = shouldShowTranslation() && translatedContent ? translatedContent : message.content;

  return (
    <div>
      <div>
        {displayContent}
      </div>
      {renderTranslationStatus()}
    </div>
  );
}
