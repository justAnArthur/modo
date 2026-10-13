import { resolve } from 'node:path'
import UnoCSS from 'unocss/vite'
import type { Plugin, UserConfig } from 'vite'
import { docsTheme } from './docs/vite.ts'

/*
 * modo vite extension (modo.config.ts `vite: './vite.ts'`): adds UnoCSS, the
 * bit of glue Fluid Functionalism's Tailwind setup got for free, and the docs
 * chrome's theme controller (docs/vite.ts, shipped as `@justanarthur/modo-ui/docs/vite`).
 *
 * Node loads this file directly with type stripping, so it may only use
 * erasable TypeScript, and a relative import names its `.ts` extension — the
 * uno config is handed to UnoCSS by absolute path instead (Vite's root is
 * modo's runtime dir, not this package).
 */

// modo's virtual module for `css: './global.css'` (lib/src/plugins/config.ts).
const CONFIG_CSS_ID = '\0virtual:modo-config-css'

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
  }
}

export default (config: UserConfig): UserConfig => {
  config.plugins = [
    ...(config.plugins ?? []),
    UnoCSS({ configFile: resolve(import.meta.dirname, 'uno.config.ts') }),
    uiGlue(),
    // `.light` / `.dark` on <html> before first paint, for the Theme panel item
    docsTheme(),
  ]
  return config
}
