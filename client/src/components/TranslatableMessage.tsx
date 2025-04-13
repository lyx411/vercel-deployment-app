import React, { useEffect, useState } from 'react';
import { ChatMessage, HostInfo } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe, Languages } from 'lucide-react';
import { registerTranslationCallback, unregisterTranslationCallback } from '@/lib/supabase';

interface TranslatableMessageProps {
  message: ChatMessage;
  hostInfo?: HostInfo;
}

export function TranslatableMessage({ message, hostInfo }: TranslatableMessageProps) {
  const { 
    translatedMessageIds, 
    toggleMessageTranslation, 
    autoTranslate,
    preferredLanguage
  } = useLanguage();
  
  // 增加本地state来跟踪翻译内容
  const [localTranslatedContent, setLocalTranslatedContent] = useState<string | null>(message.translated_content);
  
  // 使用useEffect监听message的变化，特别是翻译状态的变化
  useEffect(() => {
    // 当翻译完成时，立即更新本地状态
    if (message.translation_status === 'completed' && message.translated_content) {
      setLocalTranslatedContent(message.translated_content);
      console.log(`消息ID ${message.id} 翻译已更新并立即显示:`, message.translated_content);
    }
  }, [message.translation_status, message.translated_content, message.id]);
  
  // 注册翻译回调，当翻译完成时立即更新内容
  useEffect(() => {
    // 创建回调函数
    const handleTranslationCompleted = (translatedContent: string) => {
      console.log(`[回调] 消息ID ${message.id} 翻译完成，立即更新:`, translatedContent);
      setLocalTranslatedContent(translatedContent);
    };
    
    // 注册回调
    registerTranslationCallback(message.id, handleTranslationCompleted);
    
    // 组件卸载时清理回调
    return () => {
      unregisterTranslationCallback(message.id, handleTranslationCompleted);
    };
  }, [message.id]); // 只在消息ID变化时重新注册
  
  // 是否是机器人/主机发送的消息
  const isHostMessage = message.sender === 'host';
  
  // 是否是客人发送的消息
  const isGuestMessage = message.sender === 'guest';
  
  // 判断是否显示翻译版本 - 应用自动翻译逻辑
  // 只有主机消息需要翻译到客人语言，客人消息不需要翻译
  const showTranslated = isHostMessage && autoTranslate;
  
  // 判断消息是否有翻译内容和翻译是否完成
  const hasTranslation = !!(localTranslatedContent || message.translated_content) && message.translation_status === 'completed';
  
  // 添加更详细的调试日志
  console.log(`[TranslatableMessage] 消息ID ${message.id}:`, {
    消息内容: message.content,
    是主机消息: isHostMessage,
    显示翻译: showTranslated,
    有翻译: hasTranslation,
    自动翻译开启: autoTranslate,
    首选语言: preferredLanguage,
    翻译内容: localTranslatedContent || message.translated_content,
    翻译状态: message.translation_status,
    翻译集合包含: translatedMessageIds.has(message.id),
    原始语言: message.original_language
  });
  
  // 根据要求，在需要显示翻译时，翻译未完成前不显示任何内容
  let displayContent = null;
  if (isHostMessage && showTranslated) {
    // 主机消息需要翻译
    if (hasTranslation) {
      // 翻译完成，显示翻译结果，优先使用本地状态中的翻译内容
      displayContent = localTranslatedContent || message.translated_content;
    }
    // 如果翻译未完成，displayContent保持为null，不显示任何内容
  } else {
    // 不需要翻译的消息（客人消息或不需要翻译的主机消息），显示原文
    displayContent = message.content;
  }

  return (
    <div className="relative group">
      {/* 消息内容 - 只有当displayContent不是null时才显示 */}
      {displayContent !== null && (
        <div key={`message-${message.id}-${message.translation_status}-${!!localTranslatedContent}`} className="whitespace-pre-wrap">{displayContent}</div>
      )}
    </div>
  );
}