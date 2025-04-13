import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Languages } from 'lucide-react';

interface ChatHeaderProps {
  merchantName?: string;
  avatarUrl?: string;
  targetLanguage?: string;
  isTranslationEnabled: boolean;
  onToggleTranslation: () => void;
}

export default function ChatHeader({
  merchantName = '在线客服',
  avatarUrl = 'https://ui-avatars.com/api/?name=CS',
  targetLanguage,
  isTranslationEnabled,
  onToggleTranslation
}: ChatHeaderProps) {
  // 使用语言上下文
  const { preferredLanguage } = useLanguage();
  
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={merchantName} />
          <AvatarFallback>{merchantName.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold">{merchantName}</h2>
          <p className="text-sm text-muted-foreground">
            {isTranslationEnabled
              ? `翻译已开启 (${preferredLanguage} → ${targetLanguage || '自动'})`
              : '点击开启翻译功能'}
          </p>
        </div>
      </div>
      
      <Button
        variant={isTranslationEnabled ? "default" : "outline"}
        size="icon"
        onClick={onToggleTranslation}
        title={isTranslationEnabled ? "关闭翻译" : "开启翻译"}
        aria-label={isTranslationEnabled ? "关闭翻译" : "开启翻译"}
      >
        <Languages className={`h-5 w-5 ${isTranslationEnabled ? 'text-white' : ''}`} />
      </Button>
    </div>
  );
}