/*
 * The docs site's own mark, picked in modo.config.ts as `./modo.components.tsx#Logo`.
 * The chrome's slot adapters (Select, Icon, DocsNav, ThemeSwitcher) are docs/chrome.tsx.
 */

/** The header mark: modo's frame and drop (a docs page, a component settled into it), drawn in the text color so it follows the theme. */
export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <rect x="13" y="13" width="17" height="17" rx="8" fill="currentColor" />
    </svg>
  )
}
