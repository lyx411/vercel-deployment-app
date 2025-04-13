/**
 * 获取当前运行环境的工具函数
 * 用于在不同的部署环境中选择正确的API端点、WebSocket URL等
 */

// 环境类型
export type Environment = 
  | 'development-local' // 本地开发环境
  | 'development-cloudflare' // Cloudflare Pages开发环境
  | 'production-vercel' // Vercel生产环境
  | 'production-cloudflare' // Cloudflare Pages生产环境
  | 'replit' // Replit环境
  | 'other'; // 其他未知环境

/**
 * 检测当前运行环境
 * @returns 当前环境类型
 */
export function detectEnvironment(): Environment {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // 检测是否在Cloudflare Pages上运行
  const isCloudflarePages = hostname.endsWith('.pages.dev');
  
  // 检测是否在Vercel上运行
  const isVercel = hostname.endsWith('.vercel.app');
  
  // 检测是否在Replit上运行
  const isReplit = hostname.endsWith('.repl.co') || hostname.includes('replit');

  // 根据孔域名判断环境
  if (isLocalhost) {
    return 'development-local';
  } else if (isCloudflarePages) {
    // 检测是否是开发环境或生产环境
    return hostname.includes('-') ? 'development-cloudflare' : 'production-cloudflare';
  } else if (isVercel) {
    return 'production-vercel';
  } else if (isReplit) {
    return 'replit';
  }
  
  return 'other';
}

/**
 * 获取API基础URL
 * @returns API基础URL
 */
export function getApiBaseUrl(): string {
  const env = detectEnvironment();
  
  switch (env) {
    case 'development-local':
      return 'http://localhost:3000/api';
    case 'development-cloudflare':
    case 'production-cloudflare':
    case 'production-vercel':
    case 'replit':
      // 在部署环境中使用相对URL
      return '/api';
    default:
      // 默认情况，尝试使用相对URL
      return '/api';
  }
}
