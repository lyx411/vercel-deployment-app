/**
 * 浏览器环境工具函数
 * 这个文件用于提供安全的浏览器API访问，
 * 以解决Rollup构建时的'window is not defined'错误
 */

// 安全地获取window对象，在SSR环境下返回undefined
export const getWindow = (): Window | undefined => {
  if (typeof window !== 'undefined') {
    return window;
  }
  return undefined;
};

// 安全地获取document对象
export const getDocument = (): Document | undefined => {
  if (typeof document !== 'undefined') {
    return document;
  }
  return undefined;
};

// 安全地获取navigator对象
export const getNavigator = (): Navigator | undefined => {
  if (typeof navigator !== 'undefined') {
    return navigator;
  }
  return undefined;
};

// 安全地获取localStorage
export const getLocalStorage = (): Storage | undefined => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch (e) {
    console.warn('localStorage不可用', e);
  }
  return undefined;
};

// 安全地获取sessionStorage
export const getSessionStorage = (): Storage | undefined => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage;
    }
  } catch (e) {
    console.warn('sessionStorage不可用', e);
  }
  return undefined;
};

// 判断是否在浏览器环境
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

export default {
  getWindow,
  getDocument,
  getNavigator,
  getLocalStorage,
  getSessionStorage,
  isBrowser
};