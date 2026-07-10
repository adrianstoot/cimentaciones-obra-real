import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/cimentaciones-obra-real/' : '/',
  build: {
    target: 'es2022',
    // Three.js is intentionally isolated in a cacheable vendor chunk. Its
    // minified size is stable and expected for the selected post-processing.
    chunkSizeWarningLimit: 760,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          return undefined;
        },
      },
    },
  },
});
