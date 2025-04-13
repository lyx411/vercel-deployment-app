import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Container, Snackbar, Alert } from '@mui/material';
import QRCode from 'qrcode.react';
import { LanguageContext } from '../contexts/LanguageContext';
import '../styles/qrcode-page.css';

const QRCodePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { language } = useContext(LanguageContext);

  const texts = {
    'zh': {
      title: 'QR码连接',
      subtitle: '扫描二维码连接到聊天',
      generateButton: '生成QR码',
      customUrlLabel: '自定义URL（可选）',
      waitingMessage: '正在生成QR码...',
      copySuccess: '链接已复制到剪贴板',
      errorTitle: '发生错误',
      copyButton: '复制链接',
      downloadButton: '下载QR码',
      backButton: '返回聊天',
    },
    'en': {
      title: 'QR Code Connection',
      subtitle: 'Scan QR code to connect to chat',
      generateButton: 'Generate QR Code',
      customUrlLabel: 'Custom URL (optional)',
      waitingMessage: 'Generating QR code...',
      copySuccess: 'Link copied to clipboard',
      errorTitle: 'An error occurred',
      copyButton: 'Copy Link',
      downloadButton: 'Download QR Code',
      backButton: 'Back to Chat',
    }
  };

  const t = texts[language as keyof typeof texts];

  useEffect(() => {
    if (sessionId) {
      generateQRCode();
    }
  }, [sessionId]);

  const generateQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      // 这里可以是一个API调用来获取会话链接
      // 示例: const response = await api.getSessionQRLink(sessionId);
      // 但现在我们直接生成一个URL
      
      const baseUrl = window.location.origin;
      const connectionUrl = customUrl || `${baseUrl}/connect/${sessionId || 'new-session'}`;
      
      setQrValue(connectionUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('无法生成QR码，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrValue)
      .then(() => {
        setSnackbarOpen(true);
      })
      .catch(err => {
        console.error('Could not copy text:', err);
      });
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = url;
      link.click();
    }
  };

  const handleBackToChat = () => {
    if (sessionId) {
      navigate(`/chat/${sessionId}`);
    } else {
      navigate('/chats');
    }
  };

  return (
    <Container className="qrcode-container">
      <Paper elevation={3} className="qrcode-paper">
        <Typography variant="h4" className="qrcode-title">
          {t.title}
        </Typography>
        <Typography variant="subtitle1" className="qrcode-subtitle">
          {t.subtitle}
        </Typography>

        {!sessionId && (
          <TextField
            label={t.customUrlLabel}
            variant="outlined"
            fullWidth
            margin="normal"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="qrcode-input"
          />
        )}

        {!qrValue && !loading && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={generateQRCode}
            className="qrcode-button"
          >
            {t.generateButton}
          </Button>
        )}

        {loading && (
          <Box className="qrcode-loading">
            <CircularProgress />
            <Typography variant="body1">{t.waitingMessage}</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" className="qrcode-error">
            <Typography variant="h6">{t.errorTitle}</Typography>
            <Typography variant="body1">{error}</Typography>
          </Alert>
        )}

        {qrValue && !loading && (
          <Box className="qrcode-result">
            <QRCode 
              id="qr-code"
              value={qrValue} 
              size={200}
              level="H"
              className="qrcode-image"
            />
            
            <Box className="qrcode-actions">
              <Button 
                variant="outlined" 
                onClick={handleCopyLink}
                className="qrcode-action-button"
              >
                {t.copyButton}
              </Button>
              <Button 
                variant="outlined" 
                onClick={downloadQRCode}
                className="qrcode-action-button"
              >
                {t.downloadButton}
              </Button>
            </Box>
            
            {sessionId && (
              <Button 
                variant="text" 
                color="primary" 
                onClick={handleBackToChat}
                className="qrcode-back-button"
              >
                {t.backButton}
              </Button>
            )}
          </Box>
        )}
      </Paper>
      
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success">
          {t.copySuccess}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default QRCodePage;