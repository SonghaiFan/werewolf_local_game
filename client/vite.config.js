import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000', // default fallback
        ws: true,
        changeOrigin: true,
        router: () => {
          let port = 3000;
          try {
            const portFile = path.resolve(__dirname, '../.port');
            if (fs.existsSync(portFile)) {
              const fileContent = fs.readFileSync(portFile, 'utf8').trim();
              if (fileContent) {
                port = parseInt(fileContent, 10);
              }
            }
          } catch (e) {
            console.error('Error reading dynamic port file:', e);
          }
          return `http://localhost:${port}`;
        }
      }
    }
  }
})

