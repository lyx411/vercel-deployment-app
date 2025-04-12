import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, HostInfo } from '@shared/schema';

// Check if Supabase is properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bazwlkkiodtuhepunqwz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

// 确认使用的实际URL和Key
console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key (first 10 chars):', supabaseKey.substring(0, 10) + '...');

// Debug info
console.log('Supabase configured:', isSupabaseConfigured);
if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables are not set correctly');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'not set');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'set' : 'not set');
}

// Force local mode for debugging (set to true to bypass Supabase)
const forceLocalMode = false;

// Track host IDs for sessions
const sessionHostIds: Record<string, string> = {};

// 内存中存储消息翻译，因为数据库中没有这些列
// 键格式：`${messageId}`，值格式：{ translated_content, translation_status }
const messageTranslations: Record<string, {
  translated_content: string | undefined,
  translation_status: 'pending' | 'completed' | 'failed'
}> = {};

// WebSocket连接
let wsConnection: WebSocket | null = null;
let wsConnectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000; // 重连间隔(毫秒)
let heartbeatInterval: number | null = null;
let currentSessionId: string = ''; // 当前会话ID，在初始化WebSocket时设置

// 全局事件发射器
const wsStatusChangeEvents: Array<(status: typeof wsConnectionStatus) => void> = [];

// 获取WebSocket连接状态的函数
export function getWsConnectionStatus(): typeof wsConnectionStatus {
  return wsConnectionStatus;
}

// 监听WebSocket状态变化的函数
export function addWsStatusListener(callback: (status: typeof wsConnectionStatus) => void): () => void {
  wsStatusChangeEvents.push(callback);
  
  // 立即通知当前状态
  callback(wsConnectionStatus);
  
  // 返回移除监听器的函数
  return () => {
    const index = wsStatusChangeEvents.indexOf(callback);
    if (index !== -1) {
      wsStatusChangeEvents.splice(index, 1);
    }
  };
}

// 更新WebSocket状态并触发事件的函数
function updateWsStatus(newStatus: typeof wsConnectionStatus) {
  if (wsConnectionStatus !== newStatus) {
    wsConnectionStatus = newStatus;
    
    // 触发所有状态变化事件
    wsStatusChangeEvents.forEach(callback => {
      try {
        callback(wsConnectionStatus);
      } catch (error) {
        console.error('处理WebSocket状态变化事件时出错:', error);
      }
    });
  }
}

// 翻译映射表 - 模拟基本翻译
const translationMap: Record<string, Record<string, string>> = {
  'en': {
    'Hello! Welcome to the chat. How can I help you today?': '您好！欢迎来到聊天。今天我能为您提供什么帮助？',
    'How can I help you?': '我能帮您什么？',
    'Thank you for your message.': '感谢您的留言。',
    'Is there anything else I can assist with?': '还有什么我能帮助您的吗？'
  },
  'zh': {
    '您好！欢迎来到聊天。今天我能为您提供什么帮助？': 'Hello! Welcome to the chat. How can I help you today?',
    '我能帮您什么？': 'How can I help you?',
    '感谢您的留言。': 'Thank you for your message.',
    '还有什么我能帮助您的吗？': 'Is there anything else I can assist with?'
  }
};

