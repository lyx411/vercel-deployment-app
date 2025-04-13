import { HostInfo } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatHeaderProps {
  hostInfo: HostInfo;
}

export function ChatHeader({ hostInfo }: ChatHeaderProps) {
  const { preferredLanguage } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-[#4285F4] to-[#A56FFF] p-3 text-white flex items-center">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex-shrink-0 mr-3">
        {hostInfo.avatarUrl ? (
          <img 
            src={hostInfo.avatarUrl} 
            alt={`${hostInfo.name}'s avatar`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-700">
            {hostInfo.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <h2 className="font-medium">{hostInfo.name}</h2>
        <p className="text-xs text-white/80">
          {preferredLanguage === 'zh' && '在线客服'}
          {preferredLanguage === 'en' && 'Online Support'}
          {preferredLanguage === 'ja' && 'オンラインサポート'}
          {preferredLanguage === 'ko' && '온라인 지원'}
          {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Online Support'}
        </p>
      </div>
      
      <div className="flex-shrink-0">
        <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-1"></span>
        <span className="text-xs">
          {preferredLanguage === 'zh' && '在线'}
          {preferredLanguage === 'en' && 'Online'}
          {preferredLanguage === 'ja' && 'オンライン'}
          {preferredLanguage === 'ko' && '온라인'}
          {!['zh', 'en', 'ja', 'ko'].includes(preferredLanguage) && 'Online'}
        </span>
      </div>
    </div>
  );
}
