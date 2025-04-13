import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { LanguageContext } from '../contexts/LanguageContext'

const languages = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
]

const LanguageSelectionPage = () => {
  const navigate = useNavigate()
  const { language, setLanguage } = useContext(LanguageContext)

  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode)
    // Optional: Navigate to chat after language selection
    // navigate('/chat')
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          py: 4,
          minHeight: '100vh',
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ alignSelf: 'flex-start', mb: 3 }}
        >
          返回
        </Button>

        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            选择您的首选语言
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            聊天信息将自动翻译成您选择的语言
          </Typography>

          <Grid container spacing={2}>
            {languages.map((lang) => (
              <Grid item xs={6} sm={4} md={3} key={lang.code}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor:
                      language === lang.code ? 'primary.main' : 'divider',
                    bgcolor:
                      language === lang.code ? 'primary.lighter' : 'background.paper',
                    position: 'relative',
                  }}
                >
                  <CardActionArea
                    onClick={() => handleLanguageSelect(lang.code)}
                    sx={{ p: 2 }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        component="div"
                        align="center"
                        gutterBottom
                      >
                        {lang.nativeName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                      >
                        {lang.name !== lang.nativeName ? lang.name : ''}
                      </Typography>
                    </CardContent>
                    {language === lang.code && (
                      <CheckCircleIcon
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}
                      />
                    )}
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/chat')}
          >
            继续
          </Button>
        </Box>
      </Box>
    </Container>
  )
}

export default LanguageSelectionPage