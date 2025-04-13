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
      languageSettings: '语言设置',
      yourPreferredLanguage: '您熟悉的语言',
      allMessagesWillBeTranslated: '系统会自动将来自对方的消息翻译成您选择的语言',
      confirm: '确认',
      searchLanguage: '搜索语言...',
      connecting: '正在连接...',
    },
    'en': {
      languageSettings: 'Language Settings',
      yourPreferredLanguage: 'Your preferred language',
      allMessagesWillBeTranslated: 'Messages from the other party will be translated to your selected language',
      confirm: 'Confirm',
      searchLanguage: 'Search languages...',
      connecting: 'Connecting...',
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
  
  // 确认语言选择
  const handleConfirmLanguage = () => {
    setUserLanguage(selectedLanguage);
    setLoading(true);
    
    // 延时模拟连接过程
    setTimeout(() => {
      // 导航到聊天页面
      navigate(sessionId ? `/chat/${sessionId}` : `/chat/mock-session-${Date.now()}`);
    }, 1500);
  };

  return (
    <Box sx={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#f8f9fa'
    }}>
      {/* 标题栏 */}
      <Box sx={{
        bgcolor: '#4a6bff',
        color: 'white',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TranslateIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {t.languageSettings}
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
          flexGrow: 1
        }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            {t.connecting}
          </Typography>
        </Box>
      ) : (
        <>
          {/* 语言选择内容 */}
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1, color: '#333' }}>
              {t.yourPreferredLanguage}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t.allMessagesWillBeTranslated}
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
          </Box>

          {/* 语言列表 */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', px: 0 }}>
            <List disablePadding>
              {filteredLanguages.map((language, index) => (
                <Box key={language.code}>
                  <ListItem 
                    button
                    selected={selectedLanguage === language.code}
                    onClick={() => handleLanguageSelect(language.code)}
                    sx={{
                      py: 1.5,
                      px: 2,
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
                          bgcolor: '#4a6bff',
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

          {/* 确认按钮 */}
          <Box sx={{ p: 2, borderTop: '1px solid #eaeaea' }}>
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
                fontWeight: 500
              }}
            >
              {t.confirm}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ConnectPage;