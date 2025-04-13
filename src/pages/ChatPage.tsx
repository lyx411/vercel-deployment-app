import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Box, Paper, TextField, IconButton, Avatar, List, ListItem, ListItemText, ListItemAvatar, Divider, AppBar, Toolbar, CircularProgress } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TranslateIcon from '@mui/icons-material/Translate'

interface Message {
  id: number
  text: string
  translation: string
  sender: 'user' | 'other'
  timestamp: Date
}

const ChatPage = () => {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const endOfMessagesRef = useRef<HTMLDivElement>(null)
  const [preferredLanguage, setPreferredLanguage] = useState('zh')

  useEffect(() => {
    const storedLanguage = localStorage.getItem('preferredLanguage')
    if (storedLanguage) {
      setPreferredLanguage(storedLanguage)
    }

    // 加载测试数据
    setMessages([
      {
        id: 1,
        text: 'Hello, how are you today?',
        translation: '你好，你今天怎么样？',
        sender: 'other',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        text: '我很好，谢谢关心！',
        translation: 'I\'m fine, thank you for asking!',
        sender: 'user',
        timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000)
      },
    ])
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const newMessage: Message = {
      id: Date.now(),
      text: message,
      translation: '',
      sender: 'user',
      timestamp: new Date()
    }

    setMessages([...messages, newMessage])
    setMessage('')
    setLoading(true)

    // 模拟翻译请求
    setTimeout(() => {
      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        if (lastMsg) {
          lastMsg.translation = `Translated: ${lastMsg.text}`
        }
        return updated
      })
      
      // 模拟接收回复
      setTimeout(() => {
        const reply: Message = {
          id: Date.now(),
          text: 'This is an automated response.',
          translation: '这是一个自动回复。',
          sender: 'other',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, reply])
        setLoading(false)
      }, 1000)
      
    }, 1500)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            聊天室
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => navigate('/language')}
          >
            <TranslateIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, backgroundColor: '#f5f5f5' }}>
        <List>
          {messages.map((msg, index) => (
            <Box key={msg.id}>
              {index > 0 && (
                <Box sx={{ textAlign: 'center', my: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(msg.timestamp).toLocaleDateString() !== 
                     new Date(messages[index - 1].timestamp).toLocaleDateString() 
                      ? new Date(msg.timestamp).toLocaleDateString()
                      : ''}
                  </Typography>
                </Box>
              )}
              <ListItem
                alignItems="flex-start"
                sx={{
                  display: 'flex',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  mb: 1,
                }}
              >
                <ListItemAvatar sx={{ minWidth: msg.sender === 'user' ? '0px' : '40px' }}>
                  {msg.sender === 'other' && (
                    <Avatar sx={{ bgcolor: msg.sender === 'user' ? 'primary.main' : 'secondary.main' }}>
                      {msg.sender === 'user' ? 'U' : 'O'}
                    </Avatar>
                  )}
                </ListItemAvatar>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    maxWidth: '70%',
                    backgroundColor: msg.sender === 'user' ? '#e3f2fd' : 'white',
                    ml: msg.sender === 'user' ? 1 : 0,
                    mr: msg.sender === 'other' ? 1 : 0,
                  }}
                >
                  <ListItemText
                    primary={msg.text}
                    secondary={
                      <>
                        {msg.translation && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
                          >
                            {msg.translation}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="span"
                          sx={{ display: 'block', mt: 1, textAlign: 'right' }}
                        >
                          {formatTime(new Date(msg.timestamp))}
                        </Typography>
                      </>
                    }
                  />
                </Paper>
                <ListItemAvatar sx={{ minWidth: msg.sender === 'other' ? '0px' : '40px' }}>
                  {msg.sender === 'user' && (
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      U
                    </Avatar>
                  )}
                </ListItemAvatar>
              </ListItem>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <div ref={endOfMessagesRef} />
        </List>
      </Box>

      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={`用${preferredLanguage === 'zh' ? '中文' : '其他语言'}输入消息...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            size="small"
            sx={{ mr: 1 }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!message.trim() || loading}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  )
}

export default ChatPage