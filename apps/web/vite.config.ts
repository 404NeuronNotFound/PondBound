import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadPublicEnvironment } from './config/environment.ts';

export default defineConfig(({ mode }) => ({
  envDir: false,
  envPrefix: [],
  define: Object.fromEntries(Object.entries(loadPublicEnvironment(mode)).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } },
  build: { rollupOptions: { output: { manualChunks: id => id.includes('/phaser/') || id.includes('\\phaser\\') ? 'phaser' : undefined } } },
}));