// Initialize Supabase client if configured
export const supabase = (isSupabaseConfigured && !forceLocalMode)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 获取主机消息并请求翻译
async function fetchHostMessagesForTranslation(sessionId: string) {
  if (!sessionId) {
    console.error('fetchHostMessagesForTranslation: sessionId 不能为空');
    return;
  }
  
  console.log(`正在获取会话 ${sessionId} 的主机消息以进行翻译...`);
  
  try {
    // 获取会话的所有消息
    const messages = await getChatMessages(sessionId);
    
    // 找出所有需要翻译的主机消息
    const hostMessages = messages.filter(msg => 
      msg.sender === 'host' && 
      (!msg.translated_content || msg.translation_status === 'failed') &&
      msg.content
    );
    
    console.log(`找到 ${hostMessages.length} 条需要翻译的主机消息`);
    
    if (hostMessages.length === 0) {
      console.log('没有需要翻译的主机消息');
      return;
    }
    
    // 获取用户首选语言
    const targetLanguage = localStorage.getItem('preferredLanguage') || 'zh';
    
    // 为每条消息请求翻译
    for (const message of hostMessages) {
      console.log(`请求翻译主机消息 ID=${message.id}: ${message.content.substring(0, 30)}...`);
      
      await translateMessage(
        message.id,
        message.content,
        'auto', // 让Edge Function自动检测语言
        targetLanguage
      );
      
      // 短暂等待，避免一次发送太多请求
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error('获取并翻译主机消息时出错:', error);
  }
}

// 初始化WebSocket连接
export function initWebSocketConnection(sessionId: string, userLanguage?: string) {
  // 保存当前会话ID
  currentSessionId = sessionId;
  
  // 如果已经有连接，先关闭它
  if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
    console.log('关闭现有的WebSocket连接');
    wsConnection.close();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  updateWsStatus('connecting');
  reconnectAttempts = 0;
  
  // 创建新的WebSocket连接
  try {
    // 配置WebSocket连接策略
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 本地WebSocket URL - 通过本地服务器转发
    const localWsUrl = `${protocol}//${window.location.host}/ws/translate`;
    
    // 根据用户提供的信息，Supabase Edge Function URL
    // 支持多种部署环境的WebSocket连接设置
    const environmentConfig = {
      // Supabase Edge Function的URL (默认)
      supabase: {
        wsUrl: 'wss://wanrxefvgarsndfceelf.supabase.co/functions/v1/websocket-translator',
        name: 'Supabase Edge Function'
      },
      // 本地代理URL (通过本地服务器代理连接到Edge Function)
      local: {
        wsUrl: `${protocol}//${window.location.host}/ws/edge-proxy`,
        name: '本地代理'
      },
      // Cloudflare代理URL (通过Cloudflare Pages代理)
      cloudflare: {
        wsUrl: `${protocol}//${window.location.host}/ws/translate`,
        name: 'Cloudflare代理'
      }
    };
    
    // 获取当前环境
    const isCloudflare = window.location.host.includes('.pages.dev') || 
                         window.location.host.includes('.workers.dev');
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    const isReplit = window.location.host.includes('.replit.dev') || 
                     window.location.host.includes('.replit.app');
    
    // 根据当前环境选择适当的WebSocket URL
    let environment = 'supabase'; // 默认使用Supabase直连
    
    if (isCloudflare) {
      environment = 'cloudflare';
    } else if (isLocalhost) {
      environment = 'local';
    } else if (isReplit) {
      // 在Replit上，可以直接连接到Supabase，因为域名已在白名单中
      environment = 'supabase';
    }
    
    // 从环境配置中获取WebSocket URL
    const selectedConfig = environmentConfig[environment];
    const wsUrl = selectedConfig.wsUrl;
    
    console.log(`检测到部署环境: ${environment} (${selectedConfig.name})`);
    console.log(`将使用WebSocket连接URL: ${wsUrl}`);
    
    // 打印当前域名信息，用于调试白名单问题
    console.log(`当前域名: ${window.location.host}`);
    console.log(`尝试连接到WebSocket URL: ${wsUrl}`);
    
    // 添加调试日志
    if (wsUrl.includes('translate')) {
      console.log(`直接连接到Supabase Edge Function: ${wsUrl}`);
    } else if (wsUrl.includes('edge-proxy')) {
      console.log(`尝试通过本地代理连接到Supabase Edge Function: ${wsUrl}`);
    } else {
      console.log(`直接连接到Supabase Edge Function: ${wsUrl}`);
    }
    
    // 根据您提供的Edge Function代码要求，请求消息需要包含以下字段：
    // - action: 'translate'
    // - sourceText: 要翻译的文本内容
    // - targetLanguage: 目标语言
    // - sourceLanguage: 源语言（使用'auto'让Edge Function自动检测语言）
    console.log('请确认Edge Function已部署并且允许来自此域的WebSocket连接');
    
    // 根据您提供的示例代码 attached_assets/Pasted--WebSocket-function-initWebSocketTranslation-WebSocket-ID-const-ws-1743243746348.txt
    // WebSocket URL不需要添加任何查询参数，直接连接即可

    
    // 直接使用基本URL连接
    console.log(`正在连接WebSocket: ${wsUrl}`);
    
    // 创建WebSocket连接
    wsConnection = new WebSocket(wsUrl);
    
    // 连接开启时
    wsConnection.onopen = () => {
      console.log('WebSocket连接已建立');
      updateWsStatus('connected');
      reconnectAttempts = 0;
      
      // 获取用户偏好语言并发送到Edge Function
      // 从LanguageContext获取用户偏好语言
      console.log('准备设置WebSocket用户偏好语言');
      
      try {
        // 优先使用传入的语言参数，其次从localStorage获取，最后使用浏览器语言
        const storedLang = localStorage.getItem('preferredLanguage');
        const preferredLanguage = userLanguage || storedLang || navigator.language.split('-')[0] || 'zh';
        
        console.log(`发送用户偏好语言到Edge Function: ${preferredLanguage}`, {
          传入参数: userLanguage,
          存储语言: storedLang,
          浏览器语言: navigator.language.split('-')[0]
        });
        
        // 发送用户语言偏好设置到Edge Function
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            action: 'set_user_language',
            language: preferredLanguage,
            sessionId
          }));
        } else {
          console.warn('WebSocket连接未准备好，无法发送用户语言偏好设置');
        }
      } catch (langError) {
        console.error('发送用户语言偏好设置失败:', langError);
      }
      
      // 设置心跳以保持连接
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      heartbeatInterval = setInterval(() => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          // 使用与APP端相同的心跳消息格式
          wsConnection.send(JSON.stringify({
            action: 'heartbeat',
            timestamp: new Date().toISOString(),
            sessionId
          }));
        }
      }, 30000) as unknown as number; // 30秒一次心跳
    };
    
    // 接收消息时 - 处理来自Edge Function的消息
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('收到WebSocket消息:', data);
        
        // 处理连接建立成功的消息
        if (data.type === 'connection_established') {
          console.log('已与WebSocket服务器建立连接:', data);
          console.log('连接ID:', data.connectionId);
          
          // 成功连接后，向Edge Function发送用户首选语言设置
          const preferredLanguage = localStorage.getItem('preferredLanguage') || 'zh';
          console.log(`设置用户首选语言为: ${preferredLanguage}`);
          
          try {
            if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
              wsConnection.send(JSON.stringify({
                action: 'set_language',
                language: preferredLanguage,
                sessionId
              }));
              console.log(`成功发送语言设置请求: ${preferredLanguage}`);
              
              // 连接成功后，请求翻译当前所有需要翻译的消息
              setTimeout(() => {
                fetchHostMessagesForTranslation(sessionId);
              }, 1000);
            } else {
              console.warn('无法发送语言设置请求：WebSocket连接未就绪');
            }
          } catch (error) {
            console.error('发送语言设置请求失败:', error);
          }
          return;
        }
        
        // 处理心跳响应
        if (data.type === 'heartbeat_response') {
          console.log('收到心跳响应:', data.action);
          return;
        }
        
        // 处理旧的翻译响应格式
        if (data.type === 'translation') {
          // 处理翻译响应
          const { message_id, translated_content } = data;
          if (message_id && translated_content) {
            console.log(`收到旧格式翻译结果 (message_id=${message_id}): ${translated_content.substring(0, 30)}...`);
            
            // 保存翻译结果到内存
            messageTranslations[`${message_id}`] = {
              translated_content,
              translation_status: 'completed'
            };
            
            console.log(`消息 ${message_id} 翻译完成: ${translated_content.substring(0, 30)}...`);
            
            // 触发一个全局事件通知组件更新
            document.dispatchEvent(new CustomEvent('message-translated', {
              detail: { messageId: message_id }
            }));
          }
        } 
        // 处理Edge Function的翻译完成响应 
        else if (data.type === 'translation_complete' || data.type === 'translation_result') {
          // 处理翻译响应
          const messageId = data.messageId || data.message_id;
          const translation = data.translation || data.translated_text || data.translated_content;
          const detectedSourceLanguage = data.detectedSourceLanguage || data.source_language || data.sourceLanguage || 'auto';
          
          console.log(`收到翻译结果: 类型=${data.type}, 消息ID=${messageId}, 源语言=${detectedSourceLanguage}`);
          
          if (messageId && translation) {
            // 保存翻译结果到内存
            messageTranslations[`${messageId}`] = {
              translated_content: translation,
              translation_status: 'completed'
            };
            
            console.log(`消息 ${messageId} 翻译完成 (Edge Function): ${translation.substring(0, 30)}...`);
            
            // 更新数据库中的翻译内容
            if (supabase) {
              try {
                supabase
                  .from('messages')
                  .update({ 
                    translated_content: translation,
                    original_language: detectedSourceLanguage || 'auto'
                  })
                  .eq('id', messageId)
                  .then(({ error }) => {
                    if (error) {
                      console.error('无法更新数据库中的翻译:', error);
                    } else {
                      console.log(`消息 ${messageId} 的翻译已保存到数据库`);
                    }
                  });
              } catch (dbError) {
                console.error('保存翻译到数据库出错:', dbError);
              }
            }
            
            // 触发一个全局事件通知组件更新
            document.dispatchEvent(new CustomEvent('message-translated', {
              detail: { messageId }
            }));
          } else {
            console.error('收到翻译结果但缺少必要字段:', data);
          }
        }
        // 处理Edge Function的翻译状态更新
        else if (data.type === 'translation_status') {
          console.log('收到翻译状态更新:', data);
        }
        // 处理Edge Function的错误消息
        else if (data.type === 'translation_error' || data.type === 'error') {
          const messageId = data.messageId || data.message_id;
          const errorMsg = data.error || data.message || '未知错误';
          
          console.error(`翻译消息 ${messageId} 失败:`, errorMsg);
          
          if (messageId) {
            // 标记翻译失败
            messageTranslations[`${messageId}`] = {
              translated_content: undefined,
              translation_status: 'failed'
            };
            
            // 通知组件更新
            document.dispatchEvent(new CustomEvent('message-translated', {
              detail: { messageId, error: errorMsg }
            }));
          }
        } 
        // 处理心跳响应
        else if (data.type === 'pong' || data.type === 'heartbeat_response') {
          // 心跳响应，不做特殊处理
          console.log('收到心跳响应:', data.type);
        } 
        // 处理连接建立消息
        else if (data.type === 'connection_established') {
          console.log('已与WebSocket服务器建立连接:', data);
          // 记录连接ID（如果有）
          if (data.connectionId) {
            console.log('连接ID:', data.connectionId);
          }
        }
      } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
      }
    };
    
    // 连接关闭时
    wsConnection.onclose = () => {
      console.log('WebSocket连接已关闭');
      updateWsStatus('disconnected');
      
      // 清除心跳
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // 尝试重连 (仅限前两次尝试，避免无限循环)
      if (reconnectAttempts < 2) {
        reconnectAttempts++;
        console.log(`尝试重新连接 (${reconnectAttempts}/2)...`);
        // 保持上次使用的userLanguage参数，传递到新的连接
        const storedLang = localStorage.getItem('preferredLanguage');
        const effectiveLanguage = userLanguage || (storedLang ? storedLang : undefined);
        setTimeout(() => initWebSocketConnection(sessionId, effectiveLanguage), reconnectInterval);
      } else {
        console.log('达到最大重连次数，不再尝试Edge Function连接');
        updateWsStatus('failed');
        console.log('将使用本地翻译代替Edge Function');
      }
    };
    
    // 连接错误时
    wsConnection.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      updateWsStatus('failed');
    };
    
    return true;
  } catch (error) {
    console.error('创建WebSocket连接时出错:', error);
    updateWsStatus('failed');
    return false;
  }
}

