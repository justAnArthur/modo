import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'shadcn/ui',
  description: 'shadcn/ui (Radix flavor, neutral) pulled with the shadcn CLI, reorganized into modo structure.',
  css: './global.css',
  socials: { github: 'https://github.com/justAnArthur/modo' },
  theme: {},
  vite: './vite.ts',
  shell: { Icon: './_shell/icon.tsx' },
})
