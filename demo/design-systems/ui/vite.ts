import { resolve } from 'node:path'
import UnoCSS from 'unocss/vite'
import type { Plugin, UserConfig } from 'vite'

/*
 * modo vite extension (modo.config.ts `vite: './vite.ts'`): adds UnoCSS and
 * the two bits of glue Fluid Functionalism's Tailwind setup got for free.
 *
 * Node loads this file directly with type stripping, so it may only use
 * erasable TypeScript and must not import relative `.ts` modules — the uno
 * config is handed to UnoCSS by absolute path instead (Vite's root is modo's
 * runtime dir, not this package).
 */

// modo's virtual module for `css: './global.css'` (lib/src/plugins/config.ts).
const CONFIG_CSS_ID = '\0virtual:modo-config-css'

// FF's `dark:` variant needs a `.dark` ancestor (upstream ThemeProvider sets
// it on <html>). modo has no theme toggle, so mirror the OS preference
// before first paint and keep following it.
const DARK_SYNC = `(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const sync = () => document.documentElement.classList.toggle('dark', mq.matches)
  sync()
  mq.addEventListener('change', sync)
})()`

function uiGlue(): Plugin {
  return {
    name: 'ui:glue',
    // UnoCSS rides the config-css module so it loads before global.css: its
    // `@layer properties, theme, base, default` statement then fixes the
    // layer order global.css's `@layer base` rules join.
    transform(code, id) {
      if (id !== CONFIG_CSS_ID) return null
      return { code: `import 'virtual:uno.css';\n${code}`, map: null }
    },
    transformIndexHtml() {
      return [{ tag: 'script', children: DARK_SYNC, injectTo: 'head-prepend' }]
    },
  }
}

export default (config: UserConfig): UserConfig => {
  config.plugins = [
    ...(config.plugins ?? []),
    UnoCSS({ configFile: resolve(import.meta.dirname, 'uno.config.ts') }),
    uiGlue(),
  ]
  return config
}
