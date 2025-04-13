# 多语言实时翻译聊天应用

这是一个使用React、Express和WebSocket技术构建的实时翻译聊天应用，支持多种语言之间的即时翻译。

## 主要功能

- 实时消息传递
- 自动消息翻译
- 多语言支持
- 响应式设计，适配移动端和桌面端
- 用户头像和名称定制

## 技术栈

- **前端**: React, TailwindCSS, Shadcn UI
- **后端**: Express.js, WebSockets
- **数据库**: Supabase
- **翻译**: Supabase Edge Functions

## 快速开始

### 开发环境设置

1. 克隆仓库

```bash
git clone https://github.com/yourusername/multilingual-chat-app.git
cd multilingual-chat-app
```

2. 安装依赖

```bash
npm install
```

3. 创建环境变量文件

复制`.env.example`到`.env`并填写必要的环境变量。

4. 启动开发服务器

```bash
npm run dev
```

### 部署

该应用支持在Vercel上部署，详细请参考[部署文档](./DEPLOY.md)。

## 项目结构

```
├── client          # 前端React应用
├── server          # 后端Express服务器
├── shared          # 共享类型和实用工具
└── package.json    # 项目依赖和脚本
```

## 贡献

欢迎提交PR和Issue！

## 许可证

MIT
