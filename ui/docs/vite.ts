/*
 * The docs chrome's vite glue, for a modo.config.ts `vite` extension. Node
 * loads that extension natively, and never strips types from a file under
 * node_modules, so this ships built (dist/docs/vite.js); it may only use
 * erasable TypeScript. It imports no `vite` types: `DocsThemePlugin` is the
 * structural slice of a Vite plugin it returns, so the package needs no
 * `vite` dependency of its own.
 */

/** The Vite plugin `docsTheme` returns: assignable to Vite's own `Plugin`. */
export interface DocsThemePlugin {
  name: string
  /** Puts the theme controller in `<head>`, ahead of everything else. */
  transformIndexHtml(): Array<{ tag: 'script'; children: string; injectTo: 'head-prepend' }>
}

/** What `docsTheme` takes. */
export interface DocsThemeOptions {
  /** The localStorage key holding the stored preference. Give each site its own. Default `modo-ui-theme`. */
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
 * // vite.mjs, modo.config.ts `vite: './vite.mjs'`
 * import { docsTheme } from '@justanarthur/modo-ui/docs/vite'
 * export default config => {
 *   config.plugins = [...(config.plugins ?? []), docsTheme({ storageKey: 'my-ds-theme' })]
 *   return config
 * }
 */
export function docsTheme({ storageKey = 'modo-ui-theme' }: DocsThemeOptions = {}): DocsThemePlugin {
  return {
    name: 'modo-ui:docs-theme',
    transformIndexHtml() {
      return [{ tag: 'script', children: controller(storageKey), injectTo: 'head-prepend' }]
    },
  }
}
