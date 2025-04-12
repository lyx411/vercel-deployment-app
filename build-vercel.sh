#!/bin/bash

# 确保脚本在错误时立即退出
set -e

echo "=== 开始构建应用 ==="

# 安装依赖
echo "=== 安装依赖 ==="
npm install

# 确保 API 目录存在
echo "=== 创建 API 目录 ==="
mkdir -p api

# 复制服务器文件到 API 目录
echo "=== 复制服务器文件到 API 目录 ==="
cp -r server/* api/
cp -r shared api/

# 创建 API 入口文件
echo "=== 创建 API 入口文件 ==="
cat > api/index.js << 'EOL'
// Vercel Serverless API 入口点
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { registerRoutes } from './routes';

const app = express();
app.use(cors());
app.use(express.json());

// 注册所有API路由
const server = createServer(app);
registerRoutes(app, server);

// 导出 Vercel Serverless 函数
export default async function handler(req, res) {
  // 适配 Vercel Serverless 请求到 Express
  app(req, res);
}
EOL

# 构建前端
echo "=== 构建前端 ==="
npm run build

echo "=== 构建完成 ==="