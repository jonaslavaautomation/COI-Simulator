import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig({
  // Built output is opened directly via file:// (double-click, no server),
  // same as every other trainer page in this repo. A normal Vite build emits
  // a <script type="module" src="./assets/...">, and Chromium refuses to
  // fetch module scripts under file:// (CORS policy blocks it even for a
  // same-directory relative path - confirmed by testing the plain build).
  // vite-plugin-singlefile inlines the JS/CSS directly into index.html so
  // there's no separate file to fetch, matching this repo's existing
  // single-file-HTML convention for every other trainer page.
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: './',
});
