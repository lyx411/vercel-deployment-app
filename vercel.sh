#!/bin/bash

# 确保SPA路由在Vercel上正常工作
mkdir -p dist/public
touch dist/public/index.html
echo '
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0;url=/" />
    <title>重定向到主页</title>
  </head>
  <body>
    <p>如果您未被自动重定向，请<a href="/">点击这里</a>.</p>
  </body>
</html>
' > dist/public/index.html

# 复制_redirects文件到构建目录
cp public/_redirects dist/public/ 2>/dev/null || :

echo "SPA路由配置完成"