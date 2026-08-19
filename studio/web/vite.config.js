import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Studio's Express server mounts Vite in middleware mode; this config
    // only matters if someone runs `vite` directly in web/ for UI work.
    port: 4602,
    proxy: { '/api': 'http://127.0.0.1:4600' },
  },
});
