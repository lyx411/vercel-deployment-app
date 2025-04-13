import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { getWindow, isBrowser } from './browserUtils'

// 环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 类型定义
type Message = {
  id: string
  created_at: string
  content: string
  translated_content: string | null
  role: 'user' | 'host'
  session_id: string
  source_language?: string | null
  target_language?: string | null
  translation_status?: 'pending' | 'completed' | 'failed' | null
}

// 工具函数
const LOG_PREFIX = '[SUPABASE]'
const log = (message: string, data?: any) => {
  console.log(`${LOG_PREFIX} ${message}`, data || '')
}

const error = (message: string, err?: any) => {
  console.error(`${LOG_PREFIX} ${message}`, err || '')
}

/**
 * 环境检测和配置
 */
export function getEnv() {
  let host = ''
  let protocol = 'http:'
  let wsProtocol = 'ws:'
  
  if (isBrowser()) {
    const location = getWindow()?.location
    if (location) {
      host = location.host
      protocol = location.protocol
      wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
    }
  }

  // 环境检测
  let env = 'production'
  if (host.includes('localhost')) {
    env = 'local'
  } else if (host.includes('replit')) {
    env = 'replit'
  } else if (host.includes('cloudflare')) {
    env = 'cloudflare'
  }

  log(`检测到环境: ${env}, 主机: ${host}`)
  
  return { host, protocol, wsProtocol, env }
}

// Supabase客户端
let supabaseInstance: SupabaseClient | null = null

/**
 * 初始化Supabase客户端
 */
export function initSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    error('初始化失败 - Supabase配置缺失')
    return null
  }

  try {
    log('初始化Supabase客户端')
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
    
    log('Supabase客户端初始化成功')
    return supabaseInstance
  } catch (err) {
    error('初始化Supabase客户端失败', err)
    return null
  }
}

/**
 * 获取Supabase客户端实例
 */
export function getSupabase() {
  if (!supabaseInstance) {
    return initSupabase()
  }
  return supabaseInstance
}

/**
 * Websocket连接状态管理
 */
let wsConnection: WebSocket | null = null
let wsConnectAttempts = 0
const MAX_WS_RECONNECT_ATTEMPTS = 3

export function getWsConnectionStatus() {
  if (!wsConnection) return 'closed'
  
  switch(wsConnection.readyState) {
    case 0: return 'connecting'
    case 1: return 'open'
    case 2: return 'closing'
    case 3: return 'closed'
    default: return 'unknown'
  }
}

/**
 * 初始化WebSocket连接
 */
export function initWebSocketConnection(userLanguage: string = 'zh-CN') {
  if (!isBrowser()) {
    log('非浏览器环境，跳过WebSocket初始化')
    return null
  }

  const { env, wsProtocol, host } = getEnv()
  let wsUrl = ''
  
  // 根据环境选择WebSocket URL
  if (env === 'local') {
    wsUrl = `${wsProtocol}//localhost:3001/translate`
  } else if (env === 'replit') {
    wsUrl = `${wsProtocol}//${host}/translate`
  } else if (env === 'cloudflare') {
    wsUrl = `${wsProtocol}//${host}/translate`
  } else {
    // 生产环境
    wsUrl = `${wsProtocol}//${host}/api/translate`
  }
  
  log(`初始化WebSocket连接: ${wsUrl}`)
  
  try {
    wsConnection = new WebSocket(wsUrl)
    
    wsConnection.onopen = () => {
      log('WebSocket连接已打开')
      wsConnectAttempts = 0
      
      // 发送用户语言偏好
      if (wsConnection && wsConnection.readyState === 1) {
        wsConnection.send(JSON.stringify({
          action: 'setUserLanguage',
          language: userLanguage
        }))
        log(`已发送用户语言偏好: ${userLanguage}`)
        
        // 设置心跳
        setInterval(() => {
          if (wsConnection && wsConnection.readyState === 1) {
            wsConnection.send(JSON.stringify({
              action: 'heartbeat'
            }))
          }
        }, 30000)
      }
    }
    
    wsConnection.onclose = () => {
      log('WebSocket连接已关闭')
      
      // 尝试重连
      if (wsConnectAttempts < MAX_WS_RECONNECT_ATTEMPTS) {
        wsConnectAttempts++
        log(`尝试重新连接 WebSocket (${wsConnectAttempts}/${MAX_WS_RECONNECT_ATTEMPTS})`)
        setTimeout(() => initWebSocketConnection(userLanguage), 2000)
      } else {
        error('达到最大重连次数，WebSocket服务不可用')
      }
    }
    
    wsConnection.onerror = (err) => {
      error('WebSocket连接错误', err)
    }
    
    return wsConnection
  } catch (err) {
    error('初始化WebSocket连接失败', err)
    return null
  }
}

/**
 * 翻译回调注册
 */
type TranslationCallback = (translatedText: string) => void
const translationCallbacks: Record<string, TranslationCallback> = {}

