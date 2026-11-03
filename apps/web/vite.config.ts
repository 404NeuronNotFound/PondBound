import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } },
  build: { rollupOptions: { output: { manualChunks: id => id.includes('/phaser/') || id.includes('\\phaser\\') ? 'phaser' : undefined } } },
});
