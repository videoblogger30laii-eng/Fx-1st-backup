import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_DERIV_APP_ID': JSON.stringify(process.env.DERIV_APP_ID || '1089'),
    'import.meta.env.VITE_DERIV_API_TOKEN': JSON.stringify(process.env.DERIV_API_TOKEN || ''),
    'import.meta.env.VITE_TWELVE_DATA_API_KEY': JSON.stringify(process.env.TWELVE_DATA_API_KEY || ''),
    'import.meta.env.VITE_FINNHUB_API_KEY': JSON.stringify(process.env.FINNHUB_API_KEY || ''),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  }
});
