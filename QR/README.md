# QR聊天应用

这是一个基于二维码的多语言聊天应用，允许用户通过扫描二维码直接进入聊天会话。

## 功能特点

- 🌐 多语言支持与翻译功能
- 📱 移动优先的响应式设计
- 🔄 实时聊天与消息同步
- 📊 二维码生成与分享功能
- 🔒 用户认证与会话管理

## 技术栈

- React + TypeScript
- Material UI 组件库
- Vite 构建工具
- Supabase 后端服务

## 开发指南

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── assets/        # 静态资源
├── components/    # 通用组件
├── contexts/      # 上下文管理
├── hooks/         # 自定义钩子
├── models/        # 数据模型
├── pages/         # 页面组件
├── services/      # API服务
└── utils/         # 工具函数
```

## 部署说明

应用已配置为可直接在Vercel上自动部署。每次推送到主分支会触发自动构建和部署流程。

## 许可证

MIT