import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // ส่ง /api ไปที่ `wrangler dev` (พอร์ต 8787) เพื่อใช้ hot reload ของ Vite ระหว่างพัฒนา
    proxy: { '/api': 'http://localhost:8787' },
  },
})
