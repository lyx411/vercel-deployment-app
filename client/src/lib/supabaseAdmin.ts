import { createClient } from '@supabase/supabase-js';

// 管理员权限Supabase客户端
// 注意：这个文件只应该在服务器端使用，不要在客户端使用

// 环境变量会在构建时注入
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

// 初始化Supabase管理员客户端
export const getSupabaseAdmin = () => {
  if (!supabaseAdmin && supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return supabaseAdmin;
};
