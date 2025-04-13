import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// 修正导入方式
import shadcnPlugin from '@replit/vite-plugin-shadcn-theme-json';

export default defineConfig({
  plugins: [
    react(),
    shadcnPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  define: {
    // 用于确保在构建时添加环境变量
    'process.env': {},
  },
});
