// API适配器，用于在Cloudflare Pages上处理Express API请求
const { Express, Request, Response } = require('express');

/**
 * 创建Express请求对象
 * @param {Request} request Cloudflare请求对象
 * @param {URL} url 解析后的URL对象
 * @returns {Object} Express请求对象
 */
function createExpressRequest(request, url) {
  // 提取查询参数
  const query = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // 创建基本请求对象
  const expressRequest = {
    method: request.method,
    url: url.pathname + url.search,
    headers: {},
    query,
    params: {},
    path: url.pathname,
    body: undefined
  };

  // 复制请求头
  for (const [key, value] of request.headers.entries()) {
    expressRequest.headers[key.toLowerCase()] = value;
  }

  return expressRequest;
}

/**
 * 创建Express响应对象
 * @returns {Object} 模拟的Express响应对象及其getResult方法
 */
function createExpressResponse() {
  let statusCode = 200;
  let responseHeaders = new Headers();
  let responseData = null;
  let isEnded = false;

  return {
    // 设置状态码
    status(code) {
      statusCode = code;
      return this;
    },
    
    // 设置响应头
    set(key, value) {
      responseHeaders.set(key, value);
      return this;
    },
    
    // 发送JSON响应
    json(data) {
      responseData = JSON.stringify(data);
      responseHeaders.set('Content-Type', 'application/json');
      isEnded = true;
      return this;
    },
    
    // 发送任意响应
    send(data) {
      if (typeof data === 'object') {
        return this.json(data);
      }
      responseData = String(data);
      if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', 'text/plain');
      }
      isEnded = true;
      return this;
    },
    
    // 结束响应
    end() {
      isEnded = true;
      return this;
    },
    
    // 获取组装的响应结果
    getResult() {
      if (!isEnded) {
        this.end();
      }
      
      return new Response(responseData, {
        status: statusCode,
        headers: responseHeaders
      });
    }
  };
}

/**
 * 处理API请求
 * @param {Request} request Cloudflare请求对象
 * @param {Object} env 环境变量
 * @param {Object} ctx 上下文
 * @returns {Promise<Response>} Cloudflare响应对象
 */
export async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  
  // 创建Express请求和响应对象
  const req = createExpressRequest(request, url);
  const res = createExpressResponse();
  
  // 解析JSON请求体
  if (req.headers['content-type']?.includes('application/json')) {
    try {
      const jsonBody = await request.json();
      req.body = jsonBody;
    } catch (error) {
      console.error('解析JSON请求体失败:', error);
      res.status(400).json({ error: '无效的JSON' });
      return res.getResult();
    }
  }
  
  // 解析URL编码的表单
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    try {
      const formData = await request.formData();
      req.body = {};
      for (const [key, value] of formData.entries()) {
        req.body[key] = value;
      }
    } catch (error) {
      console.error('解析表单数据失败:', error);
      res.status(400).json({ error: '无效的表单数据' });
      return res.getResult();
    }
  }
  
  // 动态导入Express应用
  // 注意：在Workers环境中可能需要调整导入方式
  try {
    const { default: appSetup } = await import('../server/index.js');
    const app = appSetup();
    
    // 模拟Express的请求处理
    let handled = false;
    const next = (err) => {
      if (err) {
        console.error('Express错误:', err);
        res.status(500).json({ error: '内部服务器错误' });
        handled = true;
      }
    };
    
    // 使用Promise包装来捕获异步错误
    try {
      // 使用简化的Express路由逻辑处理请求
      // 实际场景中可能需要更复杂的路由匹配逻辑
      if (app._router && app._router.stack) {
        for (const layer of app._router.stack) {
          if (layer.route) {
            const route = layer.route;
            const pathRegex = new RegExp('^' + route.path.replace(/:[^\s/]+/g, '([^/]+)') + '$');
            
            if (pathRegex.test(req.path) && route.methods[req.method.toLowerCase()]) {
              // 提取路径参数
              const matches = req.path.match(pathRegex);
              if (matches && matches.length > 1) {
                const paramNames = route.path.match(/:[^\s/]+/g) || [];
                paramNames.forEach((param, index) => {
                  req.params[param.substring(1)] = matches[index + 1];
                });
              }
              
              // 执行路由处理函数
              await Promise.all(route.stack.map(async (handler) => {
                if (!handled) {
                  await new Promise((resolve) => {
                    handler.handle(req, res, (err) => {
                      next(err);
                      resolve();
                    });
                  });
                }
              }));
              
              handled = true;
              break;
            }
          }
        }
      }
      
      // 如果没有路由处理，尝试通过手动调用路由函数
      if (!handled) {
        const { registerRoutes } = await import('../server/routes.js');
        
        // 创建一个模拟Express app对象
        const mockApp = {
          get: (path, handler) => {
            if (req.method === 'GET' && (path === req.path || path === '*')) {
              handler(req, res, next);
              handled = true;
            }
          },
          post: (path, handler) => {
            if (req.method === 'POST' && (path === req.path || path === '*')) {
              handler(req, res, next);
              handled = true;
            }
          },
          put: (path, handler) => {
            if (req.method === 'PUT' && (path === req.path || path === '*')) {
              handler(req, res, next);
              handled = true;
            }
          },
          delete: (path, handler) => {
            if (req.method === 'DELETE' && (path === req.path || path === '*')) {
              handler(req, res, next);
              handled = true;
            }
          },
          use: (path, handler) => {
            if (typeof handler !== 'function' && typeof path === 'function') {
              handler = path;
              path = '/';
            }
            
            if (req.path.startsWith(path) || path === '*') {
              handler(req, res, next);
              handled = true;
            }
          }
        };
        
        await registerRoutes(mockApp);
      }
      
      // 仍未处理，返回404
      if (!handled) {
        res.status(404).json({ error: '找不到请求的API路径' });
      }
    } catch (error) {
      console.error('处理请求时出错:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '内部服务器错误', details: error.message });
      }
    }
    
    return res.getResult();
  } catch (error) {
    console.error('加载服务器模块失败:', error);
    return new Response(JSON.stringify({ error: '服务器初始化失败', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 导出Worker处理程序
export default {
  async fetch(request, env, ctx) {
    return handleApiRequest(request, env, ctx);
  }
};