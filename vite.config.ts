import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/".
// Locally and on Vercel it stays "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
