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
            {/* 生成QR码的页面 */}
            <Route path="/" element={<QRCodePage />} />
            <Route path="/qrcode" element={<QRCodePage />} />
            
            {/* 扫码后的路由 - 先选择语言，再进入聊天 */}
            <Route path="/connect/:sessionId" element={<ConnectPage />} />
            <Route path="/connect/user/:userId" element={<ConnectPage />} />
            
            {/* 聊天页面 */}
            <Route path="/chat/:sessionId" element={<ChatPage />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;