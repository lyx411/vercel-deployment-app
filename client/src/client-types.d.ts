// 为客户端代码定义全局类型
declare module 'ws' {
  export = WebSocket;
}

// 确保import.meta.env可用
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // 其他环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}