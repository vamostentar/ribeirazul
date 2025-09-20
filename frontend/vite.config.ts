import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      // Gzip compression for production
      isProduction && compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
      }),
      // Brotli compression for production
      isProduction && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
      }),
      // Bundle analyzer (optional)
      isProduction && visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    
    server: {
      port: 3001,
      host: true,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3001,
        clientPort: 3001,
      },
    },
    
    // Build optimizations
    build: {
      target: 'es2020',
      minify: 'terser',
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
        },
      },
      
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
            'vendor-utils': ['axios', '@tanstack/react-query', 'zod'],
          },
          // Asset naming
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
              return 'images/[name]-[hash][extname]';
            }
            if (extType === 'css') {
              return 'css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        },
      },
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'lucide-react',
      ],
    },
    
    // Define global constants for build time
    define: {
      __VITE_API_URL__: JSON.stringify(env.VITE_API_URL || 'http://localhost:8081'),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});
