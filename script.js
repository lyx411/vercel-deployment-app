document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('text-input');
  const generateBtn = document.getElementById('generate-btn');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const downloadContainer = document.getElementById('download-container');
  const downloadBtn = document.getElementById('download-btn');
  
  generateBtn.addEventListener('click', generateQRCode);
  textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateQRCode();
    }
  });
  
  function generateQRCode() {
    const text = textInput.value.trim();
    
    if (!text) {
      alert('请输入文本或URL');
      return;
    }
    
    // 清空之前的QR码
    qrcodeContainer.innerHTML = '';
    downloadContainer.style.display = 'none';
    
    // 创建新的canvas元素
    const canvas = document.createElement('canvas');
    qrcodeContainer.appendChild(canvas);
    
    // 生成QR码
    QRCode.toCanvas(canvas, text, { width: 220, margin: 1 }, (error) => {
      if (error) {
        console.error(error);
        alert('生成QR码时出错');
      } else {
        console.log('QR码已生成');
        downloadContainer.style.display = 'block';
      }
    });
    
    // 设置下载按钮
    downloadBtn.onclick = () => {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  }
});
