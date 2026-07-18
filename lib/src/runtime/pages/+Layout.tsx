// shared layout for every page in the docs site.
// wraps each page in <aside data-aui="sidebar"> (left) and
// <main data-aui="content"> (center). the right <aside data-aui="panel">
// is the "make it yours" panel — uses the user's <Select> when provided
// via modo.config.ts components.Select, otherwise native fallback.

import type { ReactNode } from 'react'
import { Link } from '../components/link'
import { SelectSlot } from '../components/slot'
import './+Layout.css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div data-aui="app">
      <aside data-aui="sidebar">
        <div data-aui="sidebar-header">
          <Link href="/" data-aui="sidebar-brand">modo-atomic-ui</Link>
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
      </aside>
    </div>
  )
}

function SidebarNav() {
  return (
    <nav data-aui="sidebar-nav" aria-label="Main navigation">
      <div data-aui="sidebar-section">Foundations</div>
      <ul data-aui="sidebar-list">
        <li><Link href="/docs/tokens/colors" data-aui="sidebar-link">Colors</Link></li>
        <li><Link href="/docs/tokens/surfaces" data-aui="sidebar-link">Surfaces</Link></li>
        <li><Link href="/docs/tokens/typography" data-aui="sidebar-link">Typography</Link></li>
        <li><Link href="/docs/tokens/spacing" data-aui="sidebar-link">Spacing</Link></li>
        <li><Link href="/docs/tokens/radius" data-aui="sidebar-link">Radius</Link></li>
        <li><Link href="/docs/tokens/motion" data-aui="sidebar-link">Motion</Link></li>
      </ul>
      <div data-aui="sidebar-section">Primitives</div>
      <ul data-aui="sidebar-list">
        <li><Link href="/docs/primitives/button" data-aui="sidebar-link">Button</Link></li>
        <li><Link href="/docs/primitives/input" data-aui="sidebar-link">Input</Link></li>
        <li><Link href="/docs/primitives/badge" data-aui="sidebar-link">Badge</Link></li>
      </ul>
      <div data-aui="sidebar-section">Components</div>
      <ul data-aui="sidebar-list">
        <li><Link href="/docs/components/popover" data-aui="sidebar-link">Popover</Link></li>
        <li><Link href="/docs/components/tooltip" data-aui="sidebar-link">Tooltip</Link></li>
      </ul>
      <div data-aui="sidebar-section">Blocks</div>
      <ul data-aui="sidebar-list">
        <li><Link href="/docs/blocks/login-form" data-aui="sidebar-link">LoginForm</Link></li>
      </ul>
    </nav>
  )
}

function ThemeSwitcher() {
  return (
    <label data-aui="control" data-control="theme">
      <span data-aui="control-label">Theme</span>
      <SelectSlot
        value={typeof localStorage !== 'undefined' ? (localStorage.getItem('modo-theme') ?? 'system') : 'system'}
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
        value={typeof localStorage !== 'undefined' ? (localStorage.getItem('modo-density') ?? 'comfortable') : 'comfortable'}
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
