import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  process.env.RENDER_GIT_COMMIT ||
  '';

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(String(buildSha)),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    // Prevent "Invalid hook call" issues caused by bundling more than one copy of React.
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'node_modules/react'),
      'react-dom': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    // Force pre-bundling with the deduped React copy (helps avoid "Invalid hook call" in dev).
    include: ['react', 'react-dom', 'react/jsx-runtime', 'zustand', 'react-router', 'react-router-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
