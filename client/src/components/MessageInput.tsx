import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="p-3 bg-white w-full border-t">
      <div className="flex items-center">
        <div className="flex-grow bg-gray-100 rounded-full flex items-center px-4 mr-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={handleKeyPress}
            className="flex-grow outline-none text-gray-700 py-3 bg-transparent"
            placeholder="输入信息..."
          />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="bg-[#5A97F4] text-white p-3 rounded-full hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12 h-12"
        >
          <Send className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
