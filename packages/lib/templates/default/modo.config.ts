import { defineConfig } from 'modo-atomic-ui/config'

export default defineConfig({
  name: '__NAME__',
  description: '__DESCRIPTION__',
  tokens: { source: './tokens' },
  source: {
    primitives: './primitives',
    components: './components',
    blocks: './blocks',
  },
  theme: {
    fonts: {
      sans: 'Inter Variable',
      mono: 'JetBrains Mono Variable',
    },
    defaultDensity: 'comfortable',
    defaultTheme: 'system',
  },
})
