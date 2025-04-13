import React, { useEffect, useState } from 'react';

interface StatusIndicatorProps {
  serviceUrl?: string;
  pollingInterval?: number;
  onStatusChange?: (isOnline: boolean) => void;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  serviceUrl = '/api/vercel-bridge',
  pollingInterval = 30000,
  onStatusChange
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const response = await fetch(serviceUrl);
      if (!response.ok) {
        throw new Error(`服务响应异常: ${response.status}`);
      }
      const data = await response.json();
      setIsOnline(data.status === 'online');
      setLastChecked(new Date().toLocaleTimeString());
      setError(null);
      if (onStatusChange) {
        onStatusChange(data.status === 'online');
      }
    } catch (err) {
      setIsOnline(false);
      setError(err instanceof Error ? err.message : '未知错误');
      setLastChecked(new Date().toLocaleTimeString());
      if (onStatusChange) {
        onStatusChange(false);
      }
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, pollingInterval);
    return () => clearInterval(interval);
  }, [serviceUrl, pollingInterval]);

  return (
    <div className="flex flex-col items-start p-3 border rounded-md bg-gray-50">
      <div className="flex items-center space-x-2">
        <div 
          className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
          title={isOnline ? '服务在线' : '服务离线'} 
        />
        <span className="font-medium">
          {isOnline ? '服务状态: 在线' : '服务状态: 离线'}
        </span>
      </div>
      
      {error && (
        <div className="mt-1 text-xs text-red-500">
          错误: {error}
        </div>
      )}
      
      <div className="mt-1 text-xs text-gray-500">
        最后检查: {lastChecked || '未检查'}
      </div>
      
      <button 
        onClick={checkStatus}
        className="mt-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        刷新状态
      </button>
    </div>
  );
};

export default StatusIndicator;