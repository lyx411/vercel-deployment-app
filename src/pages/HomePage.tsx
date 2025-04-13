import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Button, Box, Paper, CircularProgress } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import ChatIcon from '@mui/icons-material/Chat'

const HomePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            多语言聊天翻译
          </Typography>
          <Typography variant="body1" color="text.secondary">
            实时聊天，跨越语言的障碍
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<LanguageIcon />}
            onClick={() => navigate('/language')}
            fullWidth
          >
            选择语言
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/chat')}
            fullWidth
          >
            开始聊天
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default HomePage