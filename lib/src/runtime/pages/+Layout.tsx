// shared layout for every page in the docs site.
// wraps each page in <aside data-aui="sidebar"> (left) and
// <main data-aui="content"> (center). the right <aside data-aui="panel">
// is the "make it yours" panel — uses the user's <Select> when provided
// via modo.config.ts components.Select, otherwise native fallback.

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from '../components/link'
import { SelectSlot } from '../components/slot'
import { css as userCss } from 'virtual:modo-user-css'
import { config as siteConfig, name as siteName, description as siteDescription } from 'virtual:modo-config'
import { items, byId } from 'virtual:modo-items'
import { useConfig } from 'vike-react/useConfig'
import './+Layout.css'

interface LayoutProps {
  children: ReactNode
}

// pull a few values from the site config. the layout is the only place
// we need the chrome-side bits; per-item pages already use byId for their
// own names + descriptions.
const theme = (siteConfig as { theme?: { defaultTheme?: 'light' | 'dark' | 'system'; defaultDensity?: 'compact' | 'comfortable' | 'spacious' } }).theme
const DEFAULT_THEME = theme?.defaultTheme ?? 'system'
const DEFAULT_DENSITY = theme?.defaultDensity ?? 'comfortable'

// read + apply theme/density/radius once on the client. localStorage
// wins if a user has picked a value, otherwise we use the project's
// configured default. SSR returns the configured default; hydration
// may swap to the localStorage value — that's a small flash on first
// load but it's the right priority (user pref > project default).
function useChromePreferences() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const stored = (k: string) => {
      try { return localStorage.getItem(k) } catch { return null }
    }
    const setOrRemove = (attr: string, v: string | null) => {
      if (!v || v === 'system' || v === 'rounded') {
        document.documentElement.removeAttribute(attr)
      } else {
        document.documentElement.setAttribute(attr, v)
      }
    }
    setOrRemove('data-theme', stored('modo-theme') ?? DEFAULT_THEME)
    setOrRemove('data-density', stored('modo-density') ?? DEFAULT_DENSITY)
    setOrRemove('data-radius', stored('modo-radius') ?? 'rounded')
  }, [])
}

export default function Layout({ children }: LayoutProps) {
  useChromePreferences()
  // set the page title + description from the user's modo.config.ts.
  // the +config.ts static fallback is overridden here so the rendered
  // HTML matches the project name, not the lib's name.
  const setConfig = useConfig()
  setConfig({
    title: siteName,
    description: siteDescription || undefined,
  })
  return (
    <>
      {userCss && <style dangerouslySetInnerHTML={{ __html: userCss }} />}
      <div data-aui="app">
        <aside data-aui="sidebar">
          <div data-aui="sidebar-header">
            <Link href="/" data-aui="sidebar-brand">{siteName}</Link>
          </div>
          <SidebarNav />
        </aside>
        <main data-aui="content">
          {children}
        </main>
        <aside data-aui="panel">
          <h2 data-aui="panel-title">make them yours</h2>
          <p data-aui="panel-hint">
            override <code>data-aui</code> styles in your <code>overrides.css</code>.
          </p>
          <ThemeSwitcher />
          <DensitySwitcher />
          <RadiusSwitcher />
        </aside>
      </div>
    </>
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
            <Link href={`/docs/tokens/${g.key}`} data-aui="sidebar-link">{g.label}</Link>
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
                  <Link href={`/docs/${tier}/${it.id}`} data-aui="sidebar-link">{it.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </nav>
  )
}

function ThemeSwitcher() {
  return (
    <label data-aui="control" data-control="theme">
      <span data-aui="control-label">Theme</span>
      <SelectSlot
        value={DEFAULT_THEME}
        onChange={(v) => {
          if (v === 'system') {
            document.documentElement.removeAttribute('data-theme')
          } else {
            document.documentElement.setAttribute('data-theme', v)
          }
          try { localStorage.setItem('modo-theme', v) } catch { /* noop */ }
        }}
        options={[
          { value: 'system', label: 'system' },
          { value: 'light', label: 'light' },
          { value: 'dark', label: 'dark' },
        ]}
      />
    </label>
  )
}

function DensitySwitcher() {
  return (
    <label data-aui="control" data-control="density">
      <span data-aui="control-label">Density</span>
      <SelectSlot
        value={DEFAULT_DENSITY}
        onChange={(v) => {
          document.documentElement.setAttribute('data-density', v)
          try { localStorage.setItem('modo-density', v) } catch { /* noop */ }
        }}
        options={[
          { value: 'compact', label: 'compact' },
          { value: 'comfortable', label: 'comfortable' },
          { value: 'spacious', label: 'spacious' },
        ]}
      />
    </label>
  )
}

function RadiusSwitcher() {
  return (
    <label data-aui="control" data-control="radius">
      <span data-aui="control-label">Radius</span>
      <SelectSlot
        value="rounded"
        onChange={(v) => {
          if (v === 'rounded') {
            document.documentElement.removeAttribute('data-radius')
          } else {
            document.documentElement.setAttribute('data-radius', v)
          }
          try { localStorage.setItem('modo-radius', v) } catch { /* noop */ }
        }}
        options={[
          { value: 'rounded', label: 'rounded' },
          { value: 'pill', label: 'pill' },
        ]}
      />
    </label>
  )
}
