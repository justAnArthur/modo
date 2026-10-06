/*
 * Components the docs site uses but the design system doesn't document.
 * modo.config.ts picks each one by export name: `./modo.components.tsx#Select`.
 */

import { Check, CodeXml, Copy, Link2, Monitor, Moon, Sun } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import FluidSelect from './components/select'

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
 * Sidebar slot: the chrome's nav as modo draws it by default. Pinned so the
 * chrome doesn't adopt the documented `Sidebar` (an app shell that needs its
 * provider) by its name.
 */
export function DocsNav({ children }: { children?: ReactNode }) {
  return <nav data-modo="sidebar-nav">{children}</nav>
}

DocsNav.Item = function DocsNavItem({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
  children?: ReactNode
}) {
  return (
    <a data-modo="sidebar-item" href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

DocsNav.Section = function DocsNavSection({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div data-modo="sidebar-section">
      <h3 data-modo="sidebar-section-title">{title}</h3>
      <div data-modo="sidebar-section-items">{children}</div>
    </div>
  )
}

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
