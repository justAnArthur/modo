// sidebar nav for the docs site. groups every item by tier, sorts
// alphabetically inside each tier; tokens are listed in a fixed
// order so the nav doesn't shuffle when a token group is added or
// removed.

import { items, byId } from 'virtual:modo-items'
import { TIER_LABEL, TIER_ORDER, type Tier } from './tiers'

const TOKEN_GROUPS: { key: string; label: string }[] = [
  { key: 'colors', label: 'Colors' },
  { key: 'surfaces', label: 'Surfaces' },
  { key: 'typography', label: 'Typography' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'radius', label: 'Radius' },
  { key: 'motion', label: 'Motion' },
]

export function SidebarNav() {
  const byTier: Record<Tier, Array<{ id: string; label: string }>> = {
    primitives: [],
    components: [],
    blocks: [],
  }
  for (const item of items) {
    const label = byId[`${item.category}/${item.id}`]?.name ?? item.id
    byTier[item.category].push({ id: item.id, label })
  }
  for (const tier of TIER_ORDER) byTier[tier].sort((a, b) => a.label.localeCompare(b.label))

  return (
    <nav data-aui="sidebar-nav" aria-label="Main navigation">
      <div data-aui="sidebar-section">Foundations</div>
      <ul data-aui="sidebar-list">
        {TOKEN_GROUPS.map((g) => (
          <li key={g.key}>
            <a href={`/docs/tokens/${g.key}`} data-aui="sidebar-link">{g.label}</a>
          </li>
        ))}
      </ul>
      {TIER_ORDER.map((tier) =>
        byTier[tier].length === 0 ? null : (
          <div key={tier}>
            <div data-aui="sidebar-section">{TIER_LABEL[tier]}</div>
            <ul data-aui="sidebar-list">
              {byTier[tier].map((it) => (
                <li key={it.id}>
                  <a href={`/docs/${tier}/${it.id}`} data-aui="sidebar-link">{it.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </nav>
  )
}