// 通过WebSocket请求翻译 - 与Edge Function格式保持一致
function requestTranslationViaWebSocket(
  messageId: number,
  content: string,
  sourceLanguage: string = 'auto', // 这个参数传递给Edge Function
  targetLanguage: string = 'en'    // 这个参数传递给Edge Function
): boolean {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    console.log('WebSocket未连接，无法发送翻译请求');
    return false;
  }
  
  try {
    // 确保有目标语言，从localStorage获取
    const effectiveTargetLanguage = targetLanguage || localStorage.getItem('preferredLanguage') || 'zh';
    
    // 创建唯一翻译ID
    const translationId = `tr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 创建符合Edge Function期望的请求结构
    const requestData = {
      action: 'translate',          // Edge Function期望的动作类型
      translationId,                // 唯一ID，用于跟踪请求
      messageId,                    // 消息ID
      sourceText: content,          // 原文内容
      sourceLanguage: sourceLanguage, // 源语言（虽然Edge Function会自动检测，但还是传递）
      targetLanguage: effectiveTargetLanguage, // 目标语言
      sessionId: currentSessionId   // 会话ID (如果Edge Function需要)
    };
    
    console.log(`准备翻译消息(ID=${messageId})到${effectiveTargetLanguage}语言:`, {
      原始内容: content,
      翻译ID: translationId,
      源语言: sourceLanguage,
      目标语言: effectiveTargetLanguage,
      会话ID: currentSessionId
    });
    
    console.log(`通过WebSocket发送翻译请求:`, requestData);
    // wsConnection已经在函数开头检查过是否存在和连接状态，这里可以安全地发送
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify(requestData));
    } else {
      throw new Error('WebSocket连接已断开，无法发送请求');
    }
    
    // 标记为处理中
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'pending'
    };
    
    return true;
  } catch (error) {
    console.error('发送WebSocket翻译请求出错:', error);
    return false;
  }
}

// 简单翻译字典 (APP端翻译流程中的第一优先级)
function tryLocalTranslation(
  content: string,
  sourceLanguage: string = 'auto',
  targetLanguage: string = 'en'  // 默认改为英语
): string | undefined {
  // 确定源语言和目标语言
  let srcLang = sourceLanguage;
  if (srcLang === 'auto') {
    // 简单语言检测，假设含有中文字符则为中文，否则为英文
    srcLang = /[\u4e00-\u9fa5]/.test(content) ? 'zh' : 'en';
  }
  
  // 确保语言代码有效
  srcLang = ['en', 'zh'].includes(srcLang) ? srcLang : 'en';
  const tgtLang = ['en', 'zh'].includes(targetLanguage) ? targetLanguage : 'en';
  
  // 只有当源语言和目标语言不同时才翻译
  if (srcLang === tgtLang) {
    return content;
  }
  
  // 尝试从映射表中查找
  if (translationMap[srcLang] && translationMap[srcLang][content]) {
    return translationMap[srcLang][content];
  }
  
  // 常见短语的硬编码翻译 (作为Edge Function的备选)
  
  // 英文到中文翻译
  if (srcLang === 'en' && tgtLang === 'zh') {
    // 欢迎消息
    if (content.includes('Welcome to the chat')) {
      return '您好！欢迎来到聊天。今天我能为您提供什么帮助？';
    }
    // 其他常见短语
    if (content.includes('How can I help you')) {
      return '我能为您提供什么帮助？';
    }
    if (content.includes('Thank you')) {
      return '谢谢您！';
    }
    if (content.includes('Hello') || content.includes('Hi')) {
      return '你好！';
    }
    if (content.includes('Good morning')) {
      return '早上好！';
    }
    if (content.includes('Good afternoon')) {
      return '下午好！';
    }
    if (content.includes('Good evening')) {
      return '晚上好！';
    }
    if (content.includes('Goodbye') || content.includes('Bye')) {
      return '再见！';
    }
  }
  
  // 中文到英文翻译
  if (srcLang === 'zh' && tgtLang === 'en') {
    if (content.includes('你好') || content.includes('您好')) {
      return 'Hello!';
    }
    if (content.includes('谢谢')) {
      return 'Thank you!';
    }
    if (content.includes('帮助')) {
      return 'Can you help me?';
    }
    if (content.includes('再见')) {
      return 'Goodbye!';
    }
    if (content.includes('早上好')) {
      return 'Good morning!';
    }
    if (content.includes('下午好')) {
      return 'Good afternoon!';
    }
    if (content.includes('晚上好')) {
      return 'Good evening!';
    }
  }
  
  // 返回undefined表示无法本地翻译
  return undefined;
}

// 调用翻译功能（按照用户明确要求：优先使用WebSocket连接）
export async function translateMessage(
  messageId: number, 
  content: string, 
  sourceLanguage: string = 'auto',
  targetLanguage?: string
): Promise<boolean> {
  try {
    // 确保目标语言永远不会是undefined，并且始终使用auto作为源语言让Edge Function自动检测
    const finalTargetLanguage = targetLanguage || 'en';
    
    console.log(`尝试翻译消息 ${messageId}`);
    console.log(`源语言: auto (始终使用auto让Edge Function自动检测), 目标语言: ${finalTargetLanguage}`);
    
    // 0. 先标记为处理中
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'pending'
    };
    
    // 1. 首先尝试通过WebSocket连接到Edge Function
    if (wsConnectionStatus === 'connected') {
      console.log(`尝试通过WebSocket翻译消息 ${messageId}`);
      const wsSuccess = requestTranslationViaWebSocket(
        messageId,
        content,
        'auto', // 始终使用'auto'作为源语言，让Edge Function自动检测
        finalTargetLanguage
      );
      
      if (wsSuccess) {
        console.log('WebSocket翻译请求已发送到Edge Function');
        return true;
      }
    }
    
    // 2. 如果WebSocket不可用，则记录不可用信息
    if (supabase) {
      console.log(`WebSocket不可用，但之前的实现可以正常工作，跳过HTTP调用`);
      
      // 按照您之前的要求和实现，只使用WebSocket进行翻译
      // 如果WebSocket不可用，则直接将翻译标记为失败
      
      // 标记为失败
      messageTranslations[`${messageId}`] = {
        translated_content: undefined,
        translation_status: 'failed'
      };
      
      return false;
    }
    
    // 3. 按照APP端要求，如果Edge Function不可用，不使用本地翻译
    // 虽然这可能会导致缺少翻译，但按照用户要求，我们只使用Edge Function
    
    console.log('Edge Function不可用，按照要求不使用本地翻译');
    
    // 4. 如果所有方法都失败
    console.log('所有翻译方法都失败');
    
    // 标记为失败
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'failed'
    };
    
    return false;
  } catch (error) {
    console.error('调用翻译函数出错:', error);
    
    // 标记为失败
    messageTranslations[`${messageId}`] = {
      translated_content: undefined,
      translation_status: 'failed'
    };
    
    return false;
  }
}

// 辅助函数: 为会话创建欢迎消息
async function createWelcomeMessageForSession(chatSessionId: string, hostId: string) {
  // 确保Supabase已配置
  if (!supabase) {
    console.log('Cannot create welcome message: Supabase not configured');
    return;
  }
  
  // 创建欢迎消息，使用实际的表结构
  const welcomeMessage = {
    chat_session_id: chatSessionId,
    content: "Hello! Welcome to the chat. How can I help you today?",
    sender_id: hostId, // 使用商家ID作为发送者ID
    sender_name: 'Host',
    is_host: true,
    is_first_message: true,
    timestamp: new Date().toISOString()
  };
  
  console.log('Creating initial welcome message for session via REST:', welcomeMessage);
  
  try {
    // 尝试使用REST API创建欢迎消息
    const msgResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(welcomeMessage)
    });

    if (!msgResponse.ok) {
      const errorText = await msgResponse.text();
      console.error('REST API error for welcome message:', errorText);
      throw new Error(`REST API error: ${errorText}`);
    }

    const messageData = await msgResponse.json();
    const welcomeMessageId = messageData[0]?.id;
    console.log('Welcome message created successfully via REST:', welcomeMessageId);
    
    // 自动触发翻译欢迎消息
    if (welcomeMessageId) {
      try {
        // 默认使用英语作为原始语言，中文作为目标语言
        console.log('自动触发欢迎消息翻译...');
        await translateMessage(
          welcomeMessageId,
          welcomeMessage.content,
          'auto', // 让Edge Function自动检测语言
          'zh'  // 目标语言
        );
      } catch (translateError) {
        console.error('欢迎消息翻译失败:', translateError);
      }
    }
  } catch (restMsgError) {
    console.error('REST API failed for welcome message, trying Supabase client API:', restMsgError);
    
    // 回退到Supabase客户端API
    try {
      if (supabase) { // 确认supabase不为null
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert([welcomeMessage])
          .select();
          
        if (messageError) {
          console.error('Error creating welcome message with Supabase client:', messageError);
        } else {
          const welcomeMessageId = messageData?.[0]?.id;
          console.log('Welcome message created successfully with Supabase client:', welcomeMessageId);
          
          // 自动触发翻译欢迎消息
          if (welcomeMessageId) {
            try {
              // 默认使用英语作为原始语言，中文作为目标语言
              console.log('自动触发欢迎消息翻译(Supabase客户端API)...');
              await translateMessage(
                welcomeMessageId,
                welcomeMessage.content,
                'auto', // 让Edge Function自动检测语言
                'zh'  // 目标语言
              );
            } catch (translateError) {
              console.error('欢迎消息翻译失败:', translateError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Both REST and Supabase client API failed for messages:', error);
    }
  }
}

// Fetch host information (merchant details)
export async function getHostInfo(userId: string): Promise<HostInfo | null> {
  try {
    console.log('Fetching host info for userId:', userId);
    
    // If Supabase is not configured, use demo host info
    if (!supabase) {
      console.log('Using local mode for host info (supabase client is null)');
      return {
        id: userId,
        name: "User",
        title: "Online Chat",
        url: "https://example.com",
        avatarUrl: "https://ui-avatars.com/api/?name=User&background=random&size=128",
      };
    }
    
    // In a real implementation, we would fetch this from a table
    // For demo, use static data based on ID
    const hostInfo: HostInfo = {
      id: userId,
      name: "User",
      title: "在线聊天",
      url: "https://example.com",
      avatarUrl: "https://ui-avatars.com/api/?name=User&background=random&size=128",
    };
    
    return hostInfo;
  } catch (error) {
    console.error('Error fetching host info:', error);
    return null;
  }
}

// Get chat messages for a session
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    console.log('Getting chat messages for session:', sessionId);
    console.log('Supabase client initialized:', !!supabase);
    
    // When Supabase is not configured, return empty array initially
    if (!supabase) {
      console.log('Using local mode for messages (supabase client is null)');
      return [];
    }
    
    console.log('Querying messages for session using actual structure:', sessionId);
    
    try {
      // 只获取实际存在的列，使用ID排序确保消息顺序正确
      console.log('Executing SQL:', `
      SELECT id, chat_session_id, content, is_host, timestamp, 
             original_language, translated_content
      FROM messages
      WHERE chat_session_id = '${sessionId}'
      ORDER BY id ASC
    `);
      
      // 在请求前添加调试日志
      console.log('Fetching messages with sessionId:', sessionId);
      const response = await fetch(
        `${supabaseUrl}/rest/v1/messages?chat_session_id=eq.${sessionId}&order=id.asc&select=id,content,is_host,timestamp,original_language,translated_content`, 
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error when fetching messages:', errorText);
        throw new Error(`REST API error: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Found ${data?.length || 0} messages via REST API`);
      
      return (data || []).map((msg: any) => {
        // 使用类型断言确保sender的类型
        const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
        // 获取消息ID用于日志显示
        const msgId = msg.id;
        
        // 从内存缓存中获取翻译信息（如果存在）
        const cachedTranslation = messageTranslations[`${msgId}`];
        
        // 输出调试信息，看消息是否有缓存的翻译
        console.log(`消息ID ${msgId}:`, {
          isHostMessage: senderType === 'host',
          showTranslated: true,
          hasTranslation: !!cachedTranslation?.translated_content,
          autoTranslate: true,
          translationStatus: cachedTranslation?.translation_status || 'pending',
          inTranslatedIds: !!cachedTranslation
        });
        
        // 创建消息对象并提供默认值，优先使用内存中的翻译
        return {
          id: msgId,
          content: msg.content,
          sender: senderType,
          timestamp: new Date(msg.timestamp),
          // 为翻译相关字段提供默认值，优先使用缓存中的值，否则根据内容自动检测语言
          original_language: msg.original_language || (/[\u4e00-\u9fa5]/.test(msg.content) ? 'zh' : 'en'),
          translated_content: cachedTranslation?.translated_content,
          translation_status: cachedTranslation?.translation_status || 'pending'
        };
      });
    } catch (restError) {
      console.error('Direct REST API failed, using directDb as fallback:', restError);
      
      try {
        // 使用directDb.ts中的方法作为备选
        const { getMessagesDirectSql } = await import('./directDb');
        const messages = await getMessagesDirectSql(sessionId);
        if (messages && messages.length > 0) {
          console.log('Messages retrieved through directDb successfully');
          return messages;
        }
        throw new Error('Direct SQL method returned no messages');
      } catch (directDbError) {
        console.error('DirectDb also failed, using regular Supabase API:', directDbError);
        
        // 最后尝试使用Supabase客户端API，只获取实际存在的列
        const { data, error } = await supabase
          .from('messages')
          .select('id, chat_session_id, content, is_host, timestamp, original_language')
          .eq('chat_session_id', sessionId)
          .order('id', { ascending: true });
          
        if (error) {
          console.error('Supabase query error for messages:', error);
          throw error;
        }
        
        console.log(`Found ${data?.length || 0} messages in Supabase`);
        
        return (data || []).map((msg: any) => {
          // 使用类型断言确保sender的类型
          const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
          // 获取消息ID用于日志显示
          const msgId = msg.id;
          
          // 从内存缓存中获取翻译信息（如果存在）
          const cachedTranslation = messageTranslations[`${msgId}`];
          
          // 创建消息对象并提供默认值，优先使用内存中的翻译
          return {
            id: msgId,
            content: msg.content,
            sender: senderType,
            timestamp: new Date(msg.timestamp),
            // 为翻译相关字段提供默认值，优先使用缓存中的值，否则根据内容自动检测语言
            original_language: msg.original_language || (/[\u4e00-\u9fa5]/.test(msg.content) ? 'zh' : 'en'),
            translated_content: cachedTranslation?.translated_content,
            translation_status: cachedTranslation?.translation_status || 'pending'
          };
        });
      }
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// 跟踪已发送的消息内容，防止短时间内重复发送
const recentlySentMessages = new Map<string, number>();
const MESSAGE_COOLDOWN_MS = 2000; // 两秒内不允许发送相同内容

// Send a new message
export async function sendMessage(
  sessionId: string, 
  content: string, 
  isHost: boolean,
  language?: string
): Promise<ChatMessage | null> {
  try {
    // 生成消息指纹（会话ID + 内容 + 发送者类型）
    const messageFingerprint = `${sessionId}:${content}:${isHost ? 'host' : 'guest'}`;
    
    // 检查是否是重复发送的消息
    const lastSentTime = recentlySentMessages.get(messageFingerprint);
    const now = Date.now();
    
    if (lastSentTime && (now - lastSentTime) < MESSAGE_COOLDOWN_MS) {
      console.log(`Preventing duplicate message send: "${content.substring(0, 20)}..." (cooldown: ${now - lastSentTime}ms)`);
      return null;
    }
    
    // 记录此消息已发送的时间
    recentlySentMessages.set(messageFingerprint, now);
    
    // 清理旧消息记录（保持Map大小合理）
    if (recentlySentMessages.size > 20) {
      // 使用 Array.from 替代展开操作符以解决迭代器问题
      const oldEntries = Array.from(recentlySentMessages.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, 10);
      
      for (const [key] of oldEntries) {
        recentlySentMessages.delete(key);
      }
    }
    
    console.log(`Sending ${isHost ? 'host' : 'guest'} message to session:`, sessionId);
    console.log('Supabase client initialized:', !!supabase);
    console.log('Message content:', content.substring(0, 20) + (content.length > 20 ? '...' : ''));
    
    // If Supabase is not configured, generate a local message
    if (!supabase) {
      console.log('Using local mode for sending message (supabase client is null)');
      const timestamp = new Date();
      const senderType = isHost ? ('host' as const) : ('guest' as const);
      return {
        id: Date.now(),
        content,
        sender: senderType,
        timestamp,
        original_language: language || 'auto',
        translated_content: undefined,
        translation_status: 'pending'
      };
    }
    
    // 获取当前会话的主机ID
    let hostId = sessionHostIds[sessionId];
    if (!hostId && isHost) {
      console.log('Host ID not found in cache, trying to fetch session info');
      try {
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('host_id')
          .eq('id', sessionId)
          .single();
          
        if (sessionData?.host_id) {
          hostId = sessionData.host_id;
          sessionHostIds[sessionId] = hostId;
          console.log('Retrieved host_id from database:', hostId);
        }
      } catch (err) {
        console.error('Error retrieving host_id:', err);
        // 如果无法获取主机ID，使用默认UUID
        hostId = '00000000-0000-4000-a000-000000000000';
      }
    }
    
    // Create message object using actual database structure (根据数据库实际结构)
    const message = {
      chat_session_id: sessionId,  // 外键，关联到chat_sessions表
      content: content,
      // sender_id不能为null，给客人消息使用一个特殊的UUID
      sender_id: isHost ? (hostId || '00000000-0000-4000-a000-000000000000') : '00000000-0000-4000-a000-000000000001',
      sender_name: isHost ? 'Host' : 'Guest',  // 发送者名称
      is_host: isHost,  // 是否为主持人
      timestamp: new Date().toISOString(),
      original_language: 'auto' // Edge Function会自动识别语言
    };
    
    console.log('Sending message to Supabase using actual table structure:', message);

    try {
      // 使用实际的表结构插入数据
      const response = await fetch(`${supabaseUrl}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error:', errorText);
        throw new Error(`REST API error: ${errorText}`);
      }

      const data = await response.json();
      console.log('Message successfully sent to Supabase via REST API:', data[0]?.id);
      
      // 确定sender类型
      const senderType = isHost ? ('host' as const) : ('guest' as const);
      
      // 获取消息数据
      const newMessage: ChatMessage = {
        id: data[0].id,
        content: data[0].content,
        sender: senderType,
        timestamp: new Date(data[0].timestamp),
        original_language: data[0].original_language || language || 'auto',
        translated_content: data[0].translated_content,
        translation_status: data[0].translation_status || 'pending'
      };
      
      // 只对主机消息发送后立即触发翻译，使用用户选择的语言（如果有）
      if (isHost) {
        console.log(`为主机消息 ${newMessage.id} 触发翻译，使用语言: ${language || 'en'}`);
        translateMessage(newMessage.id, newMessage.content, 'auto', language)
          .catch((error: Error) => console.error('Failed to trigger translation:', error));
      }
        
      return newMessage;
    } catch (restError) {
      console.error('REST API failed, trying through directDb:', restError);
      
      try {
        // 使用directDb.ts中的方法作为备选
        const { sendMessageDirectSql } = await import('./directDb');
        const result = await sendMessageDirectSql(sessionId, content, isHost, language);
        if (result) {
          console.log('Message sent through directDb successfully');
          return result;
        }
        throw new Error('Direct SQL method also failed');
      } catch (directDbError) {
        console.error('DirectDb also failed, trying regular Supabase API:', directDbError);
        
        // 回退到普通Supabase API
        const { data, error } = await supabase
          .from('messages')
          .insert([message])
          .select()
          .single();
          
        if (error) {
          console.error('Supabase error when sending message:', error);
          throw error;
        }
        
        console.log('Message successfully sent to Supabase:', data?.id);
        
        // 确定sender类型
        const senderType = isHost ? 'host' as const : 'guest' as const;
        
        // 获取消息数据
        const newMessage: ChatMessage = {
          id: data.id,
          content: data.content,
          sender: senderType,
          timestamp: new Date(data.timestamp),
          original_language: data.original_language || 'auto',
          translated_content: data.translated_content,
          translation_status: data.translation_status || 'pending'
        };
        
        // 只对主机消息发送后立即触发翻译，确保使用用户选择的语言
        if (isHost) {
          console.log(`为备用渠道主机消息 ${newMessage.id} 触发翻译，使用语言: ${language || 'en'}`);
          translateMessage(newMessage.id, newMessage.content, 'auto', language)
            .catch((error: Error) => console.error('Failed to trigger translation:', error));
        }
          
        return newMessage;
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

// Get or create a chat session
export async function getOrCreateChatSession(merchantId: string): Promise<string> {
  try {
    console.log('Getting or creating chat session for merchant:', merchantId);
    console.log('Supabase client initialized:', !!supabase);
    
    // If Supabase is not configured, return a local session ID (using UUID for consistency)
    if (!supabase) {
      console.log('Using local mode for session (supabase client is null)');
      const localSessionId = uuidv4();
      console.log('Generated local session UUID:', localSessionId);
      return localSessionId;
    }
    
    // Generate a new session ID for each visitor (using UUID as required by Supabase)
    const sessionId = uuidv4();
    console.log('Generated new UUID session ID:', sessionId);
    
    try {
      // 先直接测试是否可以查询会话表，以确认表结构缓存情况
      console.log('Testing chat_sessions table access before creating new session...');
      
      try {
        const testResponse = await fetch(`${supabaseUrl}/rest/v1/chat_sessions?limit=1`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        });
        
        if (!testResponse.ok) {
          console.warn('Test query to chat_sessions returned error:', await testResponse.text());
        } else {
          console.log('Test query to chat_sessions successful.');
        }
      } catch (testError) {
        console.warn('Failed to test chat_sessions table:', testError);
      }
      
      // 首先创建聊天会话记录
      // Define session data based on actual table structure
      const chatSession = {
        id: sessionId,  // UUID主键
        host_id: merchantId,  // 主持人ID(UUID)
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        has_unread: false
      };
      
      // Save host_id for later use regardless of DB success
      sessionHostIds[sessionId] = merchantId;
      
      console.log('Creating chat session record via REST:', chatSession);
      
      try {
        // 直接使用普通REST API插入数据
        console.log('Attempting to create chat session via REST API');
        const response = await fetch(`${supabaseUrl}/rest/v1/chat_sessions`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(chatSession)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error for chat session:', errorText);
          throw new Error(`REST API error: ${errorText}`);
        }
        
        const sessionResponseData = await response.json();
        console.log('Chat session created successfully via REST:', sessionResponseData[0]?.id);
        
        // 验证会话是否真的创建成功
        console.log('Verifying chat session creation...');
        const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/chat_sessions?id=eq.${sessionId}&select=id`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        });
        
        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();
          console.error('Failed to verify chat session creation:', errorText);
          throw new Error(`Verification failed: ${errorText}`);
        }
        
        const verifyData = await verifyResponse.json();
        if (!verifyData || verifyData.length === 0) {
          console.error('Chat session verification failed: Record not found in database');
          throw new Error('Chat session was not properly created in the database');
        }
        
        console.log('Chat session verified and created successfully via REST:', sessionId);
        
        // 聊天会话创建成功后，再创建欢迎消息
        await createWelcomeMessageForSession(sessionId, merchantId);
      } catch (restError) {
        console.error('REST API failed for chat session:', restError);
        
        try {
          // 回退到Supabase客户端API
          console.log('Falling back to Supabase client API for chat session');
          const { data: sessionData, error: sessionError } = await supabase
            .from('chat_sessions')
            .insert([chatSession])
            .select();
              
          if (sessionError) {
            console.error('Error creating chat session with Supabase client:', sessionError);
            console.log('Will continue with session ID anyway:', sessionId);
          } else {
            console.log('Chat session created successfully with Supabase client:', sessionData?.[0]?.id);
            
            // 验证会话是否真的创建成功
            console.log('Verifying chat session creation (Supabase client)...');
            try {
              const { data: verifyData, error: verifyError } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('id', sessionId)
                .single();
              
              if (verifyError) {
                console.error('Failed to verify chat session creation:', verifyError);
              } else if (!verifyData) {
                console.error('Chat session verification failed: Record not found in database');
              } else {
                console.log('Chat session verified and created successfully with Supabase client:', sessionId);
                // 聊天会话创建成功后，再创建欢迎消息
                await createWelcomeMessageForSession(sessionId, merchantId);
              }
            } catch (verifyError) {
              console.error('Error during chat session verification:', verifyError);
            }
          }
        } catch (supabaseError) {
          console.error('All methods failed for creating chat session:', supabaseError);
          console.log('Will continue with session ID anyway:', sessionId);
        }
      }
    } catch (error) {
      console.error('Error establishing session:', error);
      // Continue with the session ID anyway, even if session creation failed
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error managing chat session:', error);
    // For fallback, generate a proper UUID instead of a string
    const fallbackSessionId = uuidv4();
    console.log('Using fallback UUID session ID:', fallbackSessionId);
    return fallbackSessionId; // Fallback session ID
  }
}

// Subscribe to new messages
export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  // If Supabase is not configured, return a no-op cleanup function
  if (!supabase) {
    console.log('Using local mode for message subscription (supabase client is null)');
    return {
      unsubscribe: () => {},
    };
  }
  
  console.log('Setting up Supabase realtime subscription for session:', sessionId);
  
  // 使用API视图和REST API的方式定期轮询消息 - 作为WebSocket的备份机制
  let lastMsgId = 0;
  // 减少轮询频率以降低服务器负载
  const pollingInterval = setInterval(async () => {
    try {
      let messages;
      // 避免输出轮询日志，除非真正找到了新消息
      // console.log(`Polling messages for session ${sessionId}, last ID: ${lastMsgId}`);
      
      // 使用REST API获取新消息，添加了limit限制以避免下载过多数据
      const response = await fetch(
        `${supabaseUrl}/rest/v1/messages?chat_session_id=eq.${sessionId}&id=gt.${lastMsgId}&order=id.asc&limit=50`, 
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        messages = await response.json();
        // 只有在实际找到消息时才输出日志
        if (messages && messages.length > 0) {
          console.log(`Found ${messages.length} messages via REST API`);
        }
        
        // 从数据库格式映射到应用程序格式，添加翻译字段
        messages = (messages || []).map((msg: any) => {
          const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
          const msgId = msg.id;
          
          // 从内存缓存中获取翻译信息（如果存在）
          const cachedTranslation = messageTranslations[`${msgId}`];
          
          return {
            id: msgId,
            content: msg.content,
            sender: senderType,
            timestamp: msg.timestamp,
            // 为翻译相关字段提供默认值，优先使用缓存中的值
            original_language: msg.original_language || 'auto',
            translated_content: cachedTranslation?.translated_content,
            translation_status: cachedTranslation?.translation_status || 'pending'
          };
        });
      } else {
        // 如果REST API失败，使用Supabase客户端API
        console.error('REST API error when polling messages, falling back to Supabase client API');
        
        try {
          // 回退到Supabase客户端API
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_session_id', sessionId)
            .gt('id', lastMsgId)
            .order('id', { ascending: true });
            
          if (error) {
            console.error('Supabase client API error:', error);
            return;
          }
          
          messages = data || [];
          console.log(`Found ${messages.length} messages via Supabase client API`);
          
          // 从实际表结构映射到应用程序格式，添加翻译字段
          messages = messages.map((msg: any) => {
            const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
            return {
              id: msg.id,
              content: msg.content,
              sender: senderType,
              timestamp: msg.timestamp,
              // 为翻译相关字段提供默认值
              original_language: msg.original_language || 'auto',
              translated_content: msg.translated_content,
              translation_status: msg.translation_status || 'pending'
            };
          });
        } catch (supabaseError) {
          console.error('Supabase client API also failed:', supabaseError);
          return;
        }
      }
      if (messages && messages.length > 0) {
        // 更新最新消息ID
        if (messages[messages.length - 1]?.id > lastMsgId) {
          lastMsgId = messages[messages.length - 1].id;
        }
        
        // 过滤出尚未处理过的消息
        const newMessages = messages.filter((msg: { 
          id: number; 
          content: string;
          is_host: boolean;
          timestamp: string;
          original_language?: string;
          translated_content?: string;
          translation_status?: string;
        }) => !processedMessageIds.has(msg.id));
        
        if (newMessages.length > 0) {
          console.log(`Found ${newMessages.length} new messages via polling`);
          
          // 触发回调处理新消息
          for (const msg of newMessages) {
            // 记录此消息已被处理，以防后续重复
            processedMessageIds.add(msg.id);
            
            // 使用类型断言确保sender的类型
            const senderType = msg.is_host ? ('host' as const) : ('guest' as const);
            callback({
              id: msg.id,
              content: msg.content,
              sender: senderType,
              timestamp: new Date(msg.timestamp),
              // 为翻译相关字段提供默认值
              original_language: msg.original_language || 'auto',
              translated_content: msg.translated_content,
              translation_status: msg.translation_status || 'pending'
            });
          }
        } else if (messages.length !== newMessages.length) {
          console.log(`All ${messages.length} messages from polling were already processed`);
        }
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, 5000); // 降低轮询频率到5秒，减少服务器负载
  
  // 使用WebSocket实时订阅功能，并保持与轮询机制的同步
  let wsSubscription: any = null;
  
  // 维护一个记录所有已处理消息ID的集合，确保无论通过WebSocket还是轮询都不会重复处理
  const processedMessageIds = new Set<number>();
  
  try {
    wsSubscription = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New message received from realtime subscription');
          const message = payload.new as any;
          
          // 检查消息ID是否大于上次处理的ID，以及是否已被处理过
          if (message.id > lastMsgId && !processedMessageIds.has(message.id)) {
            // 更新最新消息ID，并记录此消息已被处理
            lastMsgId = message.id;
            processedMessageIds.add(message.id);
            
            // 使用类型断言确保sender的类型
            const senderType = message.is_host ? ('host' as const) : ('guest' as const);
            
            // 传递新消息，包含翻译字段
            callback({
              id: message.id,
              content: message.content,
              sender: senderType,
              timestamp: new Date(message.timestamp),
              // 为翻译相关字段提供默认值，使用内容自动检测语言
              original_language: message.original_language || (/[\u4e00-\u9fa5]/.test(message.content) ? 'zh' : 'en'),
              translated_content: message.translated_content,
              translation_status: message.translation_status || 'pending'
            });
          } else if (processedMessageIds.has(message.id)) {
            console.log(`WebSocket message with ID ${message.id} already processed, ignoring duplicate`);
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase realtime subscription status:', status);
      });
  } catch (error) {
    console.error('Error setting up Supabase realtime subscription:', error);
  }
  
  // 返回清理函数
  return {
    unsubscribe: () => {
      console.log('Unsubscribing from message updates');
      clearInterval(pollingInterval);
      if (wsSubscription) {
        try {
          wsSubscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from Supabase channel:', error);
        }
      }
    }
  };
}