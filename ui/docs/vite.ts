/*
 * Local addition (not part of Fluid Functionalism): the docs chrome's Vite
 * glue, for a modo.config.ts `vite` extension. Node loads that extension
 * natively and never strips types under node_modules, so this ships built
 * (dist/docs/vite.js) and may only use erasable TypeScript. It imports no
 * `vite` types, and `unocss` only inside `withUno`, so a Tailwind host takes
 * `docsTheme` without either installed.
 */

/** The slice of a Vite plugin these helpers return: assignable to Vite's own `Plugin`. */
export interface DocsVitePlugin {
  name: string
  transform?(code: string, id: string): { code: string; map: null } | null
  transformIndexHtml?(): Array<{ tag: 'script'; children: string; injectTo: 'head-prepend' }>
}

/** The slice of a Vite config these helpers touch. */
export interface DocsViteConfig {
  plugins?: unknown[]
}

/** What `docsTheme` takes. */
export interface DocsThemeOptions {
  /** The localStorage key holding the stored preference. Give each site its own. Defaults to `modo-ui-theme`. */
  storageKey?: string
}

// The design system's `dark:` variant needs a `.dark` ancestor (upstream
// ThemeProvider sets it on <html>), and `color-scheme` drives every
// light-dark() token. modo has no theme of its own, so this runs before first
// paint: it applies the stored preference (or the OS one under 'system') and
// exposes `window.__uiTheme` for the Theme panel item (`ThemeSwitcher` in
// chrome.tsx). The 'ui:themechange' event keeps that control in sync when the
// OS flips underneath 'system'.
const controller = (storageKey: string) => `(() => {
  const KEY = ${JSON.stringify(storageKey)}
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

/**
 * A Vite plugin that puts the theme controller in `<head>` ahead of everything
 * else: the stored preference (or the OS one) lands as `.light` / `.dark` on
 * `<html>` before first paint, and `window.__uiTheme` (`get` / `set`) plus the
 * `ui:themechange` event serve the `ThemeSwitcher` panel item.
 *
 * @example
 * // vite.ts, modo.config.ts `vite: './vite.ts'`
 * import { docsTheme } from '@justanarthur/modo-ui/docs/vite'
 * export default config => {
 *   config.plugins = [...(config.plugins ?? []), docsTheme({ storageKey: 'my-ds-theme' })]
 *   return config
 * }
 */
export function docsTheme({ storageKey = 'modo-ui-theme' }: DocsThemeOptions = {}): DocsVitePlugin {
  return {
    name: 'modo-ui:docs-theme',
    transformIndexHtml() {
      return [{ tag: 'script', children: controller(storageKey), injectTo: 'head-prepend' }]
    },
  }
}

// modo's virtual module for `css: './global.css'` (lib/src/plugins/config.ts).
const CONFIG_CSS_ID = '\0virtual:modo-config-css'

// UnoCSS rides the config-css module so it loads before the host's css: its
// `@layer properties, theme, base, default` statement then fixes the layer
// order that stylesheet's `@layer base` rules join.
const unoFirst: DocsVitePlugin = {
  name: 'modo-ui:uno-first',
  transform(code, id) {
    if (id !== CONFIG_CSS_ID) return null
    return { code: `import 'virtual:uno.css';\n${code}`, map: null }
  },
}

/**
 * The extension for a UnoCSS host: UnoCSS over the given uno config file (an
 * absolute path: Vite's root is modo's runtime, not the host), loaded ahead of
 * the host's css, plus `docsTheme`. Needs `unocss` installed.
 *
 * @example
 * // vite.ts, modo.config.ts `vite: './vite.ts'`
 * import { resolve } from 'node:path'
 * import { withUno } from '@justanarthur/modo-ui/docs/vite'
 * export default withUno(resolve(import.meta.dirname, 'uno.config.ts'))
 */
export function withUno(configFile: string, theme: DocsThemeOptions = {}) {
  return async <C extends DocsViteConfig>(config: C): Promise<C> => {
    const { default: UnoCSS } = await import('unocss/vite')
    config.plugins = [...(config.plugins ?? []), UnoCSS({ configFile }), unoFirst, docsTheme(theme)]
    return config
  }
}
