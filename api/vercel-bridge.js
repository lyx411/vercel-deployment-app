// Vercel API桥接文件 - 使用无服务器函数处理API请求
export default function handler(req, res) {
  // 为简单的验证请求返回200
  res.status(200).json({
    status: 'ok',
    message: 'API桥接正常工作'
  });
}