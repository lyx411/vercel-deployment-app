// 简化的API桥接文件
// 这个文件在Vercel上作为Serverless函数运行

// 处理所有API请求
export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    message: 'API服务已启动，可以正常接收请求',
    path: req.url
  });
}