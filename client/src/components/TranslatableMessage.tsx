import React, { useEffect, useState } from 'react';
import { ChatMessage, HostInfo } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe, Languages } from 'lucide-react';

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
  
  // 根据要求，在需要显示翻译时，不显示原文只显示翻译后的内容或什么都不显示
  let displayContent;
  if (isHostMessage && showTranslated) {
    // 主机消息需要翻译
    if (hasTranslation) {
      // 翻译完成，显示翻译结果
      displayContent = localTranslatedContent || message.translated_content;
    } else if (message.translation_status === 'pending') {
      // 翻译中，显示原始内容，避免出现空气泡
      displayContent = message.content;
    } else {
      // 翻译失败或未开始翻译，显示原文
      displayContent = message.content;
    }
  } else {
    // 不需要翻译的消息，显示原文
    displayContent = message.content;
  }

  return (
    <div className="relative group">
      {/* 消息内容 - 只有当displayContent不是null时才显示 */}
      {displayContent !== null && (
        <div key={`message-${message.id}-${message.translation_status}`} className="whitespace-pre-wrap">{displayContent}</div>
      )}
      
      {/* 根据需求，移除翻译中的提示，不显示任何状态指示器 */}
    </div>
  );
}