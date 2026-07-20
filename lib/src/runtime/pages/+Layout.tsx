// shared layout for every page in the docs site.
// wraps each page in <aside data-aui="sidebar"> (left) and
// <main data-aui="content"> (center).
//
// CSS is loaded via side-effect imports of the three virtual CSS modules:
// tokens, items, user overrides. Vite injects them in import order, so
// the order here is: tokens → items → user overrides (overrides win).

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import Panel from 'modo.panel'
import { config as siteConfig, name as siteName, description as siteDescription } from 'virtual:modo-config'
import { items, byId } from 'virtual:modo-items'
import { useConfig } from 'vike-react/useConfig'
import '../styles/base.css'
import './+Layout.css'
import 'virtual:modo-tokens-css'
import 'virtual:modo-items-css'
import 'virtual:modo-user-css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // set the page title + description from the user's modo.config.ts.
  // the +config.ts static fallback is overridden here so the rendered
  // HTML matches the project name, not the lib's name. called once
  // in useEffect — invoking useConfig's returned setter on every
  // render causes applyHead() to thrash document.title during client
  // navigation, which breaks vike-react's <a> interception on some
  // browsers. useEffect is the safe pattern.
  const setConfig = useConfig()
  useEffect(() => {
    setConfig({
      title: siteName,
      description: siteDescription || undefined,
    })
  }, [siteName, siteDescription, setConfig])
  return (
    <div data-aui="app">
      <aside data-aui="sidebar">
        <div data-aui="sidebar-header">
          <a href="/" data-aui="sidebar-brand">{siteName}</a>
        </div>
        <SidebarNav />
      </aside>
      <main data-aui="content">
        {children}
      </main>
      <aside data-aui="panel">
        <Panel />
      </aside>
    </div>
  )
}

const TOKEN_GROUPS: { key: string; label: string }[] = [
  { key: 'colors', label: 'Colors' },
  { key: 'surfaces', label: 'Surfaces' },
  { key: 'typography', label: 'Typography' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'radius', label: 'Radius' },
  { key: 'motion', label: 'Motion' },
]

const TIER_LABEL: Record<'primitives' | 'components' | 'blocks', string> = {
  primitives: 'Primitives',
  components: 'Components',
  blocks: 'Blocks',
}

const TIER_ORDER: Array<'primitives' | 'components' | 'blocks'> = ['primitives', 'components', 'blocks']

function SidebarNav() {
  // group items by tier, sort alphabetically inside each tier. tokens are
  // listed in a fixed order so the nav doesn't shuffle when a token group
  // is added/removed.
  const byTier: Record<'primitives' | 'components' | 'blocks', Array<{ id: string; label: string }>> = {
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
