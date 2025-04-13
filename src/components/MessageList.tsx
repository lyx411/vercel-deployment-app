import { useRef, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Message } from '../pages/ChatPage'
import { useLanguage } from '../contexts/LanguageContext'
import TranslatableMessage from './TranslatableMessage'

interface MessageListProps {
  messages: Message[]
}

const MessageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}))

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  display: 'inline-block',
  padding: theme.spacing(1.5, 2),
  borderRadius: 16,
  maxWidth: '75%',
  wordBreak: 'break-word',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  marginLeft: isUser ? 'auto' : 0,
  marginRight: isUser ? 0 : 'auto',
}))

const TimeStamp = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'center',
}))

const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { userLanguage } = useLanguage()
  
  // 滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])
  
  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // 按日期分组消息
  const groupMessagesByDate = () => {
    const groups: Record<string, Message[]> = {}
    
    messages.forEach(message => {
      const date = new Date(message.created_at)
      const dateKey = date.toLocaleDateString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      
      groups[dateKey].push(message)
    })
    
    return groups
  }
  
  const messageGroups = groupMessagesByDate()
  
  return (
    <Box sx={{ p: 2 }}>
      {Object.entries(messageGroups).map(([date, msgs]) => (
        <Box key={date}>
          <Typography 
            variant="caption" 
            component="div" 
            align="center"
            sx={{ my: 2, color: 'text.secondary' }}
          >
            {new Date(date).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
          
          {msgs.map((message) => {
            const isUser = message.sender === 'user'
            
            return (
              <MessageContainer key={message.id}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start'
                }}>
                  <MessageBubble isUser={isUser}>
                    <TranslatableMessage 
                      message={message}
                      userLanguage={userLanguage || 'en'}
                    />
                  </MessageBubble>
                  <TimeStamp>{formatTime(message.created_at)}</TimeStamp>
                </Box>
              </MessageContainer>
            )
          })}
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  )
}

export default MessageList