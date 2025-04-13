// api/translate.js
const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // 确保是POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }
  
  try {
    const { text, targetLanguage, sourceLanguage } = req.body
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['text', 'targetLanguage'] 
      })
    }
    
    // 这里是实际的翻译逻辑
    // 在真实应用中，你可能会调用第三方翻译API如Google Translate、DeepL或其他服务
    // 为了演示，我们只是模拟翻译过程
    const mockTranslate = async (text, targetLang) => {
      // 简单模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const translations = {
        en: {
          hello: 'Hello',
          welcome: 'Welcome',
          thanks: 'Thank you',
          help: 'How can I help you?'
        },
        zh: {
          hello: '你好',
          welcome: '欢迎',
          thanks: '谢谢',
          help: '我能帮您什么忙?'
        },
        es: {
          hello: 'Hola',
          welcome: 'Bienvenido',
          thanks: 'Gracias',
          help: '¿Cómo puedo ayudarte?'
        },
        fr: {
          hello: 'Bonjour',
          welcome: 'Bienvenue',
          thanks: 'Merci',
          help: 'Comment puis-je vous aider?'
        }
      }
      
      // 对于任何输入，返回一些带有语言标记的预定义文本
      // 这只是演示，实际上应该调用真实的翻译API
      const languageMarker = targetLang === 'en' ? '' : `[${targetLang}] `
      return `${languageMarker}${text}`
    }
    
    const translatedText = await mockTranslate(text, targetLanguage)
    
    // 返回翻译结果
    return res.status(200).json({
      originalText: text,
      translatedText,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'auto-detect'
    })
    
  } catch (error) {
    console.error('Translation error:', error)
    return res.status(500).json({ 
      error: 'Translation service error', 
      message: error.message 
    })
  }
}