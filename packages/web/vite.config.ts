import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import desktopPackage from '../desktop/package.json' with { type: 'json' };

export default defineConfig({
  define: {
    'import.meta.env.START_DESKTOP_VERSION': JSON.stringify(desktopPackage.version)
  },
  resolve: {
    tsconfigPaths: true
  },
  server: {
    port: 3000
  },
  plugins: [tailwindcss(), react()]
});
