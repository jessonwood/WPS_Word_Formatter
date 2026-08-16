import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'post-build-offline-adjust',
      closeBundle() {
        const indexPath = path.resolve(__dirname, 'dist/index.html')
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8')
          // Replace module script with deferred standard script for reliable DOM mounting
          html = html.replace(/<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
          html = html.replace(/<script\s+type="module"\s+src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
          html = html.replace(/<script\s+src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
          fs.writeFileSync(indexPath, html, 'utf-8')
        }

        // Also copy assets/index.js to dist/main.js for direct WPS background script execution
        const bundlePath = path.resolve(__dirname, 'dist/assets/index.js')
        if (fs.existsSync(bundlePath)) {
          fs.copyFileSync(bundlePath, path.resolve(__dirname, 'dist/main.js'))
        }
      }
    }
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3889,
    cors: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'WpsWordFormatterApp',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true
      }
    }
  }
})
