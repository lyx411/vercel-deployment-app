import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Typography, Button, Box, Paper, Grid, Radio, RadioGroup, FormControlLabel, FormControl, IconButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

const languages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
]

const LanguageSelectionPage = () => {
  const navigate = useNavigate()
  const [selectedLanguage, setSelectedLanguage] = useState('zh')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedLanguage(event.target.value)
  }

  const handleSubmit = () => {
    localStorage.setItem('preferredLanguage', selectedLanguage)
    navigate('/chat')
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/')} edge="start" sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            选择您的语言
          </Typography>
        </Box>

        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            aria-label="language"
            name="language"
            value={selectedLanguage}
            onChange={handleChange}
          >
            <Grid container spacing={2}>
              {languages.map((lang) => (
                <Grid item xs={6} key={lang.code}>
                  <Paper
                    elevation={selectedLanguage === lang.code ? 3 : 1}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: selectedLanguage === lang.code ? '2px solid #4285F4' : '1px solid #e0e0e0',
                      transition: 'all 0.2s',
                    }}
                  >
                    <FormControlLabel
                      value={lang.code}
                      control={<Radio />}
                      label={lang.name}
                      sx={{ width: '100%' }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </RadioGroup>
        </FormControl>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="large" onClick={handleSubmit}>
            确认
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default LanguageSelectionPage