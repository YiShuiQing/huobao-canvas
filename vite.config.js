import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/huobao-canvas',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://api.chatfire.site',
        changeOrigin: true
      },
      '/volc-api': {
        target: 'https://ark.cn-beijing.volces.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/volc-api/, '')
      }
    }
  }
})
