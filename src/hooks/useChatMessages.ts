import { useState, useEffect } from 'react'
import { Message } from '../pages/ChatPage'
import { getChatMessages, sendMessage, subscribeToMessages } from '../lib/supabase'

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // 初始化消息
  useEffect(() => {
    const initializeMessages = async () => {
      try {
        const result = await getChatMessages()
        setSessionId(result.sessionId)
        setMessages(result.messages)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load messages'))
      } finally {
        setLoading(false)
      }
    }
    
    initializeMessages()
  }, [])
  
  // 订阅新消息
  useEffect(() => {
    if (!sessionId) return
    
    const unsubscribe = subscribeToMessages(sessionId, (newMessages) => {
      setMessages(prev => {
        // 去重
        const existingIds = new Set(prev.map(m => m.id))
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id))
        
        if (uniqueNewMessages.length === 0) {
          return prev
        }
        
        // 合并并按时间排序
        return [...prev, ...uniqueNewMessages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
    })
    
    return () => {
      unsubscribe()
    }
  }, [sessionId])
  
  // 发送消息
  const sendUserMessage = async (content: string) => {
    if (!sessionId) throw new Error('No active session')
    
    // 添加临时消息到UI中
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      session_id: sessionId,
      content,
      sender: 'user',
      created_at: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, tempMessage])
    
    try {
      await sendMessage(content, sessionId)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send message'))
      return false
    }
  }
  
  return {
    messages,
    sessionId,
    loading,
    error,
    sendMessage: sendUserMessage,
  }
}