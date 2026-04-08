import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { pptezApi } from './server/api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    pptezApi(),
  ],
  server: {
    host: true, // 0.0.0.0 바인딩 → 같은 네트워크 기기에서 접속 가능
    port: 5173,
    strictPort: false,
  },
})
