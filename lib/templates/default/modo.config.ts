import { defineConfig } from 'modo-atomic-ui/config'

export default defineConfig({
  name: '__NAME__',
  description: '__DESCRIPTION__',
  css: './global.css',
  theme: {
    fonts: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono Variable", monospace',
    },
    defaultDensity: 'comfortable',
    defaultTheme: 'system',
  },
})
