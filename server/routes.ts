import { Express, Request, Response, NextFunction } from 'express';

export default function setupRoutes(app: Express) {
  // 健康检查端点
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 获取服务器时间
  app.get('/api/time', (req: Request, res: Response) => {
    res.json({ 
      serverTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone 
    });
  });

  // 获取环境信息
  app.get('/api/environment', (req: Request, res: Response) => {
    res.json({
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: process.platform,
      nodeVersion: process.version,
    });
  });

  // 模拟API端点 - 获取用户信息
  app.get('/api/user/:id', (req: Request, res: Response) => {
    const userId = req.params.id;
    
    // 返回模拟用户数据
    res.json({
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      createdAt: new Date().toISOString()
    });
  });

  // 回显POST数据
  app.post('/api/echo', (req: Request, res: Response) => {
    res.json({
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  });
  
  // 示例：聊天API
  app.post('/api/chat', (req: Request, res: Response) => {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: '缺少消息内容'
      });
    }
    
    // 返回模拟响应
    res.json({
      id: `msg_${Date.now()}`,
      text: `回复: ${message}`,
      timestamp: new Date().toISOString()
    });
  });

  // 子路由分组示例
  const productRoutes = express.Router();
  
  productRoutes.get('/', (req: Request, res: Response) => {
    res.json([
      { id: 1, name: 'Product 1', price: 99.99 },
      { id: 2, name: 'Product 2', price: 149.99 },
      { id: 3, name: 'Product 3', price: 199.99 }
    ]);
  });
  
  productRoutes.get('/:id', (req: Request, res: Response) => {
    const productId = parseInt(req.params.id);
    res.json({
      id: productId,
      name: `Product ${productId}`,
      price: 99.99 * productId,
      description: `这是产品 ${productId} 的详细描述`
    });
  });
  
  app.use('/api/products', productRoutes);
}