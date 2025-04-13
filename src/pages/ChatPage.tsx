import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Box, Paper, Typography, CircularProgress } from '@mui/material'
import { useLanguage } from '../contexts/LanguageContext'
import ChatHeader from '../components/ChatHeader'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import { getOrCreateChatSession, getChatMessages, subscribeToMessages, sendMessage } from '../lib/supabase'

export interface Message {
  id: string
  content: string
  translated_content?: string | null
  sender: 'user' | 'host'
  created_at: string
  translation_status?: 'pending' | 'completed' | 'failed' | null
}

const ChatPage = () => {
  const navigate = useNavigate()
  const { userLanguage } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unsubscribe, setUnsubscribe] = useState<() => void | null>(() => null)
  
  // 确保用户已选择语言
  useEffect(() => {
    if (!userLanguage) {
      navigate('/language')
    }
  }, [userLanguage, navigate])
  
  // 初始化聊天会话
  useEffect(() => {
    if (!userLanguage) return
    
    const initChat = async () => {
      try {
        // 获取或创建新的聊天会话
        const session = await getOrCreateChatSession()
        setSessionId(session.id)
        
        // 获取历史消息
        const chatMessages = await getChatMessages(session.id)
        setMessages(chatMessages)
        
        // 订阅新消息
        const unsub = subscribeToMessages(session.id, (newMessage) => {
          setMessages((prevMessages) => {
            // 检查消息是否已存在
            const exists = prevMessages.some(msg => msg.id === newMessage.id)
            if (exists) {
              // 更新现有消息
              return prevMessages.map(msg => 
                msg.id === newMessage.id ? newMessage : msg
              )
            } else {
              // 添加新消息
              return [...prevMessages, newMessage]
            }
          })
        })
        
        setUnsubscribe(() => unsub)
        setLoading(false)
      } catch (error) {
        console.error('初始化聊天失败:', error)
        setLoading(false)
      }
    }
    
    initChat()
    
    // 清理函数
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [userLanguage])
  
  // 发送消息处理函数
  const handleSendMessage = async (content: string) => {
    if (!sessionId || !content.trim()) return
    
    try {
      await sendMessage({
        sessionId,
        content,
        sender: 'user',
        sourceLang: userLanguage,
      })
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }
  
  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
  
  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2 }}>
      <Paper
        elevation={3}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <ChatHeader />
        
        <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default' }}>
          {messages.length > 0 ? (
            <MessageList messages={messages} />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                开始与客服对话
              </Typography>
            </Box>
          )}
        </Box>
        
        <MessageInput onSendMessage={handleSendMessage} />
      </Paper>
    </Container>
  )
}

export default ChatPage