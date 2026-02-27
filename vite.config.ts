import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'polkadot': [
            '@polkadot/api',
            '@polkadot/extension-dapp',
            '@polkadot/util',
            '@polkadot/util-crypto',
          ],
        },
      },
    },
  },
})
