# Vercel Deployment App

这是一个展示Vercel部署功能的演示应用，包含多语言聊天功能和实时翻译功能。

## 功能

- 实时聊天
- 多语言支持
- 自动翻译
- WebSocket 实时更新
- 提供 REST API 与 SQL 直接操作的同步实现

## 技术栈

- **前端**: React, TypeScript, Tailwind CSS, Vite
- **后端**: Node.js, Express, Supabase
- **实时通讯**: WebSocket
- **部署**: Vercel

## 快速开始

### 环境要求

- Node.js 18.0.0+
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 部署

查看 `VERCEL-DEPLOYMENT-GUIDE.md` 文件了解如何在 Vercel 上部署这个应用。

## 环境变量

在 `.env` 文件中配置以下环境变量（参考 `.env.example`）：

```
# 数据库连接字符串
DATABASE_URL=postgres://user:password@host:port/database

# Supabase连接设置
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# 会话密钥
SESSION_SECRET=your-session-secret-at-least-32-characters-long
```

## 项目结构

```
/
├── client/         # 前端代码
│   ├── src/          # 源代码
│   │   ├── components/  # React 组件
│   │   ├── contexts/    # React 上下文
│   │   ├── hooks/       # 自定义 Hooks
│   │   ├── lib/         # 工具函数和 API 客户端
│   │   ├── pages/       # 页面组件
│   │   ├── App.tsx      # 主应用组件
│   │   └── main.tsx      # 应用入口点
│   └── public/       # 静态资源
├── server/         # 后端代码
│   ├── index.ts      # 服务器入口点
│   └── routes.ts     # API 路由
├── shared/         # 前后端共享代码
│   └── schema.ts     # 类型定义
├── .env.example    # 环境变量示例
├── package.json     # 项目配置和依赖
├── tsconfig.json    # TypeScript 配置
├── vite.config.ts   # Vite 配置
└── vercel.json      # Vercel 部署配置
```

## 许可证

MIT
