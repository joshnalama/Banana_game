import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true, strictPort: true, proxy: { '/api': 'http://localhost:5000' } },
});
