import { useNavigate } from 'react-router-dom'
import { Container, Typography, Button, Box, Paper } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HomeIcon from '@mui/icons-material/Home'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          页面未找到
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          您请求的页面不存在或已被移除。
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            size="large"
          >
            返回首页
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default NotFoundPage