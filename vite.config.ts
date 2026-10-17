import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build de l'application web embarquée dans l'APK Android (Capacitor).
// Cible ES2020 : compatible avec les WebView Android modernes (Android 8+).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    reportCompressedSize: true,
  },
  server: {
    host: true, // nécessaire pour le prévisualisation réseau / Capacitor live-reload
    port: 5173,
  },
});
