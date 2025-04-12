# 多语言实时通讯应用 - Vercel部署包

## 部署步骤

1. 在Vercel上创建一个新项目
2. 导入GitHub仓库或使用Vercel CLI上传此文件夹
3. 配置以下环境变量:
   - DATABASE_URL: 您的PostgreSQL数据库URL
   - VITE_SUPABASE_URL: 您的Supabase项目URL
   - VITE_SUPABASE_ANON_KEY: 您的Supabase匿名密钥

## 重要说明

- 此部署包针对Vercel平台进行了特别配置
- 确保您的Supabase Edge Function已经部署并正确配置
- 确保在Supabase项目的CORS设置中允许您的Vercel域名访问WebSocket

## 部署指南

### 方法1：使用Vercel CLI

1. 安装Vercel CLI:
   ```
   npm install -g vercel
   ```

2. 在此文件夹中运行:
   ```
   vercel
   ```

3. 按照CLI提示完成部署过程
4. 配置环境变量

### 方法2：通过Vercel网站部署

1. 将此文件夹上传到GitHub仓库
2. 在Vercel控制面板中创建新项目
3. 导入您的GitHub仓库
4. 配置环境变量
5. 部署配置：
   - 构建命令: npm run build
   - 输出目录: dist
   - 开发命令: npm run dev
6. 点击"Deploy"按钮

## 验证部署

1. 部署完成后，访问Vercel提供的URL
2. 打开浏览器开发者工具，检查控制台输出
3. 您应该能看到"WebSocket连接已建立"的消息
4. 测试不同语言的消息翻译功能

## 技术支持

如有任何问题，请联系开发者。