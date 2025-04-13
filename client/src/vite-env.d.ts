/// <reference types="vite/client" />

// 扩展环境变量声明
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MINIMAL_BUILD: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  // 其他环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}