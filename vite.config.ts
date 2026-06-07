import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same dist/ works at root (GitHub Pages user-page) AND at
// a subpath (bilko.run/projects/git-viewer/).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
