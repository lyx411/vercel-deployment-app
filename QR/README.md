# QR码聊天应用

一个基于React的二维码聊天应用，使用Material UI设计，支持多语言、页面美观的聊天解决方案。

## 功能特点

- 美观的二维码生成和展示
- 支持二维码分享和下载
- 多语言支持（中文和英文）
- 响应式设计，适配各种屏幕大小
- 优雅的动画和交互效果

## 项目结构

```
QR/
├── public/                # 静态资源
├── src/                   # 源代码
│   ├── contexts/          # React上下文
│   ├── pages/             # 页面组件
│   │   ├── QRCodePage.tsx # 二维码展示页面
│   │   └── ConnectPage.tsx# 连接页面
│   ├── styles.css         # 样式文件
│   └── App.tsx            # 主应用组件
└── package.json           # 项目依赖
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build
```

## 技术栈

- React
- TypeScript
- Material UI
- React Router
- CSS3 动画

## 自定义

您可以通过修改`styles.css`文件来自定义二维码页面的外观。

## 许可证

MIT