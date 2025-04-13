import React from 'react';
import { Link } from 'wouter';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      <div className="text-9xl font-bold text-gray-200">404</div>
      <h1 className="text-2xl font-semibold mt-4 mb-2">页面未找到</h1>
      <p className="text-gray-600 mb-8">您访问的页面不存在或已被移除</p>
      <Link href="/">
        <a className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          返回首页
        </a>
      </Link>
    </div>
  );
};

export default NotFoundPage;