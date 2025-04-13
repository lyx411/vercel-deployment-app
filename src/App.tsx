import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import QRCodePage from './pages/QRCodePage';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ChatProvider } from './contexts/ChatContext';
import './styles.css';

const App = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ChatProvider>
          <Router>
            <Routes>
              <Route path="/qrcode/:sessionId?" element={<QRCodePage />} />
              <Route path="/" element={<Navigate to="/qrcode" replace />} />
            </Routes>
          </Router>
        </ChatProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;