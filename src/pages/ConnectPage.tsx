import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  CircularProgress,
  IconButton,
  Paper,
  InputAdornment
} from '@mui/material';
import { 
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  Search as SearchIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// 支持的语言列表
const availableLanguages = [
  { code: 'zh-CN', label: 'Chinese中文', nativeName: '中文' },
  { code: 'en', label: 'EnglishEnglish', nativeName: 'English' },
  { code: 'es', label: 'SpanishÉspañol', nativeName: 'Español' },
  { code: 'fr', label: 'FrenchFrançais', nativeName: 'Français' },
  { code: 'de', label: 'GermanDeutsch', nativeName: 'Deutsch' },
  { code: 'ja', label: 'Japanese日本語', nativeName: '日本語' },
  { code: 'ko', label: 'Korean한국어', nativeName: '한국어' },
  { code: 'ar', label: 'Arabicالعربية', nativeName: 'العربية' },
  { code: 'hi', label: 'Hindiहिन्दी', nativeName: 'हिन्दी' },
  { code: 'pt', label: 'PortuguesePortuguês', nativeName: 'Português' },
];

const ConnectPage = () => {
  const { sessionId, userId } = useParams<{ sessionId?: string, userId?: string }>();
  const { userLanguage, setUserLanguage, detectBrowserLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(userLanguage || 'zh-CN');
  const [loading, setLoading] = useState<boolean>(false);
  
  // 多语言翻译
  const translations = {
    'zh-CN': {
      title: '语言设置',
      yourPreferredLanguage: '您熟悉的语言',
      allMessagesWillBeTranslated: '系统会自动将来自对方的消息翻译成您选择的语言',
      confirm: '确认',
      searchLanguage: '搜索语言...',
      connecting: '正在连接...',
      detected: '系统已自动检测您的浏览器语言',
      chooseAnother: '您可以选择其他的语言'
    },
    'en': {
      title: 'Language Settings',
      yourPreferredLanguage: 'Your preferred language',
      allMessagesWillBeTranslated: 'Messages from the other party will be translated to your selected language',
      confirm: 'Confirm',
      searchLanguage: 'Search languages...',
      connecting: 'Connecting...',
      detected: 'System has automatically detected your browser language',
      chooseAnother: 'You can choose another language'
    }
  };
  
  // 获取当前语言的翻译
  const t = translations[selectedLanguage as keyof typeof translations] || translations['zh-CN'];
  
  // 筛选语言列表
  const filteredLanguages = availableLanguages.filter(lang => 
    lang.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 处理语言选择
  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };
  
  // 确认语言选择并进入聊天
  const handleConfirmLanguage = () => {
    setUserLanguage(selectedLanguage);
    setLoading(true);
    
    // 延时模拟连接过程
    setTimeout(() => {
      // 导航到聊天页面，携带会话ID
      navigate(sessionId ? `/chat/${sessionId}` : `/chat/mock-session-${Date.now()}`);
    }, 1000);
  };

  return (
    <Box sx={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#1a1a1a80',
      p: 2
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          width: '100%', 
          maxWidth: 400, 
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* 标题栏 */}
        <Box sx={{
          bgcolor: 'primary.main',
          color: 'white',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TranslateIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {t.title}
            </Typography>
          </Box>
          <IconButton 
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ p: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 6
          }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3 }}>
              {t.connecting}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            {/* 当前语言信息 */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                {t.yourPreferredLanguage}
              </Typography>
              
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {availableLanguages.find(lang => lang.code === userLanguage)?.nativeName || '中文'}
                {userLanguage === 'zh-CN' && ' (中文)'}
                {userLanguage === 'en' && ' (English)'}
              </Typography>
              
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {t.detected}
              </Typography>
            </Box>
            
            {/* 语言选择 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {t.chooseAnother}
              </Typography>
              
              <TextField
                fullWidth
                variant="outlined"
                placeholder={t.searchLanguage}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 1 }
                }}
              />
              
              <Box sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <List disablePadding>
                  {filteredLanguages.map((language, index) => (
                    <Box key={language.code}>
                      <ListItem 
                        button
                        selected={selectedLanguage === language.code}
                        onClick={() => handleLanguageSelect(language.code)}
                        sx={{
                          py: 1.5,
                          '&.Mui-selected': {
                            bgcolor: 'rgba(74, 107, 255, 0.08)',
                            '&:hover': {
                              bgcolor: 'rgba(74, 107, 255, 0.12)',
                            }
                          }
                        }}
                      >
                        <ListItemText 
                          primary={language.nativeName} 
                          secondary={language.code === 'zh-CN' ? 'Chinese' : (
                            language.code === 'en' ? 'English' : language.label.split(/(?=[A-Z])/)[0]
                          )}
                          primaryTypographyProps={{
                            fontWeight: selectedLanguage === language.code ? 600 : 400
                          }}
                        />
                        {selectedLanguage === language.code && (
                          <Box 
                            component="span" 
                            sx={{ 
                              ml: 1, 
                              width: 20, 
                              height: 20, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              color: 'white'
                            }}
                          >
                            ✓
                          </Box>
                        )}
                      </ListItem>
                      {index < filteredLanguages.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              </Box>
            </Box>
            
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
              {t.allMessagesWillBeTranslated}
            </Typography>
            
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={handleConfirmLanguage}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: 6
              }}
            >
              {t.confirm}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ConnectPage;