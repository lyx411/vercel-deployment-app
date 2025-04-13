// 创建Vercel友好的API入口点
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import '../dist/index.js';

// 确保Vercel不会超时
export default async function handler(req, res) {
  // 对于Vercel Serverless环境的处理
  res.status(200).json({ status: 'API ready', serverless: true });
}