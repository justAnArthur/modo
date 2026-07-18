import { defineConfig } from 'modo-atomic-ui/config'

export default defineConfig({
  name: 'modo-atomic-ui demo',
  description: 'the reference impl. tokens → primitives → components → blocks. 8-level surface ladder with paired shadows.',
  meta: {
    github: 'https://github.com/modo-atomic-ui/modo-atomic-ui',
  },
  components: {
    Select: './components/select',
  },
  css: './overrides.css',
  theme: {
    fonts: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono Variable", monospace',
    },
    defaultDensity: 'comfortable',
    defaultTheme: 'system',
  },
})
