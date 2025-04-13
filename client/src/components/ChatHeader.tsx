import React from 'react';
import { LanguageSelector } from './LanguageSelector';

interface ChatHeaderProps {
  title?: string;
  onLanguageChange: (language: string) => void;
  selectedLanguage: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = '聊天助手',
  onLanguageChange,
  selectedLanguage
}) => {
  return (
    <div className="border-b border-gray-200 p-4 flex justify-between items-center bg-white shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 rounded-full h-10 w-10 flex items-center justify-center bg-blue-100 text-blue-600">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        </div>
        <h2 className="font-semibold text-lg">{title}</h2>
      </div>
      <LanguageSelector 
        onLanguageChange={onLanguageChange}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};