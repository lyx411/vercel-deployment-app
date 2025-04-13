// Serverless API入口点
export default function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 返回API状态
  return res.json({
    status: 'online',
    message: 'Serverless API已启动',
    timestamp: new Date().toISOString(),
    path: req.url,
    query: req.query,
    headers: {
      host: req.headers.host,
      userAgent: req.headers['user-agent']
    }
  });
}