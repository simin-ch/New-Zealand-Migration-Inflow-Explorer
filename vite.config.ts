import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Set VITE_BASE_PATH=/repo-name/ when deploying to GitHub Pages project sites.
  base: process.env.VITE_BASE_PATH || '/',
})
