/**
 * 安全地检查当前是否在浏览器环境中运行
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * 安全地访问localStorage
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isBrowser) {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (isBrowser) {
      localStorage.removeItem(key);
    }
  }
};

/**
 * 安全地访问window.location
 */
export const safeLocation = {
  get protocol(): string {
    return isBrowser ? window.location.protocol : 'http:';
  },
  get host(): string {
    return isBrowser ? window.location.host : '';
  },
  get hostname(): string {
    return isBrowser ? window.location.hostname : '';
  },
  includes: (domain: string): boolean => {
    return isBrowser ? window.location.host.includes(domain) : false;
  }
};

/**
 * 安全的WebSocket连接创建器
 */
export const createSafeWebSocket = (url: string): WebSocket | null => {
  if (isBrowser) {
    return new WebSocket(url);
  }
  return null;
};

/**
 * WebSocket就绪状态常量
 */
export const WsReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};