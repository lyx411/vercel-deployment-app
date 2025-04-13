import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 记录API请求和响应
app.use((req, res, next) => {
  // 设置CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // 记录请求详情
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // 拦截JSON响应以记录内容
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // 请求完成后记录
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // 简化响应日志
      if (capturedJsonResponse) {
        const simplifiedResponse = typeof capturedJsonResponse === 'object' 
          ? { ...capturedJsonResponse } 
          : capturedJsonResponse;
        
        logLine += ` :: ${JSON.stringify(simplifiedResponse).substring(0, 50)}`;
        if (JSON.stringify(simplifiedResponse).length > 50) logLine += '...';
      }

      log(logLine);
    }
  });

  next();
});

// 启动服务器
(async () => {
  const server = await registerRoutes(app);

  // 错误处理中间件
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "内部服务器错误";

    console.error(`[ERROR] ${err.stack || err}`);
    res.status(status).json({ message });
  });

  // 设置开发环境或生产环境的静态文件服务
  if (process.env.NODE_ENV !== "production") {
    log('开发环境: 使用Vite设置');
    await setupVite(app, server);
  } else {
    log('生产环境: 提供静态文件');
    serveStatic(app);
  }

  // 配置端口并监听
  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`服务器运行在端口 ${port}`);
  });
})();