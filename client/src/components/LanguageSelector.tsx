import { useState } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { preferredLanguage, setPreferredLanguage, autoTranslate, setAutoTranslate } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectLanguage = (code: LanguageCode) => {
    setPreferredLanguage(code);
    setIsOpen(false);
  };

  const toggleAutoTranslate = () => {
    setAutoTranslate(!autoTranslate);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">
          {SUPPORTED_LANGUAGES[preferredLanguage]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20">
          <div className="p-2">
            <p className="text-xs text-gray-500 mb-2">
              {preferredLanguage === 'zh' && '选择语言'}
              {preferredLanguage === 'en' && 'Select language'}
              {preferredLanguage === 'ja' && '言語を選択'}
              {preferredLanguage === 'ko' && '언어 선택'}
              {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Select language'}
            </p>
            
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => selectLanguage(code as LanguageCode)}
                  className={`text-sm w-full text-left px-2 py-1 rounded ${preferredLanguage === code ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t">
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoTranslate}
                  onChange={toggleAutoTranslate}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  {preferredLanguage === 'zh' && '自动翻译'}
                  {preferredLanguage === 'en' && 'Auto translate'}
                  {preferredLanguage === 'ja' && '自動翻訳'}
                  {preferredLanguage === 'ko' && '자동 번역'}
                  {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Auto translate'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
