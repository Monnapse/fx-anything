import { defineConfig } from 'vite';

// Builds the website's live demo (site-src/demo.ts) into site/assets/demo.js.
// It bundles the same audio engine the desktop app uses.
export default defineConfig({
  publicDir: false,
  build: {
    lib: { entry: 'site-src/demo.ts', formats: ['es'], fileName: () => 'demo.js' },
    outDir: 'site/assets',
    emptyOutDir: false,
    target: 'es2020',
    minify: true,
    sourcemap: false,
  },
});
