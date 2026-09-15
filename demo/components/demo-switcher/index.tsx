import './demo-switcher.css'
import peers from './.peers.json'
import type { ResolvedShellExport } from 'virtual:modo-shell'

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
  const here = typeof window !== 'undefined' ? window.location.origin : peers[0]!.url
  const options = peers.map((p) => ({
    value: p.url,
    label: `${p.name}${p.url.startsWith(here) ? ' (current)' : ''}`,
  }))
  return (
    <div data-modo="demo-switcher">
      <shell.Select
        value={peers.find((p) => p.url.startsWith(here))?.url ?? peers[0]!.url}
        onChange={(url: string) => {
          if (typeof window !== 'undefined') window.location.href = url
        }}
        options={options}
      />
    </div>
  )
}
