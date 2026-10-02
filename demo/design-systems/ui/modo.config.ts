import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'UI',
  description:
    'Fluid Functionalism (Base UI flavor, MIT © 2026 Micka Touillaud) ported to UnoCSS and cn: motion springs, fluid hover, a two-step size ladder and an eight-level elevated surface system.',
  css: './global.css',
  vite: './vite.ts',
  examples: './examples.ts',
  shell: { Button: './components/button', Select: './_shell/select.tsx', Icon: './_shell/icon.tsx' },
  panel: { items: [{ label: 'Theme', component: './_shell/theme-switcher.tsx' }] },
})
