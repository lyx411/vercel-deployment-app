import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Box, Typography, Button, Paper, CircularProgress } from '@mui/material'
import { useLanguage } from '../contexts/LanguageContext'

const HomePage = () => {
  const navigate = useNavigate()
  const { userLanguage } = useLanguage()
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    // 如果用户已选择语言，直接进入聊天页面
    if (userLanguage) {
      navigate('/chat')
    }
  }, [userLanguage, navigate])

  const handleStartChat = () => {
    setLoading(true)
    // 导航到语言选择页面
    navigate('/language')
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          py: 4,
        }}
      >
        <Paper 
          elevation={3} 
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
            backgroundColor: 'white',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            欢迎使用多语言客服系统
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            选择您的语言，与我们的客服进行实时对话。我们支持多种语言的即时翻译。
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleStartChat}
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "开始对话"}
          </Button>
        </Paper>
      </Box>
    </Container>
  )
}

export default HomePage