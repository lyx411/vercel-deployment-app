import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress, 
  IconButton, 
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const QRCodePage = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { userLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  
  // 生成QR码
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 构建URL
        const baseUrl = window.location.origin;
        const connectUrl = sessionId 
          ? `${baseUrl}/connect/${sessionId}` 
          : `${baseUrl}/connect/user/guest1`;
        
        setShareUrl(connectUrl);
        
        // 使用QR码生成API - 高品质设置
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(connectUrl)}&margin=10&qzone=2&format=png&ecc=H`;
        setQrCodeUrl(qrApiUrl);
        
        setLoading(false);
      } catch (err) {
        console.error('QR码生成失败:', err);
        setError(t.errorGenerating);
        setLoading(false);
      }
    };
    
    generateQRCode();
  }, [sessionId]);
  
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
    link.download = `qrtochat-${sessionId || 'guest'}.png`;
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
    <Box sx={{ 
      height: '100vh', 
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
        alignItems: 'center'
      }}>
        <IconButton
          sx={{ mr: 1.5, color: 'white' }}
          onClick={() => navigate(sessionId ? `/chat/${sessionId}` : '/')}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {t.title}
        </Typography>
      </Box>
      
      {/* 内容区域 */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            borderRadius: 2, 
            width: '100%',
            maxWidth: 420,
            mx: 'auto',
            textAlign: 'center',
            bgcolor: 'white'
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ fontWeight: 500, mb: 2 }}
          >
            {t.subtitle}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              position: 'relative',
              my: 3
            }}
          >
            {loading ? (
              <CircularProgress size={60} />
            ) : (
              <Box position="relative">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  style={{ 
                    width: 220, 
                    height: 220, 
                    borderRadius: 8
                  }} 
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    backgroundColor: '#4a6bff',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                >
                  {t.scan}
                </Box>
              </Box>
            )}
          </Box>
          
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 1.5,
              mt: 2
            }}
          >
            <Button
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              sx={{ 
                py: 1,
                bgcolor: '#4a6bff',
                '&:hover': {
                  bgcolor: '#3a5ae0',
                }
              }}
            >
              {t.share}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ 
                py: 1,
                borderColor: '#4a6bff',
                color: '#4a6bff',
                '&:hover': {
                  borderColor: '#3a5ae0',
                  bgcolor: 'rgba(74, 107, 255, 0.05)',
                }
              }}
            >
              {t.download}
            </Button>
            
            <Button
              variant="text"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setShareSuccess(true);
              }}
              sx={{ 
                py: 1,
                color: '#666',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                }
              }}
            >
              {t.copyLink}
            </Button>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar
        open={shareSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {t.copied}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QRCodePage;