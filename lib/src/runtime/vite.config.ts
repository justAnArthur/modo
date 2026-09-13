import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configPlugin } from '../plugins/config'
import { tokensPlugin } from '../plugins/tokens'
import { itemsPlugin } from '../plugins/items'
import { shellPlugin } from '../plugins/shell'

// The CLI sets MODO_USER_ROOT before spawning Vite and chdirs to the runtime
// dir. The runtime dir is the location of this file; LIB_DIR is its parent.
const RUNTIME_DIR = resolve(import.meta.dirname)
const LIB_DIR = resolve(RUNTIME_DIR, '..', '..')
const USER_ROOT = process.env.MODO_USER_ROOT ?? process.cwd()

export default defineConfig({
  root: RUNTIME_DIR,
  plugins: [
    configPlugin({ userRoot: USER_ROOT }),
    tokensPlugin({ userRoot: USER_ROOT }),
    itemsPlugin({ userRoot: USER_ROOT }),
    shellPlugin({ userRoot: USER_ROOT, libDir: LIB_DIR }),
    react(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [RUNTIME_DIR, LIB_DIR, USER_ROOT, resolve(USER_ROOT, '.modo-tmp')],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
  build: {
    outDir: resolve(RUNTIME_DIR, 'dist'),
    emptyOutDir: true,
  },
})
