import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'UI',
  description:
    'Fluid Functionalism (Base UI flavor, MIT © 2026 Micka Touillaud) ported to UnoCSS and cn: motion springs, fluid hover, a two-step size ladder and an eight-level elevated surface system.',
  css: './global.css',
  vite: './vite.ts',
  shell: {
    Button: './components/button',
    Select: './modo.components.tsx#Select',
    Icon: './modo.components.tsx#Icon',
    Sidebar: './modo.components.tsx#DocsNav',
  },
  panel: { items: [{ label: 'Theme', component: './modo.components.tsx#ThemeSwitcher' }] },
})
