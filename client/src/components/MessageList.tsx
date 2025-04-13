import { useEffect, useRef } from 'react';
import { ChatMessage, HostInfo } from '@shared/schema';
import { TranslatableMessage } from './TranslatableMessage';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageListProps {
  messages: ChatMessage[];
  hostInfo: HostInfo;
}

export function MessageList({ messages, hostInfo }: MessageListProps) {
  const { preferredLanguage } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Format date to display in the chat
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Show date divider if messages are from different days
  const shouldShowDateDivider = (currentMsg: ChatMessage, prevMsg: ChatMessage | null) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    
    return currentDate !== prevDate;
  };

  // Format date for the divider
  const formatDateDivider = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat(preferredLanguage === 'auto' ? undefined : preferredLanguage, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-6">
          {preferredLanguage === 'zh' && '还没有消息，发送一条开始聊天吧！'}
          {preferredLanguage === 'en' && 'No messages yet. Send one to start the conversation!'}
          {preferredLanguage === 'ja' && 'まだメッセージはありません。会話を始めるにはメッセージを送信してください！'}
          {preferredLanguage === 'ko' && '아직 메시지가 없습니다. 대화를 시작하려면 메시지를 보내보세요!'}
          {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'No messages yet. Send one to start the conversation!'}
        </div>
      ) : (
        messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDateDivider = shouldShowDateDivider(message, prevMessage);
          
          return (
            <div key={message.id}>
              {showDateDivider && (
                <div className="my-4 text-center">
                  <div className="inline-block px-4 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">
                    {formatDateDivider(message.created_at)}
                  </div>
                </div>
              )}
              
              <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.sender === 'host' && (
                    <div className="flex items-center mb-1">
                      <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                        {hostInfo.avatarUrl ? (
                          <img 
                            src={hostInfo.avatarUrl} 
                            alt={hostInfo.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-xs">
                            {hostInfo.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">{hostInfo.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <div
                      className={`rounded-lg px-4 py-2 ${message.sender === 'user' ? 
                        'bg-blue-500 text-white rounded-br-none' : 
                        'bg-gray-100 text-gray-800 rounded-bl-none'}`}
                    >
                      <TranslatableMessage message={message} />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatMessageTime(message.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
