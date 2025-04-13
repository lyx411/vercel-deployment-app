import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Paper,
  Avatar,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { formatRelative } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Message } from '../models/types';

// 模拟聊天数据
const mockMessages: Message[] = [
  {
    id: '1',
    chat_session_id: 'session1',
    content: '我们打开了一个快捷聊天窗口！现在，您可以在此获得产品建议、了解促销活动，解答客户疑问并改善对我们的服务。',
    sender_id: 'host1',
    sender_name: 'Alex Jones',
    is_host: true,
    created_at: new Date(Date.now() - 240000).toISOString(),
    read: true
  },
  {
    id: '2',
    chat_session_id: 'session1',
    content: '欢迎来到聊天！请问有什么可以帮助您的吗？',
    sender_id: 'host1',
    sender_name: 'Alex Jones',
    is_host: true,
    created_at: new Date(Date.now() - 120000).toISOString(),
    read: true
  }
];

const ChatPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { userLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 滚动到消息列表底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 处理消息发送
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    try {
      // 创建新消息
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        chat_session_id: sessionId || 'session1',
        content: messageInput,
        sender_id: 'guest1', 
        sender_name: '我', 
        is_host: false,
        created_at: new Date().toISOString(),
        read: true
      };
      
      // 添加消息到列表
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      
      // 模拟自动回复
      setTimeout(() => {
        const autoReply: Message = {
          id: `msg_${Date.now() + 1}`,
          chat_session_id: sessionId || 'session1',
          content: '我收到了你的消息！这是一个模拟的自动回复。',
          sender_id: 'host1',
          sender_name: 'Alex Jones',
          is_host: true,
          created_at: new Date().toISOString(),
          read: true
        };
        setMessages(prev => [...prev, autoReply]);
      }, 1000);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };
  
  // 处理回车键发送消息
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // 根据语言选择日期格式化区域设置
  const getLocale = () => {
    switch (userLanguage) {
      case 'zh-CN':
        return zhCN;
      case 'en':
        return enUS;
      default:
        return zhCN;
    }
  };
  
  // 格式化消息时间
  const formatMessageTime = (dateString: string) => {
    try {
      return formatRelative(new Date(dateString), new Date(), {
        locale: getLocale(),
      });
    } catch (error) {
      console.error('日期格式化错误:', error);
      return '';
    }
  };
  
  // 多语言翻译
  const translations = {
    'zh-CN': {
      inputMessage: '输入信息...',
      saveChat: '保存聊天记录',
      noMessages: '暂无消息'
    },
    'en': {
      inputMessage: 'Type a message...',
      saveChat: 'Save chat history',
      noMessages: 'No messages yet'
    },
  };
  
  // 根据用户选择的语言获取对应的翻译
  const t = translations[userLanguage as keyof typeof translations] || translations['zh-CN'];

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      bgcolor: '#f5f7fa'
    }}>
      {/* 顶部栏 */}
      <Box sx={{ 
        bgcolor: 'white', 
        py: 1.5, 
        px: 2, 
        borderBottom: '1px solid #e6e9f0',
        display: 'flex',
        alignItems: 'center'
      }}>
        <IconButton
          sx={{ mr: 1 }}
          onClick={() => navigate(-1)}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexGrow: 1
        }}>
          <Avatar 
            src="https://ui-avatars.com/api/?name=Alex+Jones&background=4a6bff&color=fff&size=200"
            alt="Alex Jones"
            sx={{ width: 40, height: 40, mr: 1.5 }}
          />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
              Alex Jones
            </Typography>
            <Typography variant="caption" sx={{ color: 'success.main' }}>
              客户经理
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* 聊天区域 */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        py: 2,
        px: { xs: 1.5, sm: 3 },
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.is_host ? 'flex-start' : 'flex-end',
                mb: 2,
                maxWidth: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: message.is_host ? 'row' : 'row-reverse',
                  alignItems: 'flex-end',
                  maxWidth: '85%',
                }}
              >
                {message.is_host && (
                  <Avatar
                    src="https://ui-avatars.com/api/?name=Alex+Jones&background=4a6bff&color=fff&size=200"
                    alt={message.sender_name}
                    sx={{
                      width: 36,
                      height: 36,
                      mr: 1,
                    }}
                  />
                )}
                
                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      px: 2,
                      backgroundColor: message.is_host ? 'white' : '#4a6bff',
                      color: message.is_host ? 'text.primary' : 'white',
                      borderRadius: message.is_host 
                        ? '0px 12px 12px 12px' 
                        : '12px 0px 12px 12px',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                      fontSize: '0.95rem',
                      boxShadow: message.is_host 
                        ? '0 2px 4px rgba(0,0,0,0.05)' 
                        : 'none'
                    }}
                  >
                    <Typography variant="body1">
                      {message.content}
                    </Typography>
                  </Paper>
                  
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      display: 'block',
                      textAlign: message.is_host ? 'left' : 'right',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      ml: message.is_host ? 0 : 2,
                      mr: message.is_host ? 2 : 0,
                    }}
                  >
                    {formatMessageTime(message.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              {t.noMessages}
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* 输入区域 */}
      <Box sx={{
        p: 2,
        bgcolor: 'white',
        borderTop: '1px solid #e6e9f0'
      }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={t.inputMessage}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  color="primary" 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  sx={{ 
                    bgcolor: '#4a6bff', 
                    color: 'white',
                    width: 36,
                    height: 36,
                    '&:hover': {
                      bgcolor: '#3a5ae0',
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#c5cae9',
                      color: 'white'
                    }
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: { 
              pr: 0.5,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e0e0e0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#b0b0b0',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4a6bff',
              },
              borderRadius: 2,
              bgcolor: '#f9f9f9'
            }
          }}
        />
      </Box>
      
      {/* 重新连接信息 (仅在需要时渲染) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'none' // 只在需要时显示
        }}
      >
        <Paper
          elevation={2}
          sx={{
            py: 1,
            px: 2,
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 5,
            bgcolor: '#f5f7fa',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <CircularProgress size={16} sx={{ mr: 1 }} />
          <Typography variant="caption">
            正在重新连接...
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatPage;