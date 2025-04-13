// api/sessions.js
const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // 初始化Supabase客户端
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // GET请求 - 获取或创建会话
    if (req.method === 'GET') {
      const { user_id } = req.query
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' })
      }
      
      // 查找用户的最近会话
      let { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      // 如果找不到会话，创建一个新的
      if (!sessions || sessions.length === 0) {
        const sessionId = uuidv4()
        
        const { data, error: insertError } = await supabase
          .from('chat_sessions')
          .insert([
            { 
              id: sessionId,
              user_id,
              created_at: new Date().toISOString()
            }
          ])
          .select()
        
        if (insertError) throw insertError
        
        return res.status(201).json({ 
          session: data[0],
          isNewSession: true 
        })
      }
      
      // 返回现有会话
      return res.status(200).json({ 
        session: sessions[0],
        isNewSession: false 
      })
    }
    
    // POST请求 - 创建新会话
    if (req.method === 'POST') {
      const { user_id } = req.body
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' })
      }
      
      const sessionId = uuidv4()
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([
          { 
            id: sessionId,
            user_id,
            created_at: new Date().toISOString()
          }
        ])
        .select()
      
      if (error) throw error
      
      return res.status(201).json({ session: data[0] })
    }
    
    // 其他不支持的方法
    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    })
  }
}