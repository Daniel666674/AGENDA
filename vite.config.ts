import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' → el build funciona en cualquier hosting estático (Vercel, Netlify, cPanel, GitHub Pages…)
export default defineConfig({
  base: './',
  plugins: [react()],
});
