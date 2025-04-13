import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Box, Typography, Button, Paper, Grid, CircularProgress } from '@mui/material'
import { useLanguage } from '../contexts/LanguageContext'

interface LanguageOption {
  code: string
  name: string
  nativeName: string
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
]

const LanguageSelectionPage = () => {
  const navigate = useNavigate()
  const { setUserLanguage } = useLanguage()
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode)
  }

  const handleContinue = () => {
    if (selectedLanguage) {
      setLoading(true)
      // 设置用户语言并导航到聊天页面
      setUserLanguage(selectedLanguage)
      navigate('/chat')
    }
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper 
          elevation={3} 
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'white',
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom textAlign="center">
            请选择您的首选语言
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }} textAlign="center">
            选择语言后，我们将提供该语言的实时翻译服务
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {languages.map((language) => (
              <Grid item xs={6} sm={4} key={language.code}>
                <Button
                  variant={selectedLanguage === language.code ? "contained" : "outlined"}
                  fullWidth
                  onClick={() => handleLanguageSelect(language.code)}
                  sx={{
                    py: 1.5,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    borderRadius: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {language.nativeName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {language.name}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!selectedLanguage || loading}
            onClick={handleContinue}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "继续"}
          </Button>
        </Paper>
      </Box>
    </Container>
  )
}

export default LanguageSelectionPage