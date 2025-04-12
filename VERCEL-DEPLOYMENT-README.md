# Vercel 部署包

这个文件夹包含了将多语言实时通讯应用部署到 Vercel 所需的所有文件和指南。

## 文件列表

1. **vercel.json** - Vercel 配置文件
   - 定义了构建命令、输出目录和路由规则
   - 包含了环境变量配置

2. **build-vercel.sh** - Vercel 专用构建脚本
   - 用于在 Vercel 环境中正确构建应用
   - 创建 API 目录并复制服务器文件

3. **VERCEL-DEPLOYMENT-GUIDE.md** - 部署指南
   - 详细说明如何在 Vercel 上部署应用
   - 包含步骤、验证方法和常见问题解决

4. **VERCEL-PACKAGE-JSON-GUIDE.md** - package.json 更新指南
   - 说明如何更新 package.json 以支持 Vercel 部署
   - 包含需要添加的脚本和检查项

## 部署步骤概要

1. 更新 package.json（参考 VERCEL-PACKAGE-JSON-GUIDE.md）
2. 确保 build-vercel.sh 有执行权限（`chmod +x build-vercel.sh`）
3. 将代码推送到 Git 仓库
4. 在 Vercel 上创建新项目，连接到 Git 仓库
5. 配置环境变量（DATABASE_URL、VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY）
6. 部署项目

## 注意事项

- Vercel 部署仅适用于前端和 API 路由，WebSocket 功能依赖于 Supabase Edge Functions
- 确保您的 Supabase Edge Function 已正确部署
- 在 Supabase CORS 设置中添加您的 Vercel 部署域名

## 其他资源

- [Vercel 文档](https://vercel.com/docs)
- [Supabase Edge Functions 文档](https://supabase.com/docs/guides/functions)

请参考 VERCEL-DEPLOYMENT-GUIDE.md 获取详细的部署步骤。