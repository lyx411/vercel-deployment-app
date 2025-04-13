import React from 'react';
import ServiceMonitor from '../components/ServiceMonitor';

const StatusPage: React.FC = () => {
  const services = [
    {
      name: 'Vercel API 桥接',
      url: '/api/vercel-bridge',
      description: 'Vercel Serverless 函数状态检查'
    },
    {
      name: '主应用服务',
      url: '/',
      description: '前端应用程序状态'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">系统状态监控</h1>
      
      <ServiceMonitor services={services} />
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">系统信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded-md bg-white">
            <h3 className="font-medium">环境</h3>
            <p className="text-sm text-gray-600">{import.meta.env.MODE || '生产环境'}</p>
          </div>
          
          <div className="p-3 border rounded-md bg-white">
            <h3 className="font-medium">构建时间</h3>
            <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
          </div>
          
          <div className="p-3 border rounded-md bg-white">
            <h3 className="font-medium">浏览器</h3>
            <p className="text-sm text-gray-600">{navigator.userAgent}</p>
          </div>
          
          <div className="p-3 border rounded-md bg-white">
            <h3 className="font-medium">屏幕分辨率</h3>
            <p className="text-sm text-gray-600">{window.screen.width} x {window.screen.height}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <a 
          href="/" 
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  );
};

export default StatusPage;