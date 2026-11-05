import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // Tree-shakeable three.js for the hero 3D chunk — see three-slim.ts.
      {
        find: /^three$/,
        replacement: fileURLToPath(
          new URL('./src/components/hero3d/three-slim.ts', import.meta.url),
        ),
      },
    ],
  },
  server: {
    port: 5173,
  },
});
