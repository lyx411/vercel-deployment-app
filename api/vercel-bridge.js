// api/vercel-bridge.js
module.exports = (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 返回API状态信息
  return res.json({
    status: 'online',
    service: 'vercel-bridge',
    timestamp: new Date().toISOString(),
    requestUrl: req.url,
    environment: process.env.VERCEL_ENV || 'development'
  });
};