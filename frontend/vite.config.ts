/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the demo build be served from a GitHub Pages sub-path.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
  server: { port: 5173 },
  test: { environment: 'node' },
});
