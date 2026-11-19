import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'modo ui standards',
  description:
    'The UI of just-standards on modo-ui: every business measured against packs of standards, the grid of assets × items, and a failing cell handed to an AI worker.',
  css: './global.css',
  logo: '../../ui/modo.components.tsx#Logo',
  favicon: '../../.github/brand/favicon.svg',
  url: 'https://justanarthur.github.io/modo/standards/',
  repo: { url: 'https://github.com/justAnArthur/modo', dir: 'kits/standards' },
  socials: {
    github: 'https://github.com/justAnArthur/modo',
    npm: 'https://www.npmjs.com/package/@justanarthur/modo-ui-standards',
  },
  vite: './vite.ts',
  shell: {
    Button: '@justanarthur/modo-ui/docs#Button',
    Code: '@justanarthur/modo-ui/primitives/content/code',
    Select: '@justanarthur/modo-ui/docs#Select',
    Icon: '@justanarthur/modo-ui/docs#Icon',
    Sidebar: '@justanarthur/modo-ui/docs#DocsNav',
    SiteSwitcher: '@justanarthur/modo-ui/docs#SiteSwitcher',
  },
  panel: { items: [{ label: 'Theme', component: '@justanarthur/modo-ui/docs#ThemeSwitcher' }] },
})
