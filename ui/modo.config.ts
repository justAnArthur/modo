import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'UI',
  description:
    'Fluid Functionalism (Base UI flavor, MIT © 2026 Micka Touillaud) ported to UnoCSS and cn: motion springs, fluid hover, a two-step size ladder and an eight-level elevated surface system.',
  css: './global.css',
  vite: './vite.ts',
  // The docs chrome (docs/chrome.tsx): the same module another design system points at as
  // `@justanarthur/modo-ui/docs#<Slot>`.
  shell: {
    Button: './docs#Button',
    Link: './docs#Link',
    Select: './docs#Select',
    Icon: './docs#Icon',
    Sidebar: './docs#DocsNav',
  },
  panel: { items: [{ label: 'Theme', component: './docs#ThemeSwitcher' }] },
})
