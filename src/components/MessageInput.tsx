import { useState, KeyboardEvent } from 'react'
import { Box, TextField, IconButton } from '@mui/material'
import { Send as SendIcon } from '@mui/icons-material'

interface MessageInputProps {
  onSendMessage: (message: string) => void
}

const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
    }
  }
  
  const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setMessage(value)
    
    // 更新输入状态
    if (value.trim() && !isTyping) {
      setIsTyping(true)
    } else if (!value.trim() && isTyping) {
      setIsTyping(false)
    }
  }
  
  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="输入消息..."
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
            },
          }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSend} 
          disabled={!message.trim()}
          sx={{ ml: 1 }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  )
}

export default MessageInput