import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5000, strictPort: true },
  preview: { port: 5000, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Keep charts and drag-and-drop out of the main bundle; they load with their pages.
        manualChunks: {
          charts: ['recharts'],
          dnd: ['@hello-pangea/dnd'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit', 'axios'],
        },
      },
    },
  },
})
