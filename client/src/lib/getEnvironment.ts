/**
 * 检测当前运行环境
 * @returns 当前运行环境类型：'cloudflare', 'vercel', 'localhost' or 'replit'
 */
export function detectEnvironment(): 'cloudflare' | 'vercel' | 'localhost' | 'replit' {
  const host = window.location.host;
  
  if (host.includes('.pages.dev') || host.includes('.workers.dev')) {
    return 'cloudflare';
  } else if (host.includes('.vercel.app')) {
    return 'vercel';
  } else if (host.includes('localhost')) {
    return 'localhost';
  } else if (host.includes('.replit.dev')) {
    return 'replit';
  }
  
  // 默认返回，假设是Vercel以确保在自定义域名下也能工作
  return 'vercel';
}

/**
 * 获取WebSocket URL
 * @returns 根据环境返回不同的WebSocket URL
 */
export function getWebSocketURL(): string {
  const environment = detectEnvironment();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  
  switch (environment) {
    case 'cloudflare':
      // Cloudflare Pages环境使用Edge Function
      return `wss://${supabaseUrl.replace('https://', '')}/functions/v1/websocket-translator`;
    case 'vercel':
      // Vercel环境使用Edge Function
      return `wss://${supabaseUrl.replace('https://', '')}/functions/v1/websocket-translator`;
    case 'localhost':
      // 本地开发使用本地WebSocket服务器
      return 'ws://localhost:5000/websocket';
    case 'replit':
      // Replit环境使用Replit WebSocket服务器
      return `wss://${window.location.host}/websocket`;
    default:
      // 默认使用Edge Function
      return `wss://${supabaseUrl.replace('https://', '')}/functions/v1/websocket-translator`;
  }
}