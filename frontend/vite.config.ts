import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Delimitar /admin/ para que Vite no confunda /administracion con el admin de Django.
const proxy = { '/api': 'http://127.0.0.1:8000', '/admin/': 'http://127.0.0.1:8000', '/static': 'http://127.0.0.1:8000' }
export default defineConfig({
  plugins: [react()],
  server: { proxy, strictPort: true },
  preview: { proxy },
})
