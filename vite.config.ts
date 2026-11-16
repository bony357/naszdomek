import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Względne ścieżki: działa i na GitHub Pages (/repo/), i na Cloudflare Pages (/)
  base: './',
  plugins: [react()],
});
