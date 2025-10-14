import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      flowform: path.resolve(__dirname, '../../flowform/src'),
    },
  },
  server: {
    port: 5174,
  },
})