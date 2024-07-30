import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      VITE_API_BASE_URL: JSON.stringify(
        process.env.NODE_ENV === 'production'
          ? 'https://footy-picker-58753c2f9639.herokuapp.com/api'
          : 'http://localhost:5000/api'
      ),
    },
  },
});
