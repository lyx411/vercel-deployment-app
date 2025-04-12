import { HostInfo } from '@shared/schema';

interface ChatHeaderProps {
  hostInfo: HostInfo;
}

export function ChatHeader({ hostInfo }: ChatHeaderProps) {
  return (
    <div className="py-3 px-4 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white shadow-sm w-full">
      <div className="flex items-center justify-start">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-gray-200 flex-shrink-0 flex items-center justify-center">
            {hostInfo.avatarUrl ? (
              <img 
                src={hostInfo.avatarUrl}
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white text-[#4285F4] flex items-center justify-center text-lg font-bold">
                {hostInfo.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div>
            <div className="font-medium text-xl text-white">{hostInfo.name}</div>
            {hostInfo.title && (
              <div className="text-sm text-white">
                {hostInfo.title}
              </div>
            )}
          </div>
        </div>
        
        {hostInfo.url && (
          <div className="ml-auto">
            <a 
              href={`https://${hostInfo.url.replace(/^https?:\/\//, '')}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="border border-white text-white text-sm hover:bg-white/10 rounded-full px-5 py-2 transition-colors"
            >
              <span>保存二维码</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
