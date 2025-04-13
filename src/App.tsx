import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { LanguageProvider } from './contexts/LanguageContext'
import { theme } from './theme'

// 页面组件
import HomePage from './pages/HomePage'
import LanguageSelectionPage from './pages/LanguageSelectionPage'
import ChatPage from './pages/ChatPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/language" element={<LanguageSelectionPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App