# 多语言实时通讯应用 - Vercel 部署指南

本指南将帮助您将多语言实时通讯应用部署到 Vercel 平台。

## 准备工作

在开始部署之前，请确保您已经：

1. 创建了 Vercel 账户：[https://vercel.com/signup](https://vercel.com/signup)
2. 安装了 Vercel CLI（可选）：`npm i -g vercel`
3. 确保 Supabase Edge Function 已经正确部署并可访问
4. 准备好 PostgreSQL 数据库连接信息

## 部署步骤

### 方法 1：使用 Vercel 仪表板（推荐）

1. 登录 Vercel 并创建新项目
   - 访问 [https://vercel.com/new](https://vercel.com/new)
   - 连接您的 GitHub/GitLab/Bitbucket 账户
   - 选择包含本项目的仓库

2. 配置项目
   - 框架预设：选择 Vite
   - 根目录：保留默认（项目根目录）
   - 构建命令：`npm run build`
   - 输出目录：`dist`

3. 添加环境变量
   - `DATABASE_URL`：您的 PostgreSQL 数据库 URL
   - `VITE_SUPABASE_URL`：您的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`：您的 Supabase 匿名密钥

4. 点击「部署」按钮

### 方法 2：使用 Vercel CLI

1. 在项目根目录中打开终端
2. 登录 Vercel：
   ```bash
   vercel login
   ```

3. 部署项目：
   ```bash
   vercel
   ```

4. 按照提示设置：
   - 是否链接到现有项目？选择「否」创建新项目
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 开发命令：`npm run dev`

5. 设置环境变量：
   ```bash
   vercel env add DATABASE_URL
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

## 验证部署

1. 部署完成后，Vercel 会提供一个访问链接，类似 `https://your-project-name.vercel.app`
2. 访问该链接并测试应用功能
3. 检查 WebSocket 连接是否正常工作
4. 测试消息翻译功能

## 自定义域名（可选）

1. 在 Vercel 仪表板中选择您的项目
2. 点击「Settings」→「Domains」
3. 添加您的自定义域名并按照指南完成设置

## 常见问题

### WebSocket 连接问题

确保您的 Supabase Edge Function 已部署，并且允许来自 Vercel 域名的 CORS 请求。在 Supabase 项目设置中添加以下域名到 CORS 白名单：

- `https://your-project-name.vercel.app`
- 如果使用自定义域名，也需要添加

### 数据库连接问题

- 检查环境变量 `DATABASE_URL` 是否正确
- 确保数据库允许来自 Vercel 服务器的连接

## 更新部署

每次推送代码到仓库后，Vercel 会自动重新构建和部署。如果您使用 CLI 部署，运行 `vercel` 命令来部署最新更改。