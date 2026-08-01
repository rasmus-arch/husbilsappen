import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Projektroten för Vite är web/ (inte repo-roten) med avsikt: annars hamnar
// käll-index.html i samma mapp som den byggda dist/ på servern, och
// Passenger/Apache serverar den statiska käll-filen istället för att
// routa till Node-appen. Se README för bakgrunden.
export default defineConfig({
  root: 'web',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3001}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${process.env.API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
})
