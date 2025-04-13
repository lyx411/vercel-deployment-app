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
  Alert,
  Zoom,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles.css'; // 导入样式

const QRCodePage = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { user } = useAuth();
  const { userLanguage } = useLanguage();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [animation, setAnimation] = useState<boolean>(false);
  
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
        
        setShareUrl(connectUrl);
        
        // 使用QR码生成API - 高品质设置
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(connectUrl)}&margin=10&qzone=2&format=png&ecc=H`;
        setQrCodeUrl(qrApiUrl);
        
        setLoading(false);
        // 添加出现动画延迟
        setTimeout(() => setAnimation(true), 100);
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
        await navigator.share({
          title: t.shareTitle,
          text: t.shareText,
          url: shareUrl,
        });
      } else {
        // 如果不支持Web Share API，复制链接到剪贴板
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
    link.download = `qrchat-${sessionId || user?.id}.png`;
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
      share: '分享链接',
      download: '下载二维码',
      back: '返回',
      copied: '链接已复制到剪贴板！',
      errorGenerating: 'QR码生成失败',
      errorSharing: '分享失败',
      shareTitle: 'QR扫码聊天',
      shareText: '扫描二维码与我聊天',
      copyLink: '复制链接',
      scan: '扫一扫'
    },
    'en': {
      title: 'QR Code Share',
      subtitle: sessionId 
        ? 'Scan QR code to join this chat' 
        : 'Scan QR code to contact me',
      share: 'Share Link',
      download: 'Download QR',
      back: 'Back',
      copied: 'Link copied to clipboard!',
      errorGenerating: 'Failed to generate QR code',
      errorSharing: 'Failed to share',
      shareTitle: 'QR Code Chat',
      shareText: 'Scan the QR code to chat with me',
      copyLink: 'Copy Link',
      scan: 'Scan'
    }
  };
  
  // 根据用户选择的语言获取对应的翻译
  const t = translations[userLanguage as keyof typeof translations] || translations['zh-CN'];

  return (
    <Box className="qr-page-container">
      <AppBar position="static" elevation={0} className="qr-appbar">
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
          
          <Typography variant="h6" component="div" className="qr-title" sx={{ flexGrow: 1 }}>
            {t.title}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="sm">
        <Fade in={!loading} timeout={800}>
          <Box
            className="qr-fade-in"
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
              elevation={isMobile ? 2 : 3} 
              className="qr-card"
            >
              <Typography 
                variant="h5" 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1a2c5b',
                  mb: 1 
                }}
              >
                {t.title}
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary" 
                paragraph 
                align="center"
                sx={{ mb: 3 }}
              >
                {t.subtitle}
              </Typography>
              
              {error && (
                <Alert severity="error" className="qr-alert-error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Zoom in={animation} timeout={500}>
                <Box className="qr-display-area">
                  {loading ? (
                    <CircularProgress size={60} thickness={4} className="qr-loading-spinner" />
                  ) : (
                    <>
                      <Box sx={{ position: 'relative' }}>
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code" 
                          className="qr-image"
                        />
                        <Box className="qr-scan-badge">
                          {t.scan}
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>
              </Zoom>
              
              <Box 
                className="qr-buttons-container"
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  width: '100%', 
                  gap: 2,
                  flexDirection: isMobile ? 'column' : 'row'
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                  disabled={loading}
                  className="qr-share-button"
                >
                  {t.share}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  disabled={loading}
                  className="qr-download-button"
                >
                  {t.download}
                </Button>
              </Box>
              
              <Button
                variant="text"
                startIcon={<ContentCopyIcon />}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setShareSuccess(true);
                }}
                disabled={loading}
                className="qr-copy-button"
              >
                {t.copyLink}
              </Button>
            </Paper>
          </Box>
        </Fade>
      </Container>
      
      <Snackbar
        open={shareSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" className="qr-alert-success" sx={{ width: '100%' }}>
          {t.copied}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QRCodePage;