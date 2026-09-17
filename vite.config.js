import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // ส่ง /api ไปที่ `wrangler pages dev` (พอร์ต 8788) เพื่อใช้ hot reload ของ Vite ระหว่างพัฒนา
    proxy: { '/api': 'http://localhost:8788' },
  },
})
