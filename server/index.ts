import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import setupRoutes from './routes';

// 加载环境变量
config();

// ESM中获取__dirname的替代方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// JSON解析中间件
app.use(express.json());

// 设置路由
setupRoutes(app);

// 静态文件服务
if (process.env.NODE_ENV === 'production') {
  // 在生产环境中，从dist/public提供静态文件
  const staticPath = path.join(__dirname, '..', 'dist', 'public');
  app.use(express.static(staticPath));
  
  // 对于所有其他请求，返回index.html（用于SPA客户端路由）
  app.get('*', (req, res) => {
    // 跳过已处理的API路由和静态资源
    if (req.path.startsWith('/api/')) return;
    if (req.path.match(/\.(js|css|png|jpg|gif|svg|ico|json)$/)) return;
    
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // 在开发环境中，告知开发者前端由Vite处理
  app.get('/', (req, res) => {
    res.send('开发模式: 前端由Vite开发服务器提供 - 这个是后端服务器');
  });
}

// 全局错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: '服务器发生错误',
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// 启动服务
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

export default app;