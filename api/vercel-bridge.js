// Vercel API桥接文件
export default function handler(req, res) {
  // 只需要简单返回200状态，其他路由交由vercel.json处理
  res.status(200).json({
    message: 'Vercel Serverless Function Bridge - 请求将被重定向到Express应用'
  });
}