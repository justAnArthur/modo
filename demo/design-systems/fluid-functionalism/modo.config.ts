import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'Fluid Functionalism',
  description:
    'Fluid Functionalism (an independent shadcn registry layer by mickadesign) pulled with the shadcn CLI over a shadcn/ui radix-nova foundation, reorganized into modo structure.',
  css: './global.css',
  vite: './vite.ts',
})
