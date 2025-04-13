import { useNavigate } from 'react-router-dom'
import { Box, Button, Container, Typography, Paper } from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import TranslateIcon from '@mui/icons-material/Translate'

const HomePage = () => {
  const navigate = useNavigate()

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            多语言聊天应用
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            体验实时翻译功能，与全球用户无障碍沟通
          </Typography>
          
          <Box sx={{ mt: 4, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<TranslateIcon />}
              fullWidth
              onClick={() => navigate('/language')}
            >
              选择语言偏好
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<ChatIcon />}
              fullWidth
              onClick={() => navigate('/chat')}
            >
              开始聊天
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default HomePage