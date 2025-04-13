import React, { useEffect, useState } from 'react';
import { registerTranslationCallback, unregisterTranslationCallback } from '../lib/supabase';

interface TranslatableMessageProps {
  id: string;
  content: string;
  translatedContent?: string | null;
  role: 'user' | 'host';
  createdAt: string;
}

export const TranslatableMessage: React.FC<TranslatableMessageProps> = ({
  id,
  content,
  translatedContent,
  role,
  createdAt
}) => {
  const [currentTranslation, setCurrentTranslation] = useState<string | null>(translatedContent || null);
  const [translationStatus, setTranslationStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    translatedContent ? 'done' : 'idle'
  );

  // 当翻译完成时的回调函数
  const translationCallback = (result: string) => {
    console.log(`Translation callback triggered for message ${id} with result:`, result);
    setCurrentTranslation(result);
    setTranslationStatus('done');
  };

  // 注册和取消注册翻译回调
  useEffect(() => {
    // 只为客服消息注册翻译回调
    if (role === 'host') {
      console.log(`Registering translation callback for message ${id}`);
      registerTranslationCallback(id, translationCallback);

      // 如果已有翻译结果则立即设置
      if (translatedContent) {
        setCurrentTranslation(translatedContent);
        setTranslationStatus('done');
      } else {
        setTranslationStatus('loading');
      }

      // 组件卸载时取消注册
      return () => {
        console.log(`Unregistering translation callback for message ${id}`);
        unregisterTranslationCallback(id);
      };
    }
  }, [id, role, translatedContent]);

  // 优先显示翻译后的内容（对于host消息）
  const displayContent = role === 'host' && currentTranslation ? currentTranslation : content;

  // 翻译中的指示器
  const renderTranslationIndicator = () => {
    if (role !== 'host' || translationStatus !== 'loading') return null;
    
    return (
      <div className="mt-1 text-xs text-gray-400 flex items-center">
        <span className="mr-1">正在翻译</span>
        <div className="flex space-x-1">
          <div className="bg-gray-300 rounded-full h-1 w-1 animate-pulse"></div>
          <div className="bg-gray-300 rounded-full h-1 w-1 animate-pulse delay-100"></div>
          <div className="bg-gray-300 rounded-full h-1 w-1 animate-pulse delay-200"></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="text-sm">{displayContent}</div>
      {renderTranslationIndicator()}
    </div>
  );
};