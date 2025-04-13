import { useState } from 'react'
import { Container, Typography, Button, Box, Paper } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import LanguageSelector from '../components/LanguageSelector'
import { useLanguage } from '../contexts/LanguageContext'

const LanguagePage = () => {
  const navigate = useNavigate()
  const { userLanguage } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleContinue = () => {
    if (!userLanguage) return
    
    setIsSubmitting(true)
    
    // 如果用户选择了语言，跳转到聊天页面
    setTimeout(() => {
      navigate('/chat')
      setIsSubmitting(false)
    }, 500) // 模拟网络请求延迟
  }
  
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center">
            欢迎使用多语言客服
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph 
            align="center">
            请选择您的首选语言，我们将使用该语言与您交流。
          </Typography>
          
          <Box sx={{ my: 4 }}>
            <LanguageSelector fullWidth />
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleContinue}
            disabled={!userLanguage || isSubmitting}
          >
            {isSubmitting ? '正在加载...' : '继续'}
          </Button>
        </Paper>
      </Box>
    </Container>
  )
}

export default LanguagePage