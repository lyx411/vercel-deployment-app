import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress, 
  IconButton, 
  AppBar, 
  Toolbar, 
  Container,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const QRCodePage = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { user } = useAuth();
  const { userLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  
  // 生成QR码
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 构建应用URL
        const baseUrl = window.location.origin;
        const connectUrl = sessionId 
          ? `${baseUrl}/connect/${sessionId}` 
          : `${baseUrl}/connect/user/${user?.id}`;
        
        // 使用QR码生成API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(connectUrl)}`;
        setQrCodeUrl(qrApiUrl);
        
        setLoading(false);
      } catch (err) {
        console.error('QR码生成失败:', err);
        setError(t.errorGenerating);
        setLoading(false);
      }
    };
    
    if (user) {
      generateQRCode();
    }
  }, [sessionId, user]);
  
  // 处理分享
  const handleShare = async () => {
    try {
      if (navigator.share) {
        const shareUrl = sessionId 
          ? `${window.location.origin}/connect/${sessionId}` 
          : `${window.location.origin}/connect/user/${user?.id}`;
        
        await navigator.share({
          title: t.shareTitle,
          text: t.shareText,
          url: shareUrl,
        });
      } else {
        // 如果不支持Web Share API，复制链接到剪贴板
        const shareUrl = sessionId 
          ? `${window.location.origin}/connect/${sessionId}` 
          : `${window.location.origin}/connect/user/${user?.id}`;
        
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(true);
      }
    } catch (err) {
      console.error('分享失败:', err);
      setError(t.errorSharing);
    }
  };
  
  // 处理下载
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-code-${sessionId || user?.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // 处理复制分享成功提示关闭
  const handleCloseSnackbar = () => {
    setShareSuccess(false);
  };
  
  // 多语言翻译
  const translations = {
    'zh-CN': {
      title: 'QR码分享',
      subtitle: sessionId 
        ? '扫描二维码加入此聊天' 
        : '扫描二维码联系我',
      share: '分享',
      download: '下载',
      back: '返回',
      copied: '链接已复制到剪贴板！',
      errorGenerating: 'QR码生成失败',
      errorSharing: '分享失败',
      shareTitle: 'QR扫码聊天',
      shareText: '扫描二维码与我聊天',
    },
    'en': {
      title: 'QR Code Share',
      subtitle: sessionId 
        ? 'Scan QR code to join this chat' 
        : 'Scan QR code to contact me',
      share: 'Share',
      download: 'Download',
      back: 'Back',
      copied: 'Link copied to clipboard!',
      errorGenerating: 'Failed to generate QR code',
      errorSharing: 'Failed to share',
      shareTitle: 'QR Code Chat',
      shareText: 'Scan the QR code to chat with me',
    }
  };
  
  // 根据用户选择的语言获取对应的翻译
  const t = translations[userLanguage as keyof typeof translations] || translations['zh-CN'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={() => navigate(sessionId ? `/chat/${sessionId}` : '/chats')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t.title}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 4,
            pb: 4,
          }}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography variant="h5" gutterBottom align="center">
              {t.title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph align="center">
              {t.subtitle}
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box 
              sx={{ 
                mt: 2, 
                mb: 3, 
                p: 2, 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: 240,
                bgcolor: 'background.paper'
              }}
            >
              {loading ? (
                <CircularProgress />
              ) : (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%' 
                  }} 
                />
              )}
            </Box>
            
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                width: '100%', 
                gap: 2 
              }}
            >
              <Button
                variant="contained"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                {t.share}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                {t.download}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
      
      <Snackbar
        open={shareSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={t.copied}
      />
    </Box>
  );
};

export default QRCodePage;