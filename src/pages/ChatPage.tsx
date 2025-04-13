import { useEffect, useState } from 'react'
import { Box, Paper } from '@mui/material'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import ChatHeader from '../components/ChatHeader'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import { initSupabase, getChatMessages, sendMessage, subscribeToMessages } from '../lib/supabase'

export interface Message {
  id: string
  session_id: string
  content: string
  translated_content?: string
  sender: 'user' | 'host'
  created_at: string
  translation_status?: 'pending' | 'completed' | 'failed'
}

const ChatPage = () => {
  const { userLanguage } = useLanguage()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // 检查语言标记
  useEffect(() => {
    if (!userLanguage) {
      navigate('/language')
    }
  }, [userLanguage, navigate])
  
  // 初始化 Supabase 客户端
  useEffect(() => {
    const initChat = async () => {
      try {
        await initSupabase()
        const chat = await getChatMessages()
        setSessionId(chat.sessionId)
        setMessages(chat.messages)
        
        // 如果没有消息，发送欢迎消息
        if (chat.messages.length === 0) {
          const welcomeMessage = {
            id: 'welcome-msg-' + Date.now(),
            session_id: chat.sessionId,
            content: `您好，我是客服助手。您选择的语言是【${userLanguage}】。我会自动翻译消息到您的语言。有什么可以帮助您的吗？`,
            translated_content: '',
            sender: 'host' as const,
            created_at: new Date().toISOString(),
            translation_status: 'pending'
          }
          
          await sendMessage(welcomeMessage.content, chat.sessionId)
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err)
        setError('Failed to initialize chat')
      } finally {
        setLoading(false)
      }
    }
    
    initChat()
  }, [])
  
  // 订阅新消息
  useEffect(() => {
    if (!sessionId) return
    
    const unsubscribe = subscribeToMessages(sessionId, (newMessages) => {
      setMessages(prevMessages => {
        // 合并现有消息和新消息，去重
        const existingIds = new Set(prevMessages.map(m => m.id))
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id))
        
        if (uniqueNewMessages.length === 0) {
          return prevMessages
        }
        
        return [...prevMessages, ...uniqueNewMessages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
    })
    
    return () => {
      unsubscribe()
    }
  }, [sessionId])
  
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !sessionId) return
    
    // 创建临时消息对象显示在UI上
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      session_id: sessionId,
      content,
      sender: 'user',
      created_at: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, tempMessage])
    
    try {
      // 发送消息到服务器
      await sendMessage(content, sessionId)
    } catch (error) {
      console.error('Error sending message:', error)
      // 可以在这里处理错误，例如标记消息状态为错误
    }
  }
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ChatHeader />
      
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        backgroundColor: 'background.default' 
      }}>
        {messages.length > 0 && <MessageList messages={messages} />}
      </Box>
      
      <MessageInput onSendMessage={handleSendMessage} />
    </Box>
  )
}

export default ChatPage