export function registerTranslationCallback(messageId: string, callback: TranslationCallback) {
  translationCallbacks[messageId] = callback
  log(`已注册翻译回调: ${messageId}`)
}

export function unregisterTranslationCallback(messageId: string) {
  if (translationCallbacks[messageId]) {
    delete translationCallbacks[messageId]
    log(`已注销翻译回调: ${messageId}`)
  }
}

/**
 * 通过WebSocket发送翻译请求
 */
export function translateMessage(message: Message) {
  if (!wsConnection || wsConnection.readyState !== 1) {
    error('WebSocket未连接，无法发送翻译请求')
    return false
  }
  
  try {
    const request = {
      action: 'translate',
      messageId: message.id,
      text: message.content,
      targetLanguage: message.target_language || 'zh-CN',
      sourceLanguage: message.source_language || 'auto'
    }
    
    log(`发送翻译请求: ${message.id}`)
    wsConnection.send(JSON.stringify(request))
    return true
  } catch (err) {
    error('发送翻译请求失败', err)
    return false
  }
}

/**
 * 获取聊天消息
 */
export async function getChatMessages(sessionId: string) {
  const supabase = getSupabase()
  if (!supabase) {
    error('获取聊天消息失败 - Supabase客户端未初始化')
    return []
  }
  
  try {
    log(`正在获取会话消息: ${sessionId}`)
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    
    if (queryError) {
      throw queryError
    }
    
    log(`已获取${data?.length || 0}条消息`)
    return data || []
  } catch (err) {
    error('获取聊天消息失败', err)
    return []
  }
}

/**
 * 发送消息
 */
export async function sendMessage(content: string, sessionId: string, role: 'user' | 'host' = 'user') {
  // 防止空消息
  if (!content.trim()) {
    error('发送失败 - 消息内容为空')
    return null
  }
  
  // 创建消息对象
  const messageId = uuidv4()
  const message: Message = {
    id: messageId,
    created_at: new Date().toISOString(),
    content,
    translated_content: null,
    role,
    session_id: sessionId,
    translation_status: role === 'host' ? 'pending' : null,
    source_language: role === 'host' ? 'en' : 'zh-CN',
    target_language: role === 'host' ? 'zh-CN' : 'en'
  }
  
  log(`发送消息: ${role} - ${messageId}`)
  
  // 获取Supabase客户端
  const supabase = getSupabase()
  if (!supabase) {
    error('发送消息失败 - Supabase客户端未初始化')
    return message
  }
  
  try {
    // 插入数据库
    const { error: insertError } = await supabase
      .from('messages')
      .insert(message)
    
    if (insertError) {
      throw insertError
    }
    
    log(`消息已保存到数据库: ${messageId}`)
    
    // 如果是客服消息，触发翻译
    if (role === 'host') {
      translateMessage(message)
    }
    
    return message
  } catch (err) {
    error('保存消息到数据库失败', err)
    return message
  }
}

/**
 * 获取或创建聊天会话
 */
export async function getOrCreateChatSession() {
  const supabase = getSupabase()
  if (!supabase) {
    error('创建会话失败 - Supabase客户端未初始化')
    return { sessionId: `local-${uuidv4()}` }
  }
  
  const sessionId = uuidv4()
  log(`正在创建新会话: ${sessionId}`)
  
  try {
    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        created_at: new Date().toISOString(),
        status: 'active'
      })
    
    if (insertError) {
      throw insertError
    }
    
    // 验证会话创建成功
    const { data, error: queryError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single()
    
    if (queryError || !data) {
      throw queryError || new Error('会话创建失败')
    }
    
    log(`会话创建成功: ${sessionId}`)
    return { sessionId }
  } catch (err) {
    error('创建会话失败', err)
    return { sessionId: `local-${uuidv4()}` }
  }
}

/**
 * 订阅新消息
 */
export function subscribeToMessages(sessionId: string, onNewMessage: (message: Message) => void) {
  if (!sessionId) {
    error('订阅失败 - 会话ID为空')
    return null
  }
  
  log(`设置消息订阅: ${sessionId}`)
  
  // 轮询获取消息
  const intervalId = setInterval(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    
    try {
      const { data, error: queryError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (queryError) {
        throw queryError
      }
      
      if (data && data.length > 0) {
        const lastMessage = data[0]
        if (lastMessage && (lastMessage as any)._isNew !== true) {
          (lastMessage as any)._isNew = true
          onNewMessage(lastMessage)
        }
      }
    } catch (err) {
      error('获取新消息失败', err)
    }
  }, 3000)
  
  return {
    unsubscribe: () => {
      clearInterval(intervalId)
      log(`已取消消息订阅: ${sessionId}`)
    }
  }
}

// 导出默认函数
export default {
  initSupabase,
  getSupabase,
  initWebSocketConnection,
  getWsConnectionStatus,
  getChatMessages,
  sendMessage,
  getOrCreateChatSession,
  subscribeToMessages,
  registerTranslationCallback,
  unregisterTranslationCallback,
  translateMessage
}