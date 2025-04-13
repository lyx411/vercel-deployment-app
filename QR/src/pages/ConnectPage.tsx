import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Container, 
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  AppBar,
  Toolbar,
  Divider,
  Alert
} from '@mui/material';
import { 
  Close as CloseIcon,
  Check as CheckIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

// 支持的语言列表
const availableLanguages = [
  { code: 'zh-CN', label: 'Chinese中文' },
  { code: 'en', label: 'EnglishEnglish' },
  { code: 'es', label: 'SpanishEspañol' },
  { code: 'fr', label: 'FrenchFrançais' },
  { code: 'de', label: 'GermanDeutsch' },
  { code: 'ja', label: 'Japanese日本語' },
  { code: 'ko', label: 'Korean한국어' },
  { code: 'ar', label: 'Arabicالعربية' },
  { code: 'hi', label: 'Hindiहिन्दी' },
  { code: 'pt', label: 'PortuguesePortuguês' },
];

const ConnectPage = () => {
  const { sessionId, userId } = useParams<{ sessionId?: string, userId?: string }>();
  const { setUserLanguage, userLanguage } = useLanguage();
  const { user } = useAuth();
  const { createChatSession } = useChat();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [languageDialogOpen, setLanguageDialogOpen] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(userLanguage || 'zh-CN');
  const [targetUserInfo, setTargetUserInfo] = useState<any>(null);
  
  // 多语言翻译
  const translations = {
    'zh-CN': {
      languageSettings: '语言设置',
      yourPreferredLanguage: '您熟悉的语言',
      youCanChooseOtherLanguage: '您可以选择其他语言',
      allMessagesWillBeTranslated: '所有消息将被翻译成您选择的语言',
      confirm: '确认',
      connecting: '正在连接...',
      connectError: '连接失败',
      welcomeMessage: '欢迎来到聊天！',
      sessionNotFound: '聊天会话未找到',
      userNotFound: '用户未找到',
      startChatting: '开始聊天',
      pleaseWait: '请稍等...',
    },
    'en': {
      languageSettings: 'Language Settings',
      yourPreferredLanguage: 'Your preferred language',
      youCanChooseOtherLanguage: 'You can choose another language',
      allMessagesWillBeTranslated: 'All messages will be translated to your selected language',
      confirm: 'Confirm',
      connecting: 'Connecting...',
      connectError: 'Connection failed',
      welcomeMessage: 'Welcome to the chat!',
      sessionNotFound: 'Chat session not found',
      userNotFound: 'User not found',
      startChatting: 'Start Chatting',
      pleaseWait: 'Please wait...',
    }
  };
  
  // 获取当前语言的翻译
  const t = translations[selectedLanguage as keyof typeof translations] || translations['zh-CN'];
  
  // 处理语言选择
  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
  };
  
  // 确认语言选择
  const handleConfirmLanguage = () => {
    setUserLanguage(selectedLanguage);
    setLanguageDialogOpen(false);
    connectToChat();
  };
  
  // 连接到聊天
  const connectToChat = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (sessionId) {
        // 如果有会话ID，直接加入该会话
        // TODO: 验证会话是否存在
        navigate(`/chat/${sessionId}`);
      } else if (userId) {
        // 如果有用户ID，创建与该用户的新会话
        // TODO: 获取用户信息
        // 模拟获取用户信息
        setTargetUserInfo({
          id: userId,
          name: 'Alex Jones',
          avatar: 'https://via.placeholder.com/150',
          status: 'online'
        });
        
        if (user) {
          // 如果已登录，创建新会话
          const newSession = await createChatSession();
          if (newSession) {
            navigate(`/chat/${newSession.id}`);
          } else {
            setError(t.connectError);
          }
        } else {
          // 如果未登录，先要求用户登录或注册
          // 这里可以保存目标用户ID，登录后再创建会话
          // 暂时简单处理，直接导航到登录页
          navigate('/login', { state: { redirectTo: `/connect/user/${userId}` } });
        }
      } else {
        // 无效的连接请求
        setError('无效的连接请求');
      }
      
    } catch (err) {
      console.error('连接失败:', err);
      setError(t.connectError);
    } finally {
      setLoading(false);
    }
  };
  
  // 渲染语言选择对话框
  const renderLanguageDialog = () => {
    return (
      <Dialog 
        open={languageDialogOpen} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: '#4a6bff', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2
          }}
        >
          {t.languageSettings}
          <IconButton 
            edge="end" 
            color="inherit" 
            aria-label="close"
            onClick={handleConfirmLanguage}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
            {t.yourPreferredLanguage}
          </Typography>
          
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f8ff', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6">
              {availableLanguages.find(lang => lang.code === selectedLanguage)?.label.split(/(?=[A-Z])/)[0]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.allMessagesWillBeTranslated}
            </Typography>
          </Paper>
          
          <Typography variant="body1" gutterBottom>
            {t.youCanChooseOtherLanguage}
          </Typography>
          
          <List sx={{ 
            maxHeight: '300px', 
            overflow: 'auto',
            '& .MuiListItem-root': {
              borderRadius: 1,
              mb: 0.5,
              '&:hover': {
                bgcolor: '#f5f8ff',
              }
            } 
          }}>
            {availableLanguages.map((language) => (
              <ListItem 
                button 
                key={language.code}
                selected={selectedLanguage === language.code}
                onClick={() => handleLanguageSelect(language.code)}
                secondaryAction={
                  selectedLanguage === language.code ? (
                    <CheckIcon color="primary" />
                  ) : null
                }
              >
                <ListItemText 
                  primary={language.label} 
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button 
              variant="contained" 
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={handleConfirmLanguage}
              fullWidth
              sx={{ 
                borderRadius: 2,
                py: 1.5
              }}
            >
              {t.confirm}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QR To Chat
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading && !languageDialogOpen ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">{t.connecting}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t.pleaseWait}
            </Typography>
          </Box>
        ) : (
          !languageDialogOpen && targetUserInfo && (
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src={targetUserInfo.avatar}
                  alt={targetUserInfo.name}
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    mr: 2
                  }}
                />
                <Box>
                  <Typography variant="h6">{targetUserInfo.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {targetUserInfo.status === 'online' ? '在线' : '离线'}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body1" paragraph>
                本聊天会打开一个快速聊天频道，二维码与客户端立即联系。现在聊天特别促销活动，解答客户疑问并收集您以改善我们的服务。
                <br />
                <Typography variant="caption" color="text.secondary">
                  (翻译自英文)
                </Typography>
              </Typography>
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                sx={{ mt: 2 }}
                onClick={() => connectToChat()}
              >
                {t.startChatting}
              </Button>
            </Paper>
          )
        )}
      </Container>
      
      {renderLanguageDialog()}
    </Box>
  );
};

export default ConnectPage;