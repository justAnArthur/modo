import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'Fluid Functionalism',
  description:
    'Fluid Functionalism (an independent shadcn registry layer by mickadesign) pulled with the shadcn CLI over a shadcn/ui radix-nova foundation, reorganized into modo structure.',
  css: './global.css',
  socials: { github: 'https://github.com/justAnArthur/modo' },
  theme: {},
  vite: './vite.ts',
  shell: { Icon: './_shell/icon.tsx' },
})
