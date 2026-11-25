import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any static host / sub-path.
  base: './',
  plugins: [react(), tailwindcss()],
});
