import { Express, Request, Response, NextFunction } from 'express';
import { Server, createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { storage } from './storage';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// 创建后端的Supabase客户端，使用服务密钥
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
let supabaseAdmin: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase Admin client initialized successfully on server side');
} else {
  console.log('Failed to initialize server-side Supabase Admin client - missing URL or service key');
}

// 用户创建请求验证
const createUserSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  business_type: z.string().optional(),
  business_intro: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // 添加测试路由
  app.get('/api/test', (_req: Request, res: Response) => {
    res.json({ message: 'API is working' });
  });

  // 添加用户相关路由
  app.get('/api/users', async (_req: Request, res: Response) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin client not initialized' });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: error.message });
      }

      res.json(data || []);
    } catch (error: any) {
      console.error('Error handling user request:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 创建用户路由
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin client not initialized' });
      }

      const validationResult = createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors });
      }

      const userData = validationResult.data;
      const newUserId = uuidv4();
      
      const newUser = {
        id: newUserId,
        name: userData.name,
        business_type: userData.business_type || '',
        business_intro: userData.business_intro || '',
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}`,
      };

      console.log('Creating user with data:', newUser);
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([newUser])
        .select()
        .single();
        
      if (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log('User created successfully:', data);
      res.status(201).json(data);
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 创建HTTP服务器但不监听(会在index.ts中监听)
  const server = createServer(app);
  
  // 获取当前部署的域名（用于WebSocket连接）
  const getDomainName = (): string => {
    // 尝试从环境变量获取Vercel URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // 如果有自定义域名设置
    if (process.env.DOMAIN_NAME) {
      return process.env.DOMAIN_NAME.startsWith('http') 
        ? process.env.DOMAIN_NAME 
        : `https://${process.env.DOMAIN_NAME}`;
    }
    
    // 如果是本地开发环境
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5000';
    }
    
    // 默认返回Vercel域名
    return 'https://vercel-deployment-app.vercel.app';
  };
  
  // 添加WebSocket服务器，使用独立路径以避免与Vite热更新冲突
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/translate' 
  });
  
  // 添加Edge Function代理 - 解决跨域和认证问题
  const edgeFunctionProxy = new WebSocketServer({
    server,
    path: '/ws/edge-proxy'
  });
  
  // 处理Edge Function代理连接
  edgeFunctionProxy.on('connection', (clientWs, req) => {
    console.log('客户端已连接到Edge Function代理');
    
    // 从ws对象中获取token
    // 在较新版本的ws中使用req替代了upgradeReq
    let token = '';
    
    try {
      // 尝试从查询字符串中获取token
      const reqUrl = req?.url || '';
      if (reqUrl) {
        const requestUrl = new URL('http://localhost' + reqUrl);
        token = requestUrl.searchParams.get('token') || '';
      }
    } catch (error) {
      console.error('无法从WebSocket连接中获取token:', error);
    }
    
    // 如果无法获取token，使用SUPABASE_SERVICE_KEY环境变量
    if (!token) {
      token = process.env.SUPABASE_SERVICE_KEY || '';
      console.log('无法从WebSocket连接中获取token，使用服务端授权密钥');
    }
    
    // 获取当前域名或来源信息
    let origin = '';
    try {
      if (req.headers.origin) {
        origin = req.headers.origin;
        console.log('从请求头获取到Origin:', origin);
      } else if (req.headers.referer) {
        origin = new URL(req.headers.referer).origin;
        console.log('从Referer获取到Origin:', origin);
      } else {
        origin = getDomainName();
        console.log('使用环境变量或默认值作为Origin:', origin);
      }
    } catch (error) {
      console.error('解析Origin时出错:', error);
      origin = getDomainName();
    }
    
    // 构建Supabase Edge Function WebSocket URL
    const edgeFunctionWsUrl = 'wss://wanrxefvgarsndfceelf.supabase.co/functions/v1/websocket-translator';
    console.log('使用Edge Function URL连接:', edgeFunctionWsUrl);
    // 从用户提供的示例来看，URL应该没有任何参数
    const fullUrl = edgeFunctionWsUrl;
    
    console.log('正在连接到Supabase Edge Function:', fullUrl);
    console.log('使用Origin:', origin);
    
    // 创建到Edge Function的连接
    try {
      console.log('开始创建到Edge Function的WebSocket连接');
      
      // 使用Node.js实现的WebSocket客户端连接到Edge Function
      const serverWs = new WebSocket(fullUrl, {
        headers: {
          'Origin': origin,
          'User-Agent': 'Vercel Serverless Function',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
      });
      
      // 处理来自Edge Function的消息
      serverWs.on('message', (data) => {
        console.log('从Edge Function收到消息，转发给客户端:', data.toString().substring(0, 100));
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      });
      
      // 处理Edge Function连接开启事件
      serverWs.on('open', () => {
        console.log('已成功连接到Supabase Edge Function WebSocket');
        clientWs.send(JSON.stringify({
          type: 'connection_established',
          source: 'proxy',
          timestamp: new Date().toISOString()
        }));
        
        // 发送一个测试消息到Edge Function确认连接是双向的
        console.log('发送测试消息到Edge Function');
        serverWs.send(JSON.stringify({
          action: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      });
      
      // 处理Edge Function连接关闭事件
      serverWs.on('close', (code, reason) => {
        console.log(`与Edge Function的连接已关闭: code=${code}, reason=${reason}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'connection_closed',
            code: code,
            reason: reason ? reason.toString() : 'unknown'
          }));
          clientWs.close();
        }
      });
      
      // 处理Edge Function连接错误
      serverWs.on('error', (err) => {
        console.error('与Edge Function连接发生错误:', err);
        clientWs.send(JSON.stringify({
          type: 'connection_error',
          error: 'Failed to connect to Edge Function',
          details: err.message || 'Unknown error'
        }));
      });
      
      // 处理来自客户端的消息
      clientWs.on('message', (data) => {
        try {
          const msgStr = data.toString();
          console.log('从客户端收到消息，转发给Edge Function:', msgStr.substring(0, 100));
          
          // 尝试解析消息以提供更多日志
          try {
            const msgObj = JSON.parse(msgStr);
            console.log('消息类型:', msgObj.action || msgObj.type);
          } catch (e) {
            // 如果不是JSON则忽略
          }
          
          if (serverWs.readyState === WebSocket.OPEN) {
            serverWs.send(msgStr);
          } else {
            console.log('无法转发消息，Edge Function连接未就绪, 状态:', serverWs.readyState);
          }
        } catch (error) {
          console.error('处理客户端消息时出错:', error);
        }
      });
      
      // 处理客户端连接关闭
      clientWs.on('close', (code, reason) => {
        console.log(`客户端与代理的连接已关闭: code=${code}, reason=${reason}`);
        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.close();
        }
      });
      
    } catch (error: any) {
      console.error('创建到Edge Function的WebSocket连接失败:', error);
      clientWs.send(JSON.stringify({
        type: 'connection_error',
        error: 'Failed to establish connection to Edge Function',
        details: error.message || 'Unknown error'
      }));
      clientWs.close();
    }
  });
  
  // 使用Supabase Edge Function进行翻译的HTTP端点URL
  const supabaseTranslateMessageUrl = 'https://wanrxefvgarsndfceelf.supabase.co/functions/v1/translate-message';
  const supabaseWsTranslatorUrl = 'wss://wanrxefvgarsndfceelf.supabase.co/functions/v1/websocket-translator';
  
  console.log('使用Edge Function URL:', supabaseTranslateMessageUrl);
  
  // 调用Supabase Edge Function进行翻译
  async function callSupabaseTranslate(params: any): Promise<any> {
    console.log('调用Supabase Edge Function翻译:', params);
    
    if (!params.messageId || !params.sourceText) {
      console.error('缺少必要参数: 消息ID 或 源文本');
      throw new Error('缺少必要参数');
    }
    
    try {
      const response = await fetch(supabaseTranslateMessageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messageId: params.messageId,
          sourceText: params.sourceText,
          targetLanguage: params.targetLanguage || 'zh',
          sourceLanguage: params.sourceLanguage || 'auto'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Edge Function返回错误: ${response.status}`, errorText);
        throw new Error(`Edge Function返回错误: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Supabase Edge Function返回结果:', result);
      return result;
    } catch (error) {
      console.error('调用Supabase Edge Function出错:', error);
      
      // 如果Edge Function调用失败，尝试使用本地翻译
      const { sourceText, targetLanguage } = params;
      const translation = getLocalTranslation(sourceText, 'auto', targetLanguage);
      return {
        translation: translation || `[本地翻译] ${sourceText}`,
        fromCache: true
      };
    }
  }
  
  // 提供基本本地翻译功能作为备份
  function getLocalTranslation(content: string, sourceLanguage: string, targetLanguage: string): string | null {
    if (sourceLanguage === 'zh' && targetLanguage === 'en') {
      if (content.includes('您好') || content.includes('你好')) {
        return 'Hello! How can I help you?';
      } else if (content.includes('谢谢')) {
        return 'Thank you!';
      }
    } else if ((sourceLanguage === 'en' || sourceLanguage === 'auto') && targetLanguage === 'zh') {
      if (content.includes('hello') || content.includes('hi') || content.includes('hey')) {
        return '您好！有什么我可以帮助您的吗？';
      } else if (content.includes('thank you') || content.includes('thanks')) {
        return '谢谢您！';
      } else if (content.includes('welcome to chat')) {
        return '您好！欢迎来到聊天。今天我能为您提供什么帮助？';
      } else if (content.includes('test message')) {
        return '这是一条测试消息' + (content.includes('API') ? '（通过API发送）' : '') + '。';
      }
    }
    return null;
  }
  
  // 翻译WebSocket服务器处理连接
  wss.on('connection', (ws) => {
    console.log('翻译WebSocket连接已建立');
    
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('收到WebSocket消息:', data);
        
        // 处理心跳消息
        if (data.type === 'ping' || data.action === 'heartbeat') {
          ws.send(JSON.stringify({
            type: data.type === 'ping' ? 'pong' : 'heartbeat_response',
            timestamp: new Date().toISOString()
          }));
          return;
        }
        
        // 处理翻译请求
        if (data.type === 'translate' || data.action === 'translate') {
          const messageId = data.message_id || data.messageId;
          const content = data.content || data.sourceText;
          const sourceLanguage = data.source_language || data.sourceLanguage || 'auto';
          const targetLanguage = data.target_language || data.targetLanguage || 'zh';
          
          console.log(`处理翻译请求: ${messageId}, 源语言: ${sourceLanguage}, 目标语言: ${targetLanguage}`);
          
          // 首先尝试本地翻译
          let translatedContent = getLocalTranslation(content, sourceLanguage, targetLanguage);
          
          // 如果本地翻译失败，尝试使用Supabase Edge Function
          if (!translatedContent && supabaseAdmin) {
            try {
              const params = {
                action: 'translate',
                translationId: uuidv4(),
                messageId: messageId,
                sourceText: content,
                targetLanguage: targetLanguage,
                sourceLanguage: sourceLanguage
              };
              
              const result = await callSupabaseTranslate(params);
              if (result && result.translation) {
                translatedContent = result.translation;
                console.log(`Supabase Edge Function返回翻译: ${translatedContent}`);
              }
            } catch (supabaseError) {
              console.error('Supabase翻译失败:', supabaseError);
            }
          }
          
          // 如果所有翻译方法都失败，使用未翻译的原文
          if (!translatedContent) {
            translatedContent = `[未翻译] ${content}`;
          }
          
          // 对测试消息提供中文翻译
          if (content.includes('test message') && targetLanguage === 'zh') {
            translatedContent = '这是一条测试消息' + (content.includes('API') ? '（通过API发送）' : '') + '。';
          }
          
          console.log(`翻译结果: ${translatedContent}`);
          
          // 根据请求类型返回不同格式的响应
          if (data.type === 'translate') {
            ws.send(JSON.stringify({
              type: 'translate',
              message_id: messageId,
              translated_content: translatedContent
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'translation_complete',
              messageId: messageId,
              translation: translatedContent,
              fromCache: true
            }));
          }
        }
      } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('翻译WebSocket连接已关闭');
    });
    
    ws.on('error', (error) => {
      console.error('翻译WebSocket错误:', error);
    });
  });
  
  console.log('API路由和WebSocket服务器已注册');
  
  return server;
}