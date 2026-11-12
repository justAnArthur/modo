import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'modo ui',
  description:
    'Fluid Functionalism (Base UI flavor, MIT © 2026 Micka Touillaud) ported to UnoCSS and cn: motion springs, fluid hover, a two-step size ladder and an eight-level elevated surface system.',
  css: './global.css',
  logo: './modo.components.tsx#Logo',
  favicon: '../.github/brand/favicon.svg',
  url: 'https://justanarthur.github.io/modo/ui/',
  repo: { url: 'https://github.com/justAnArthur/modo', dir: 'ui' },
  socials: {
    github: 'https://github.com/justAnArthur/modo',
    npm: 'https://www.npmjs.com/package/@justanarthur/modo-ui',
  },
  vite: './vite.ts',
  shell: {
    Button: './components/button',
    Select: './modo.components.tsx#Select',
    Icon: './modo.components.tsx#Icon',
    Sidebar: './modo.components.tsx#DocsNav',
  },
  panel: { items: [{ label: 'Theme', component: './modo.components.tsx#ThemeSwitcher' }] },
})
