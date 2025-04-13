/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // 其他环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}