import { createClient } from '@supabase/supabase-js';

// 为管理员操作（如创建用户）使用服务密钥
const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY || '';

// 创建具有服务密钥的Supabase客户端，用于绕过RLS
export const supabaseAdmin = (supabaseAdminUrl && supabaseServiceKey)
  ? createClient(supabaseAdminUrl, supabaseServiceKey)
  : null;

// 日志记录用于调试
if (supabaseAdmin) {
  console.log('Supabase Admin client initialized successfully');
} else {
  console.log('Failed to initialize Supabase Admin client - missing URL or service key');
}