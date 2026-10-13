/**
 * The docs chrome as one module, for a design system documented with modo:
 * `shell: { Sidebar: '@justanarthur/modo-ui/docs#DocsNav', … }` and
 * `panel: { items: [{ label: 'Theme', component: '@justanarthur/modo-ui/docs#ThemeSwitcher' }] }`.
 * The layout and look are `@justanarthur/modo-ui/docs/chrome.css`; the pre-paint theme
 * controller is `docsTheme` in `@justanarthur/modo-ui/docs/vite`. Never imported by the
 * package's main entry.
 */
export * from './chrome'
