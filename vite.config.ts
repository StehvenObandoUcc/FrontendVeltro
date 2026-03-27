import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl(),
    viteStaticCopy({
      targets: [
        // Copy ALL ONNX Runtime Web WASM files to ensure dynamic imports work
        // Using glob patterns to catch all variants (simd, threaded, etc.)
        { 
          src: 'node_modules/onnxruntime-web/dist/ort-wasm*.wasm', 
          dest: '.' 
        },
        { 
          src: 'node_modules/onnxruntime-web/dist/ort-wasm*.mjs', 
          dest: '.' 
        },
        // ort-wasm*.js no longer ships in onnxruntime-web@1.24.x
      ],
    }),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',  // Listen on all interfaces so mobile can connect via LAN IP
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  build: {
    // Optimize chunk sizes
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Separate vendor chunks
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('tailwindcss') || id.includes('@tailwindcss')) {
              return 'ui-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'form-vendor';
            }
            if (id.includes('axios')) {
              return 'api-vendor';
            }
            if (id.includes('zustand')) {
              return 'state-vendor';
            }
            if (id.includes('zxing') || id.includes('react-zxing')) {
              return 'scanner-vendor';
            }
            if (id.includes('tanstack') || id.includes('react-query')) {
              return 'query-vendor';
            }
            return 'vendors';
          }
        },
        // Chunk file names for better caching
        chunkFileNames: 'js/[name].[hash].js',
        entryFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp/.test(ext)) {
            return `images/[name].[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name].[hash][extname]`;
          } else if (ext === 'css') {
            return `css/[name].[hash][extname]`;
          }
          return `[name].[hash][extname]`;
        },
      },
    },
  },
})
