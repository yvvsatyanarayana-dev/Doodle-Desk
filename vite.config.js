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
    minify: 'esbuild',
    target: 'es2020',
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React and core libraries
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          // PeerJS for collaboration
          if (id.includes('node_modules/peerjs')) {
            return 'peerjs';
          }
          // Lucide icons - tree-shakeable, but keep as chunk for caching
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide';
          }
          // Heavy 3D/Visualization components
          if (id.includes('Isometric3DArchitectureView') || id.includes('Spatial3DHoloCanvas')) {
            return '3d-views';
          }
          // Heavy modals
          if (id.includes('LibrarySidebar') || id.includes('SmartAutoLayoutModal') || id.includes('WireframeToCodeModal') || id.includes('MermaidToDoodleModal') || id.includes('NapkinToVectorScannerModal')) {
            return 'heavy-modals';
          }
          // Engine components
          if (id.includes('/engine/')) {
            return 'engine';
          }
          // Utils
          if (id.includes('/utils/')) {
            return 'utils';
          }
          // Components (lazy-loaded modals)
          if (id.includes('/components/') && (id.includes('Modal') || id.includes('Panel') || id.includes('Overlay'))) {
            return 'modals';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    'process.env.IS_PREACT': JSON.stringify('false'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  esbuild: {
    treeShaking: true,
    pure: ['console.log', 'console.debug', 'console.info'],
    drop: ['debugger'],
  },
});
