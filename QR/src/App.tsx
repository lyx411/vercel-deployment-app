import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';

// 页面组件
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatsListPage from './pages/ChatsListPage';
import ChatPage from './pages/ChatPage';
import QRCodePage from './pages/QRCodePage';
import ConnectPage from './pages/ConnectPage';

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
        <AuthProvider>
          <ChatProvider>
            <Router>
              <Routes>
                <Route path="/" element={<ChatsListPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/chats" element={<ChatsListPage />} />
                <Route path="/chat/:sessionId" element={<ChatPage />} />
                <Route path="/qrcode" element={<QRCodePage />} />
                <Route path="/qrcode/:sessionId" element={<QRCodePage />} />
                
                {/* 扫码后连接路由 */}
                <Route path="/connect/:sessionId" element={<ConnectPage />} />
                <Route path="/connect/user/:userId" element={<ConnectPage />} />
              </Routes>
            </Router>
          </ChatProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;