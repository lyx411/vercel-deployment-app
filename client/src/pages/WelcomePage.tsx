import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const [urlParams, setUrlParams] = useState<URLSearchParams>(new URLSearchParams());

  useEffect(() => {
    // 获取URL中的参数
    const params = new URLSearchParams(window.location.search);
    setUrlParams(params);
  }, []);

  const handleEnterChat = () => {
    // 跳转到语言选择页面，保留所有URL参数
    const newLocation = `/language-selection?${urlParams.toString()}`;
    setLocation(newLocation);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-md mt-12 text-center">
        <h1 className="text-2xl font-bold mb-2">欢迎使用QRChat</h1>
        <p className="text-gray-600 mb-8">多语言实时沟通</p>
        
        <div className="w-full h-64 mx-auto mb-8 bg-white rounded-lg shadow-md flex items-center justify-center">
          <img 
            src="/qrcode-placeholder.svg" 
            alt="QR Code" 
            className="h-48 w-48 object-contain"
            onError={(e) => {
              // 如果图片加载失败，显示替代内容
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="text-gray-400">扫描QR码开始聊天</div>';
            }}
          />
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <button
          onClick={handleEnterChat}
          className="w-full bg-[#4285F4] hover:bg-[#3367d6] text-white py-3 rounded-full flex items-center justify-center"
        >
          <span>进入聊天</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}