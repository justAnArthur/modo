/*
 * Components the docs site uses but the design system doesn't document.
 * modo.config.ts picks each one by export name: `./modo.components.tsx#Select`.
 */

import { Check, CodeXml, Copy, Link2, Monitor, Moon, Sun } from 'lucide-react'
import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react'
import FluidSelect from './components/select'
import Sidebar from './components/sidebar'

const icons = { code: CodeXml, copy: Copy, check: Check, link: Link2 }

/** Icon slot: the chrome asks for icons by name; lucide draws them. */
export function Icon({
  name,
}: {
  /** Which chrome icon to draw. */
  name: keyof typeof icons
  /** Accessible text; the button around the icon carries it. */
  label: string
}) {
  const Glyph = icons[name]
  return <Glyph size={16} strokeWidth={1.5} aria-hidden />
}

/**
 * Select slot: the chrome passes a flat `value` / `onChange` / `options`
 * contract; FF's Select is compositional, so this maps one onto the other.
 */
export function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <FluidSelect value={value} onValueChange={onChange}>
      <FluidSelect.Trigger />
      <FluidSelect.Content>
        {options.map((option, index) => (
          <FluidSelect.Item key={option.value} value={option.value} index={index}>
            {option.label}
          </FluidSelect.Item>
        ))}
      </FluidSelect.Content>
    </FluidSelect>
  )
}

type ThemePreference = 'light' | 'dark' | 'system'

declare global {
  interface Window {
    __uiTheme?: { get: () => ThemePreference; set: (next: ThemePreference) => void }
  }
}

/**
 * Sidebar slot: both asides of the chrome, drawn with the Sidebar's own
 * parts. A section of links is a collapsible `Sidebar.Group` whose rows share
 * one `Sidebar.Menu`, so the current page and the hover highlight melt from
 * link to link (the TOC's current heading too, as the page scrolls); a panel
 * section (the Theme select) keeps its control under the group label. Pinned
 * in modo.config.ts, since by name alone modo would adopt the documented
 * `Sidebar`, an app shell that needs its provider.
 */
export function DocsNav({ children }: { children?: ReactNode }) {
  return <nav data-modo="sidebar-nav">{children}</nav>
}

function DocsNavItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  return (
    <Sidebar.MenuItem>
      <Sidebar.MenuButton isActive={active} render={<a href={href} />}>
        {children}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  )
}

function DocsNavSection({ title, children }: { title: string; children?: ReactNode }) {
  const links = Children.toArray(children).every(child => isValidElement(child) && child.type === DocsNavItem)
  if (!links) {
    return (
      <Sidebar.Group>
        <Sidebar.GroupLabel>{title}</Sidebar.GroupLabel>
        <div className="px-2">{children}</div>
      </Sidebar.Group>
    )
  }
  return (
    <Sidebar.Group collapsible>
      <Sidebar.GroupLabel>{title}</Sidebar.GroupLabel>
      <Sidebar.Menu>{children}</Sidebar.Menu>
    </Sidebar.Group>
  )
}

DocsNav.Item = DocsNavItem
DocsNav.Section = DocsNavSection

const THEMES = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

/**
 * Theme panel item. The switching itself is the pre-paint script vite.ts
 * injects (`window.__uiTheme`), so a stored preference applies before first
 * paint; this only reflects and sets it. `ui:themechange` also fires when the
 * OS flips underneath 'system'.
 */
export function ThemeSwitcher() {
  const [preference, setPreference] = useState<ThemePreference>(() => window.__uiTheme?.get() ?? 'system')

  useEffect(() => {
    const sync = () => setPreference(window.__uiTheme?.get() ?? 'system')
    sync()
    window.addEventListener('ui:themechange', sync)
    return () => window.removeEventListener('ui:themechange', sync)
  }, [])

  const active = THEMES.find(theme => theme.value === preference) ?? THEMES[2]!

  return (
    <FluidSelect value={preference} onValueChange={next => window.__uiTheme?.set(next as ThemePreference)}>
      <FluidSelect.Trigger aria-label="Color theme" icon={active.icon} />
      <FluidSelect.Content>
        {THEMES.map((theme, index) => (
          <FluidSelect.Item key={theme.value} index={index} value={theme.value} icon={theme.icon}>
            {theme.label}
          </FluidSelect.Item>
        ))}
      </FluidSelect.Content>
    </FluidSelect>
  )
}
