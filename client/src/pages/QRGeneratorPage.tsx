import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function QRGeneratorPage() {
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  const [qrCodeDataURL, setQRCodeDataURL] = useState<string>('');
  const [chatUrl, setChatUrl] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // 从API加载用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching users from server API');
        
        const response = await fetch('/api/users');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }
        
        const data = await response.json();
        console.log(`Fetched ${data?.length || 0} users from API`);
        
        if (data && data.length > 0) {
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: "无法加载用户列表"
        });
      }
    };
    
    fetchUsers();
  }, [toast]);

  // 当用户ID更改时生成二维码 - 使用merchantId参数
  useEffect(() => {
    if (!userId) return;
    
    const baseUrl = window.location.origin;
    const newChatUrl = `${baseUrl}?merchantId=${userId}`;
    setChatUrl(newChatUrl);
    
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(newChatUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQRCodeDataURL(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };
    
    generateQR();
  }, [userId]);

  // 选择用户时更新
  const handleSelectUser = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setSelectedUser(user);
      setUserId(user.id);
      setUserName(user.name || '');
      setBusinessType(user.business_type || '');
    }
  };

  // 创建新用户
  const handleCreateUser = async () => {
    if (!userName) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入用户名称"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Creating user through server API');
      
      const userData = { 
        name: userName,
        business_type: businessType || '',
        business_intro: ''
      };
      
      console.log('Creating user with data:', userData);
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const data = await response.json();
      console.log('User created successfully:', data);
      
      // 更新用户列表
      setUsers(prev => [data, ...prev]);
      
      // 设置当前用户ID以生成二维码
      setUserId(data.id);
      setSelectedUser(data);
      
      toast({
        title: "创建成功",
        description: "用户创建成功！二维码已生成"
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: "destructive",
        title: "创建用户失败",
        description: error?.message || "创建用户时发生错误"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">QR聊天生成器</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 用户选择或创建表单 */}
        <Card>
          <CardHeader>
            <CardTitle>选择或创建用户</CardTitle>
            <CardDescription>
              选择现有用户或创建新用户来生成通用聊天二维码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="userSelect">选择现有用户</Label>
                <Select onValueChange={handleSelectUser} value={selectedUser?.id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择用户" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="userName">用户名称</Label>
              <Input 
                id="userName" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                placeholder="输入用户名称" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessType">业务类型</Label>
              <Input 
                id="businessType" 
                value={businessType} 
                onChange={(e) => setBusinessType(e.target.value)} 
                placeholder="输入业务类型" 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateUser} 
              disabled={loading || !userName}
              className="w-full"
            >
              {loading ? '创建中...' : '创建新用户并生成二维码'}
            </Button>
          </CardFooter>
        </Card>
        
        {/* QR码显示 */}
        <Card>
          <CardHeader>
            <CardTitle>聊天二维码</CardTitle>
            <CardDescription>
              扫描这个二维码开始与{selectedUser?.name || '用户'}对话
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {qrCodeDataURL ? (
              <>
                <img 
                  src={qrCodeDataURL} 
                  alt="Chat QR Code" 
                  className="border p-2 rounded-lg w-64 h-64 object-contain mb-4" 
                />
                <div className="text-sm text-center text-gray-500 break-all mt-2">
                  聊天链接: {chatUrl}
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-gray-400">
                选择或创建用户以生成二维码
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            {qrCodeDataURL && (
              <Button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `chat-qr-${selectedUser?.name || 'user'}.png`;
                  link.href = qrCodeDataURL;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                variant="outline"
              >
                下载二维码
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {selectedUser && (
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            用户ID: {selectedUser.id}<br />
            用户名称: {selectedUser.name || '未设置'}<br />
            业务类型: {selectedUser.business_type || '未设置'}
          </p>
          <p className="mt-2">
            这个二维码可以被重复使用，每个扫描者都会获得专属聊天会话。<br />
            系统会自动为每位访客创建独立的聊天空间，无需每次创建新的二维码。
          </p>
          <p className="mt-2 text-blue-600">
            适用场景：打印在名片、海报或店铺展示，让访客随时扫码联系。<br />
            例如：商家可以在实体店张贴二维码，顾客扫码即可开始聊天咨询。
          </p>
        </div>
      )}
    </div>
  );
}