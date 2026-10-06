import './demo-switcher.css'
import type { ResolvedShellExport } from 'virtual:modo-shell'
import peers from './.peers.json'

/**
 * Cross-kit navigation. Renders one `<option>` per peer in the host's
 * Select slot; picking a peer navigates to it. Hidden if fewer than
 * two peers.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <DemoSwitcher />
 * ```
 */
export default function DemoSwitcher({ shell }: { shell: ResolvedShellExport }) {
  if (peers.length < 2) return null
  // A peer is an origin in dev (one server per port) and a path when built.
  const here = window.location.href
  const current = peers.find(p => here.startsWith(new URL(p.url, here).href)) ?? peers[0]!
  const options = peers.map(p => ({
    value: p.url,
    label: `${p.name}${p === current ? ' (current)' : ''}`,
  }))
  return (
    <div data-modo="demo-switcher">
      <shell.Select
        value={current.url}
        onChange={(url: string) => {
          window.location.href = url
        }}
        options={options}
      />
    </div>
  )
}
