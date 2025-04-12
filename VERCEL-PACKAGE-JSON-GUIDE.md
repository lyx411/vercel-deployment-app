# 准备 package.json 用于 Vercel 部署

在部署到 Vercel 之前，您需要手动更新项目的 `package.json` 文件。请遵循以下步骤：

## 1. 添加 Vercel 专用脚本

将以下脚本添加到 `package.json` 的 `"scripts"` 部分：

```json
"scripts": {
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "build:vercel": "sh ./build-vercel.sh",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "vercel-build": "npm run build:vercel"
}
```

新添加的脚本:
- `"build:vercel"`: 运行 Vercel 专用构建脚本
- `"vercel-build"`: Vercel 会自动识别并运行此脚本

## 2. 确保构建脚本可执行

使用以下命令确保 `build-vercel.sh` 脚本有执行权限：

```bash
chmod +x build-vercel.sh
```

## 3. 验证文件存在

确保以下文件存在于项目根目录：
- `vercel.json` - Vercel 配置文件
- `build-vercel.sh` - Vercel 构建脚本

## 4. 注意事项

- 不要删除现有的脚本
- 确保所有脚本格式正确（包括逗号和格式）
- 修改后验证 JSON 格式是否有效

## 完整的 package.json 示例（scripts 部分）

```json
"scripts": {
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "build:vercel": "sh ./build-vercel.sh",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "vercel-build": "npm run build:vercel"
}
```