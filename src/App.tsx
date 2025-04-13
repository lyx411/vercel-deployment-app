import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LanguageProvider } from './contexts/LanguageContext';

// 页面组件
import ConnectPage from './pages/ConnectPage';
import ChatPage from './pages/ChatPage';
import QRCodePage from './pages/QRCodePage';

// 创建主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#4a6bff',
    },
    background: {
      default: '#f5f8fa',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/" element={<QRCodePage />} />
            <Route path="/qrcode" element={<QRCodePage />} />
            <Route path="/qrcode/:sessionId" element={<QRCodePage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            
            {/* 扫码后连接路由 */}
            <Route path="/connect/:sessionId" element={<ConnectPage />} />
            <Route path="/connect/user/:userId" element={<ConnectPage />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;