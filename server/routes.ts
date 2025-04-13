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
  
  // 添加WebSocket服务器，处理客户端翻译请求
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/translate' 
  });
  
  // 翻译相关的WebSocket连接
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
        
        // 处理翻译请求（简化版，仅返回简单翻译）
        if (data.type === 'translate' || data.action === 'translate') {
          const messageId = data.message_id || data.messageId;
          const content = data.content || data.sourceText;
          const targetLanguage = data.target_language || data.targetLanguage || 'zh';
          
          console.log(`处理翻译请求: ${messageId}, 目标语言: ${targetLanguage}`);
          
          // 简单的固定翻译结果
          let translatedContent = `[已翻译] ${content}`;
          
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