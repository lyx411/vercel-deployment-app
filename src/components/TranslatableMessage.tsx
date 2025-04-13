import { useState, useEffect } from 'react'
import { Typography, Box, CircularProgress } from '@mui/material'
import { Message } from '../pages/ChatPage'
import { registerTranslationCallback, unregisterTranslationCallback } from '../lib/supabase'

interface TranslatableMessageProps {
  message: Message
  userLanguage: string
}

const TranslatableMessage = ({ message, userLanguage }: TranslatableMessageProps) => {
  const [translatedContent, setTranslatedContent] = useState(message.translated_content)
  const [translationStatus, setTranslationStatus] = useState(message.translation_status)
  
  useEffect(() => {
    // 更新本地状态
    setTranslatedContent(message.translated_content)
    setTranslationStatus(message.translation_status)
    
    // 只对主机发送的消息进行翻译
    if (message.sender === 'host') {
      // 注册回调函数来处理翻译完成事件
      const callback = (translatedText: string) => {
        console.log(`[翻译回调] 消息 ID ${message.id} 翻译完成:`, translatedText)
        setTranslatedContent(translatedText)
        setTranslationStatus('completed')
      }
      
      registerTranslationCallback(message.id, callback)
      
      return () => {
        // 清理回调
        unregisterTranslationCallback(message.id)
      }
    }
  }, [message])
  
  // 当用户发送的消息显示原始文本
  if (message.sender === 'user') {
    return <Typography>{message.content}</Typography>
  }
  
  // 主机发送的消息显示翻译文本（如果可用）
  if (translationStatus === 'completed' && translatedContent) {
    return <Typography>{translatedContent}</Typography>
  }
  
  // 正在翻译
  if (translationStatus === 'pending') {
    return (
      <Box>
        <Typography>{message.content}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <CircularProgress size={12} sx={{ mr: 1 }} />
          <Typography variant="caption" color="text.secondary">
            正在翻译...
          </Typography>
        </Box>
      </Box>
    )
  }
  
  // 翻译失败或其他情况下显示原始文本
  return <Typography>{message.content}</Typography>
}

export default TranslatableMessage