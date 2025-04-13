import { useNavigate } from 'react-router-dom'
import { Box, Button, Container, Typography, Paper } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HomeIcon from '@mui/icons-material/Home'

const NotFoundPage = () => {
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
          <ErrorOutlineIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          
          <Typography variant="h4" component="h1" gutterBottom>
            404 - 页面未找到
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            您请求的页面不存在或已被移动
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            返回首页
          </Button>
        </Paper>
      </Box>
    </Container>
  )
}

export default NotFoundPage