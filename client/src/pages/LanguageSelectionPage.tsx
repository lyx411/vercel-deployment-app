import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useLanguage, LanguageCode, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';

export default function LanguageSelectionPage() {
  const [location, setLocation] = useLocation();
  const { preferredLanguage, setPreferredLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(preferredLanguage);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Parse URL parameters to preserve them when redirecting
  const [urlParams, setUrlParams] = useState<URLSearchParams>(new URLSearchParams());

  useEffect(() => {
    // 获取URL中的参数
    const params = new URLSearchParams(window.location.search);
    setUrlParams(params);
  }, [location]);

  const handleContinue = () => {
    // 设置选择的语言
    setPreferredLanguage(selectedLanguage);
    
    // 跳转到聊天页面，保留所有URL参数
    const newLocation = `/chat?${urlParams.toString()}`;
    setLocation(newLocation);
  };

  return (
    <div className="fixed inset-0 bg-[#1a1a1a]/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#4285F4] to-[#A56FFF] text-white p-3 flex items-center justify-between">
          <h2 className="text-center flex-1">
            {preferredLanguage === 'zh' && '语言设置'}
            {preferredLanguage === 'en' && 'Language Settings'}
            {preferredLanguage === 'ja' && '言語設定'}
            {preferredLanguage === 'ko' && '언어 설정'}
            {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Language Settings'}
          </h2>
          <button onClick={handleContinue} className="text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center mb-4">
            <h3 className="font-medium">
              {preferredLanguage === 'zh' && '您偏好的语言'}
              {preferredLanguage === 'en' && 'Your Preferred Language'}
              {preferredLanguage === 'ja' && 'あなたの優先言語'}
              {preferredLanguage === 'ko' && '선호하는 언어'}
              {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Your Preferred Language'}
            </h3>
            <div className="text-lg font-bold">
              {SUPPORTED_LANGUAGES[preferredLanguage]} {preferredLanguage === 'zh' && '(中文)'}
              {preferredLanguage === 'en' && '(English)'}
              {preferredLanguage === 'ja' && '(日本語)'}
              {preferredLanguage === 'ko' && '(한국어)'}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {preferredLanguage === 'zh' && '系统已自动检测您的浏览器语言'}
              {preferredLanguage === 'en' && 'System has automatically detected your browser language'}
              {preferredLanguage === 'ja' && 'システムは自動的にブラウザの言語を検出しました'}
              {preferredLanguage === 'ko' && '시스템이 자동으로 브라우저 언어를 감지했습니다'}
              {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'System has automatically detected your browser language'}
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">
              {preferredLanguage === 'zh' && '您可以选择其他的语言'}
              {preferredLanguage === 'en' && 'You can choose another language'}
              {preferredLanguage === 'ja' && '他の言語を選択できます'}
              {preferredLanguage === 'ko' && '다른 언어를 선택할 수 있습니다'}
              {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'You can choose another language'}
            </p>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-3 border rounded-md flex items-center justify-between text-left"
              >
                <span>{SUPPORTED_LANGUAGES[selectedLanguage]}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <div
                      key={code}
                      className={`p-3 cursor-pointer hover:bg-gray-100 ${
                        code === selectedLanguage ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                      onClick={() => {
                        setSelectedLanguage(code as LanguageCode);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {code === selectedLanguage && (
                        <span className="mr-2 text-blue-600">✓</span>
                      )}
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 mb-4">
            {preferredLanguage === 'zh' && '所有语言都将被翻译成您选择的语言显示'}
            {preferredLanguage === 'en' && 'All messages will be translated into your chosen language'}
            {preferredLanguage === 'ja' && 'すべてのメッセージは選択した言語に翻訳されます'}
            {preferredLanguage === 'ko' && '모든 메시지는 선택한 언어로 번역됩니다'}
            {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'All messages will be translated into your chosen language'}
          </div>
          
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-[#4285F4] to-[#4285F4] hover:from-[#3b78e7] hover:to-[#3b78e7] text-white py-3 px-4 rounded-full flex items-center justify-center gap-2"
          >
            {preferredLanguage === 'zh' && '确认'}
            {preferredLanguage === 'en' && 'Confirm'}
            {preferredLanguage === 'ja' && '確認'}
            {preferredLanguage === 'ko' && '확인'}
            {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Confirm'}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}