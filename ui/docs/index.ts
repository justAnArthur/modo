/*
 * The docs chrome as one module, for a design system documented with modo:
 * `shell: { Sidebar: '@justanarthur/modo-ui/docs#DocsNav', … }` and
 * `panel: { items: [{ label: 'Theme', component: '@justanarthur/modo-ui/docs#ThemeSwitcher' }] }`.
 * Its look is `@justanarthur/modo-ui/docs/chrome.css`; the pre-paint theme controller is
 * `docsTheme` in `@justanarthur/modo-ui/docs/vite`. The package's main entry never imports it.
 */
export * from './chrome'
