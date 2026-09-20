/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // أثناء التطوير: /api → باك اند اللوحة (المنفذ 4000)
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
