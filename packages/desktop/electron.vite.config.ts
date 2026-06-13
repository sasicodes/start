import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'electron-vite';

const root = fileURLToPath(new URL('.', import.meta.url));

const aliases = {
  '@main': resolve(root, 'src/main'),
  '@preload': resolve(root, 'src/preload'),
  '@renderer': resolve(root, 'src/renderer/src')
} as const;

const mcpSdkCjsAlias = {
  find: /^@modelcontextprotocol\/sdk\/(.+)\.js$/,
  replacement: resolve(root, 'node_modules/@modelcontextprotocol/sdk/dist/cjs/$1.js')
};

export default defineConfig({
  main: {
    resolve: {
      alias: [mcpSdkCjsAlias, ...Object.entries(aliases).map(([find, replacement]) => ({ find, replacement }))]
    },
    build: {
      minify: true,
      sourcemap: false,
      externalizeDeps: false,
      reportCompressedSize: false,
      rollupOptions: {
        external: ['electron', /^node:/, '@silvia-odwyer/photon-node', 'bufferutil', 'utf-8-validate'],
        output: {
          format: 'cjs',
          codeSplitting: false,
          entryFileNames: 'index.cjs'
        }
      }
    }
  },
  preload: {
    resolve: { alias: aliases },
    build: {
      minify: true,
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          entryFileNames: '[name].cjs',
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    plugins: [tailwindcss(), preact()],
    resolve: { alias: aliases },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1600
    }
  }
});
