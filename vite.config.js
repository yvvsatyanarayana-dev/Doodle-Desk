import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      strict: false,
      allow: ['..', 'D:/EX', 'D:/Doodle Desk', path.resolve(__dirname)],
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lucide: ['lucide-react'],
        },
      },
    },
  },
  define: {
    'process.env.IS_PREACT': JSON.stringify('false'),
  }
});
