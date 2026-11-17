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
    Button: '@justanarthur/modo-ui/docs#Button',
    Code: '@justanarthur/modo-ui/primitives/content/code',
    Select: '@justanarthur/modo-ui/docs#Select',
    Icon: '@justanarthur/modo-ui/docs#Icon',
    Sidebar: '@justanarthur/modo-ui/docs#DocsNav',
  },
  panel: { items: [{ label: 'Theme', component: '@justanarthur/modo-ui/docs#ThemeSwitcher' }] },
})
