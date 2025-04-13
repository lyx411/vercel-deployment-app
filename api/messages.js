// api/messages.js
const { createClient } = require('@supabase/supabase-js')

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
  
  // 根据HTTP方法处理不同的请求类型
  try {
    // GET请求 - 获取消息
    if (req.method === 'GET') {
      const { session_id, limit = 50 } = req.query
      
      if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' })
      }
      
      let query = supabase
        .from('messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
      
      if (limit) {
        query = query.limit(parseInt(limit))
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return res.status(200).json({ messages: data })
    }
    
    // POST请求 - 创建新消息
    if (req.method === 'POST') {
      const { content, session_id, sender = 'user' } = req.body
      
      if (!content || !session_id) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          required: ['content', 'session_id'] 
        })
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert([
          { 
            content, 
            session_id, 
            sender,
            created_at: new Date().toISOString()
          }
        ])
        .select()
      
      if (error) throw error
      
      return res.status(201).json({ message: data[0] })
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