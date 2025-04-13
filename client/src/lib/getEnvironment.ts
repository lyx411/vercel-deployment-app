/**
 * 检测当前运行环境
 * @returns 当前运行环境类型：'cloudflare', 'vercel', 'localhost' or 'replit'
 */
export function detectEnvironment(): 'cloudflare' | 'vercel' | 'localhost' | 'replit' | 'production' {
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
  
  // 默认返回production，表示可能是自定义域名部署
  return 'production';
}

/**
 * 获取WebSocket URL，优先使用本地代理以解决CORS限制
 * @returns 根据环境返回不同的WebSocket URL
 */
export function getWebSocketURL(): string {
  const environment = detectEnvironment();
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  
  switch (environment) {
    case 'cloudflare':
    case 'vercel':
    case 'production':
      // 在生产环境中使用本地代理
      return `${protocol}://${host}/ws/edge-proxy`;
    case 'localhost':
      // 本地开发使用本地WebSocket代理
      return `${protocol}://${host}/ws/translate`;
    case 'replit':
      // Replit环境使用代理
      return `${protocol}://${host}/ws/translate`;
    default:
      // 默认使用本地代理
      return `${protocol}://${host}/ws/edge-proxy`;
  }
}

/**
 * 获取API URL
 * @returns 根据环境返回不同的API URL
 */
export function getAPIURL(): string {
  const protocol = window.location.protocol;
  const host = window.location.host;
  
  return `${protocol}//${host}/api`;
}