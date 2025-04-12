import { useEffect, useRef } from 'react';
import { ChatMessage, HostInfo } from '@shared/schema';
import { TranslatableMessage } from './TranslatableMessage';

interface MessageListProps {
  messages: ChatMessage[];
  hostInfo: HostInfo;
}

export function MessageList({ messages, hostInfo }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    // Immediate scroll without animation for better reliability
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);
  
  // Ensure scroll to bottom on initial load
  useEffect(() => {
    // Use a small timeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="messages-container flex flex-col px-4 py-4 overflow-y-auto flex-grow h-full bg-white"
    >
      
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-32">
          还没有消息，发送第一条消息开始聊天吧！
        </div>
      )}
      
      {messages.map((message, index) => (
        <div 
          key={`${message.id}-${index}`}
          className={`mb-4 max-w-[80%] ${
            message.sender === 'guest' 
              ? 'self-end ml-auto' 
              : 'self-start mr-auto'
          }`}
        >
          {/* 主机(商家)消息 */}
          {message.sender === 'host' && (
            <div className="flex items-start mb-1">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2 bg-gray-200 flex-shrink-0">
                {hostInfo.avatarUrl ? (
                  <img 
                    src={hostInfo.avatarUrl}
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#4285F4] text-white flex items-center justify-center text-xs font-bold">
                    {hostInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="rounded-2xl p-3 bg-[#F0F7FF] text-black rounded-tl-none">
                <TranslatableMessage message={message} hostInfo={hostInfo} />
              </div>
            </div>
          )}
          
          {/* 客户(访客)消息 */}
          {message.sender === 'guest' && (
            <div className="rounded-2xl p-3 bg-[#FEE4D6] text-black rounded-br-none">
              <TranslatableMessage message={message} hostInfo={hostInfo} />
            </div>
          )}
        </div>
      ))}
      
      {/* Empty div for scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
