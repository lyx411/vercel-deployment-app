import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material'
import { ArrowBack as ArrowBackIcon, Translate as TranslateIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

const ChatHeader = () => {
  const navigate = useNavigate()
  const { userLanguage } = useLanguage()
  
  const handleBack = () => {
    navigate('/language')
  }
  
  const getLanguageName = (code: string) => {
    const languageMap: Record<string, string> = {
      en: 'English',
      zh: '中文',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      ja: '日本語',
      ko: '한국어',
      ru: 'Русский',
      ar: 'العربية',
    }
    
    return languageMap[code] || code
  }
  
  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={handleBack}
          size="large"
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
          客户服务
        </Typography>
        
        {userLanguage && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TranslateIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">
              {getLanguageName(userLanguage)}
            </Typography>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default ChatHeader