import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const target = process.env.OBELISK_PROXY_TARGET ?? 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    proxy: {
      '/api/panel': { target },
      '/socket.io': {
        target,
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
  },
});
