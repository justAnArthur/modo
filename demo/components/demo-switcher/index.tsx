import './demo-switcher.css'
import peers from './.peers.json'

/**
 * Cross-kit navigation. Renders one `<a>` per peer, marks the current
 * host. Hidden if fewer than two peers.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <DemoSwitcher />
 * ```
 */
export default function DemoSwitcher() {
  if (peers.length < 2) return null
  const here = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <nav data-aui="demo-switcher">
      {peers.map((p) => {
        const current = p.url.startsWith(here)
        return (
          <a
            key={p.name}
            href={p.url}
            aria-current={current ? 'page' : undefined}
            data-current={current}
          >
            {p.name}
          </a>
        )
      })}
    </nav>
  )
}
