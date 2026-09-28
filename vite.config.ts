import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  base: './',
  build: {
    target: 'es2022',
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
  },
});
