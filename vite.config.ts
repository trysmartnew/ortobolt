import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 3000,
    ...(process.env.VITE_API_PROXY
      ? {
          proxy: {
            '/api': {
              target: process.env.VITE_API_PROXY,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : {}),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['lucide-react'],
          'vendor-core': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf'],
        },
      },
    },
  },
});

