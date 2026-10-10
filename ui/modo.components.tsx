/*
 * Components the docs site uses but the design system doesn't document.
 * modo.config.ts picks each one by export name: `./modo.components.tsx#Select`.
 */

import { Check, CodeXml, Copy, Link2, Monitor, Moon, Sun } from 'lucide-react'
import { Children, createContext, isValidElement, type ReactNode, useContext, useEffect, useState } from 'react'
import FluidSelect from './components/inputs/select'
import Sidebar, {
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_KEYBOARD_SHORTCUT_RIGHT,
  type SidebarSide,
  useSidebar,
} from './components/navigation/sidebar'
import { cn } from './lib/utils'

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
 * Sidebar slot: both asides of the chrome, each an inset `Sidebar` with its
 * own `openOnHover` provider, so the content between them is the inset card
 * (global.css). The trigger in the card's corner (or `[` for the nav, `]` for
 * the panel) switches a side between open and on hover. Below md each side
 * is a drawer. The panel starts on hover below xl.
 *
 * A section of links is a collapsible `Sidebar.Group` whose rows share one
 * `Sidebar.Menu`, so the current page and the hover highlight melt from link
 * to link (the TOC's current heading too, as the page scrolls); a panel
 * section (the Theme select) keeps its control under the group label. Pinned
 * in modo.config.ts, since by name alone modo would adopt the documented
 * `Sidebar`, an app shell that needs its provider.
 */
export function DocsNav({ children }: { children?: ReactNode }) {
  const [side, setSide] = useState<SidebarSide>()
  // The slot gets no side: which aside it landed in tells, before first paint.
  if (!side) return <div ref={node => node && setSide(node.closest('[data-modo="panel"]') ? 'right' : 'left')} />
  return <DocsSidebar side={side}>{children}</DocsSidebar>
}

function DocsSidebar({ side, children }: { side: SidebarSide; children?: ReactNode }) {
  return (
    <Sidebar.Provider
      defaultOpen={side === 'left' || window.matchMedia('(min-width: 1280px)').matches}
      openOnHover
      persist={false}
      shortcut={null}
    >
      <Sidebar variant="inset" side={side}>
        <Sidebar.Content>
          <nav aria-label={side === 'left' ? 'Docs' : 'Page'}>{children}</nav>
        </Sidebar.Content>
      </Sidebar>
      <DocsNavTrigger side={side} />
    </Sidebar.Provider>
  )
}

/**
 * The trigger, in the card's top corner where the inset topbar keeps it. The
 * card sits flush with an open sidebar and a gutter away from a hidden one,
 * so the trigger follows.
 */
function DocsNavTrigger({ side }: { side: SidebarSide }) {
  const { state, isMobile, toggleSidebar } = useSidebar()
  useDocsShortcut(side === 'left' ? SIDEBAR_KEYBOARD_SHORTCUT : SIDEBAR_KEYBOARD_SHORTCUT_RIGHT, toggleSidebar)

  return (
    <div
      className={cn(
        'absolute top-2 flex h-12 items-center px-1.5 transition-[margin] duration-fast',
        side === 'left' ? 'left-full' : 'right-full',
        (state === 'collapsed' || isMobile) && (side === 'left' ? 'ml-2' : 'mr-2'),
      )}
    >
      <Sidebar.Trigger />
    </div>
  )
}

/**
 * `[` / `]` for the docs sidebars, owned here rather than by their providers:
 * a provider's key goes to the first one mounted when focus is on the page,
 * and on a fresh load that is a demo in the content, mounted a render before
 * the chrome's. The demos keep the key while focus is inside one.
 */
function useDocsShortcut(key: string, toggle: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (target.isContentEditable) return
      if (target.closest('input, textarea, select, [data-modo="content"] [data-slot="sidebar-wrapper"]')) return
      // Capture phase: the demos' providers listen on window too, and must not toggle with it.
      event.stopImmediatePropagation()
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [key, toggle])
}

/** How deep a nav element sits: a tier is a section, a group folder a section inside it. */
const NavDepth = createContext(0)

function DocsNavItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  const { setOpenMobile } = useSidebar()
  if (useContext(NavDepth) === 2) {
    return (
      <Sidebar.MenuSubItem>
        <Sidebar.MenuSubButton href={href} isActive={active} onClick={() => setOpenMobile(false)}>
          {children}
        </Sidebar.MenuSubButton>
      </Sidebar.MenuSubItem>
    )
  }
  return (
    <Sidebar.MenuItem>
      <Sidebar.MenuButton isActive={active} render={<a href={href} />} onClick={() => setOpenMobile(false)}>
        {children}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  )
}

function DocsNavSection({ title, children }: { title: string; children?: ReactNode }) {
  const depth = useContext(NavDepth)
  if (depth === 1) return <DocsNavGroup title={title}>{children}</DocsNavGroup>
  const onlyLinks = Children.toArray(children).every(
    child => isValidElement(child) && (child.type === DocsNavItem || child.type === DocsNavSection),
  )
  if (onlyLinks) {
    return (
      <Sidebar.Group collapsible>
        <Sidebar.GroupLabel>{title}</Sidebar.GroupLabel>
        <NavDepth.Provider value={1}>
          <Sidebar.Menu>{children}</Sidebar.Menu>
        </NavDepth.Provider>
      </Sidebar.Group>
    )
  }
  return (
    <Sidebar.Group>
      <Sidebar.GroupLabel>{title}</Sidebar.GroupLabel>
      <div className="px-2">{children}</div>
    </Sidebar.Group>
  )
}

/** A group folder inside a tier: a collapsible row, opened while it holds the current page. */
function DocsNavGroup({ title, children }: { title: string; children?: ReactNode }) {
  const current = Children.toArray(children).some(
    child => isValidElement<{ active?: boolean }>(child) && child.props.active,
  )
  const [open, setOpen] = useState(current)
  useEffect(() => {
    if (current) setOpen(true)
  }, [current])
  return (
    <Sidebar.MenuItem collapsible open={open} onOpenChange={setOpen}>
      <Sidebar.MenuButton>{title}</Sidebar.MenuButton>
      <NavDepth.Provider value={2}>
        <Sidebar.MenuSub>{children}</Sidebar.MenuSub>
      </NavDepth.Provider>
    </Sidebar.MenuItem>
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
