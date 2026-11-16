import './demo-switcher.css'
import type { PanelItemProps } from '@justanarthur/modo'
import peers from './.peers.json'

// Cross-site navigation: one option per peer in the host's Select, under its
// group once there is more than one (design systems, kits); hidden with fewer than two peers.
const grouped = new Set(peers.map(p => p.group)).size > 1

export default function DemoSwitcher({ shell }: PanelItemProps) {
  if (peers.length < 2) return null
  // A peer is an origin in dev (one server per port) and a path when built.
  const here = window.location.href
  const current = peers.find(p => here.startsWith(new URL(p.url, here).href)) ?? peers[0]!
  const options = peers.map(p => ({
    value: p.url,
    label: `${p.name}${p === current ? ' (current)' : ''}`,
    group: grouped ? p.group : undefined,
  }))
  return (
    <div data-modo="demo-switcher">
      <shell.Select
        value={current.url}
        onValueChange={url => {
          window.location.href = url
        }}
        options={options}
      />
    </div>
  )
}
