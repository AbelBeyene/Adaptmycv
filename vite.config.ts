import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
          dest: ''
        }
      ]
    })
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Mirrors api/jobsuche.ts (the Vercel function used in production)
      '/api/jobsuche': {
        target: 'https://rest.arbeitsagentur.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jobsuche/, '/jobboerse/jobsuche-service/pc/v6/jobs'),
        headers: { 'X-API-Key': 'jobboerse-jobsuche' },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure worker files are handled correctly
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('pdf.worker')) {
            return 'pdf.worker.min.mjs'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
