import React from 'react';
import { SUPPORTED_LANGUAGES, useLanguage, LanguageCode } from '@/contexts/LanguageContext';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function LanguageSelector() {
  const { 
    preferredLanguage, 
    setPreferredLanguage,
    autoTranslate,
    setAutoTranslate 
  } = useLanguage();

  const handleLanguageChange = (lang: LanguageCode) => {
    setPreferredLanguage(lang);
  };

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline-block">{SUPPORTED_LANGUAGES[preferredLanguage]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>选择语言 / Language</DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code as LanguageCode)}
              className="flex items-center justify-between"
            >
              <span>{name}</span>
              {code === preferredLanguage && <Check className="h-4 w-4 ml-2" />}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <div className="p-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-translate" 
                checked={autoTranslate}
                onCheckedChange={setAutoTranslate}
              />
              <Label htmlFor="auto-translate" className="text-sm">
                自动翻译全部消息
              </Label>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}