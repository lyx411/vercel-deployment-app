import React, { useState, useRef } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid } from '@mui/material';
import QRCode from 'qrcode.react';
import html2canvas from 'html2canvas';
import '../styles/qrcode-page.css';

const QRCodePage: React.FC = () => {
  const [qrValue, setQrValue] = useState('https://example.com');
  const [qrSize, setQrSize] = useState(200);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrValue(e.target.value);
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    if (size >= 100 && size <= 500) {
      setQrSize(size);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeRef.current) {
      html2canvas(qrCodeRef.current).then((canvas) => {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  return (
    <Container maxWidth="md" className="qrcode-container">
      <Paper elevation={3} className="qrcode-paper">
        <Typography variant="h4" component="h1" gutterBottom className="qrcode-title">
          二维码生成器
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom>
                输入内容:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={qrValue}
                onChange={handleValueChange}
                placeholder="输入网址或文本"
                className="qrcode-input"
              />
            </Box>
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom>
                二维码大小:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                type="number"
                value={qrSize}
                onChange={handleSizeChange}
                inputProps={{ min: 100, max: 500 }}
                className="qrcode-input"
              />
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={downloadQRCode}
              className="qrcode-button"
              fullWidth
            >
              下载二维码
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              height="100%"
              className="qrcode-preview"
              ref={qrCodeRef}
            >
              <QRCode 
                value={qrValue} 
                size={qrSize} 
                level="H"
                includeMargin
                renderAs="svg"
              />
            </Box>
          </Grid>
        </Grid>
        <Box mt={4} textAlign="center" className="qrcode-footer">
          <Typography variant="body2" color="textSecondary">
            简单易用的二维码生成工具 © 2023
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default QRCodePage;