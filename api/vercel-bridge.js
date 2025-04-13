// Vercel API桥接文件
module.exports = (req, res) => {
  // 处理CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 简单响应，告知API服务在线
  res.status(200).json({
    status: 'online',
    message: 'API服务已启动',
    timestamp: new Date().toISOString(),
    path: req.url
  });
};