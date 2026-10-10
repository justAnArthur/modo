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
// it on <html>), and `color-scheme` drives every light-dark() token. modo has
// no theme of its own, so this runs before first paint: it applies the stored
// preference (or the OS one under 'system') and exposes `window.__uiTheme` for
// the Theme panel item (`ThemeSwitcher` in modo.components.tsx). The 'ui:themechange'
// event keeps that control in sync when the OS flips underneath 'system'.
const THEME_CONTROLLER = `(() => {
  const KEY = 'modo-ui-theme'
  const root = document.documentElement
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const read = () => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored === 'light' || stored === 'dark' ? stored : 'system'
    } catch {
      return 'system'
    }
  }
  let preference = read()
  const apply = () => {
    const resolved = preference === 'system' ? (mq.matches ? 'dark' : 'light') : preference
    root.classList.toggle('dark', resolved === 'dark')
    root.classList.toggle('light', resolved === 'light')
    window.dispatchEvent(new Event('ui:themechange'))
  }
  window.__uiTheme = {
    get: () => preference,
    set: (next) => {
      preference = next === 'light' || next === 'dark' ? next : 'system'
      try {
        if (preference === 'system') localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, preference)
      } catch {}
      apply()
    },
  }
  mq.addEventListener('change', () => { if (preference === 'system') apply() })
  apply()
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
      return [{ tag: 'script', children: THEME_CONTROLLER, injectTo: 'head-prepend' }]
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
