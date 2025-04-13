import { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { LanguageContext } from '../contexts/LanguageContext'

// 模拟数据 - 实际应用中应连接到后端服务
// 消息类型定义
interface Message {
  id: string
  text: string
  translatedText?: string
  sender: 'user' | 'system'
  timestamp: Date
  isTranslating?: boolean
}

const ChatPage = () => {
  const navigate = useNavigate()
  const { language } = useContext(LanguageContext)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 模拟初始消息
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome-1',
      text: `Welcome to the multilingual chat! You've selected ${language} as your preferred language.`,
      translatedText: language === 'zh' ? '欢迎使用多语言聊天！您已选择中文作为首选语言。' : undefined,
      sender: 'system',
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [language])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setNewMessage('')
    setIsLoading(true)

    // 模拟响应
    setTimeout(() => {
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I received your message: "${newMessage}". This is an automated response.`,
        translatedText: language === 'zh' ? `我收到了您的消息："${newMessage}"。这是一个自动响应。` : undefined,
        sender: 'system',
        timestamp: new Date(),
        isTranslating: language !== 'en',
      }

      setMessages((prev) => [...prev, responseMessage])
      setIsLoading(false)

      // 模拟翻译完成
      if (language !== 'en') {
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === responseMessage.id
                ? { ...msg, isTranslating: false }
                : msg
            )
          )
        }, 1500)
      }
    }, 1000)
  }

  // 处理按Enter发送消息
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2 }}>
      <Paper
        elevation={3}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* 聊天头部 */}
        <Box
          sx={{
            p: 2,
            backgroundColor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            多语言聊天
          </Typography>
        </Box>

        <Divider />

        {/* 消息区域 */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            backgroundColor: '#f5f5f5',
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent:
                  message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              {message.sender === 'system' && (
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 36,
                    height: 36,
                    mr: 1,
                  }}
                >
                  S
                </Avatar>
              )}
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  borderRadius: 2,
                  backgroundColor:
                    message.sender === 'user' ? 'primary.light' : 'white',
                  color: message.sender === 'user' ? 'white' : 'inherit',
                }}
              >
                <Typography variant="body1">
                  {message.sender === 'system' && message.translatedText
                    ? message.translatedText
                    : message.text}
                  {message.isTranslating && (
                    <CircularProgress
                      size={12}
                      thickness={6}
                      sx={{ ml: 1, verticalAlign: 'middle' }}
                    />
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  sx={{
                    mt: 0.5,
                    opacity: 0.7,
                    textAlign: message.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Paper>
              {message.sender === 'user' && (
                <Avatar
                  sx={{
                    bgcolor: 'secondary.main',
                    width: 36,
                    height: 36,
                    ml: 1,
                  }}
                >
                  U
                </Avatar>
              )}
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* 消息输入区 */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={3}
            sx={{ mr: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={isLoading || !newMessage.trim()}
          >
            发送
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default ChatPage