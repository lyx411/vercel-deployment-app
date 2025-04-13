import { Link } from 'react-router-dom'
import { Container, Box, Typography, Button, Paper } from '@mui/material'
import { Home as HomeIcon } from '@mui/icons-material'

const NotFoundPage = () => {
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
          <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 700 }}>
            404
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom>
            页面未找到
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            您请求的页面不存在或已被移除。
          </Typography>
          
          <Button
            component={Link}
            to="/"
            variant="contained"
            startIcon={<HomeIcon />}
            size="large"
          >
            返回首页
          </Button>
        </Paper>
      </Box>
    </Container>
  )
}

export default NotFoundPage