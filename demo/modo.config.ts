import { defineConfig } from 'modo-atomic-ui/config'

export default defineConfig({
  name: 'modo-atomic-ui demo',
  description: 'the reference impl. tokens → primitives → components → blocks. 8-level surface ladder with paired shadows.',
  meta: {
    github: 'https://github.com/modo-atomic-ui/modo-atomic-ui',
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
