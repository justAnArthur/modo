import { defineConfig } from 'modo-atomic-ui/config'
import tailwindcss from '@tailwindcss/vite'
import type { UserConfig } from 'vite'

export default defineConfig({
  name: 'modo-atomic-ui demo',
  description: 'the reference impl. tokens → primitives → components → blocks. 8-level surface ladder with paired shadows.',
  meta: {
    github: 'https://github.com/modo-atomic-ui/modo-atomic-ui',
  },
  css: './global.css',
  // any extra vite config (plugins, resolve, etc.) is merged into the
  // lib's base config at vite load time. install the plugin yourself
  // and reference it from this field.
  vite: {
    plugins: [tailwindcss()],
  } satisfies UserConfig,
})
