import { defineConfig } from 'modo/config'

export default defineConfig({
  name: 'shadcn/ui',
  description:
    'shadcn/ui (Radix flavor, neutral) pulled with the shadcn CLI, reorganized into modo structure.',
  css: './global.css',
  vite: './vite.ts',
  shell: { Panel: './components/card' },
})
