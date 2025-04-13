document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const qrInput = document.getElementById('qrInput');
    const generateBtn = document.getElementById('generateBtn');
    const qrcodeContainer = document.getElementById('qrcodeContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // 创建QR实例变量
    let qrcode = null;
    
    // 初始禁用下载按钮
    downloadBtn.disabled = true;
    
    // 生成二维码函数
    function generateQRCode() {
        // 获取输入文本
        const text = qrInput.value.trim();
        
        // 验证输入
        if (!text) {
            alert('请输入文本内容');
            return;
        }
        
        // 清除之前的二维码
        qrcodeContainer.innerHTML = '';
        
        // 创建新的二维码
        qrcode = new QRCode(qrcodeContainer, {
            text: text,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // 启用下载按钮
        downloadBtn.disabled = false;
    }
    
    // 下载二维码函数
    function downloadQRCode() {
        if (!qrcode) return;
        
        // 获取Canvas元素
        const canvas = qrcodeContainer.querySelector('canvas');
        
        if (canvas) {
            // 创建一个临时链接
            const link = document.createElement('a');
            
            // 设置下载文件名
            link.download = 'qrcode.png';
            
            // 将Canvas转换为DataURL
            link.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            
            // 模拟点击链接下载
            link.click();
        }
    }
    
    // 绑定事件监听器
    generateBtn.addEventListener('click', generateQRCode);
    downloadBtn.addEventListener('click', downloadQRCode);
    
    // 支持按Enter键生成二维码
    qrInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateQRCode();
        }
    });
});