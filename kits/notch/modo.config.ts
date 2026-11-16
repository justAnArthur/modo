import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'modo ui notch',
  description:
    'A macOS notch app kit on modo-ui: the island that grows out of the notch, its tabs across the wings and the pieces its activities show.',
  css: './global.css',
  logo: '../../ui/modo.components.tsx#Logo',
  favicon: '../../.github/brand/favicon.svg',
  url: 'https://justanarthur.github.io/modo/notch/',
  repo: { url: 'https://github.com/justAnArthur/modo', dir: 'kits/notch' },
  socials: {
    github: 'https://github.com/justAnArthur/modo',
    npm: 'https://www.npmjs.com/package/@justanarthur/modo-ui-notch',
  },
  vite: './vite.ts',
  shell: {
    Button: '../../ui/components/button',
    Code: '../../ui/primitives/code',
    Select: '../../ui/modo.components.tsx#Select',
    Icon: '../../ui/modo.components.tsx#Icon',
    Sidebar: '../../ui/modo.components.tsx#DocsNav',
  },
  panel: { items: [{ label: 'Theme', component: '../../ui/modo.components.tsx#ThemeSwitcher' }] },
})
