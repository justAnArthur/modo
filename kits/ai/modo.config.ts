import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'modo ui ai',
  description:
    'An AI agent app kit on modo-ui: messages, tool calls, prompts, a composer, a transcript, side panes, settings and full app screens.',
  css: './global.css',
  logo: '../../ui/modo.components.tsx#Logo',
  favicon: '../../.github/brand/favicon.svg',
  url: 'https://justanarthur.github.io/modo/ai/',
  repo: { url: 'https://github.com/justAnArthur/modo', dir: 'kits/ai' },
  socials: {
    github: 'https://github.com/justAnArthur/modo',
    npm: 'https://www.npmjs.com/package/@justanarthur/modo-ui-ai',
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
