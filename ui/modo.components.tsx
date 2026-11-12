/*
 * Components the docs site uses but the design system doesn't document.
 * modo.config.ts picks each one by export name: `./modo.components.tsx#Select`.
 */

import {
  Check,
  CodeXml,
  Copy,
  ExternalLink,
  Link2,
  type LucideIcon,
  Menu,
  Monitor,
  Moon,
  Package,
  Sun,
} from 'lucide-react'
import { Children, createContext, isValidElement, type ReactNode, useContext, useEffect, useState } from 'react'
import FluidSelect from './components/inputs/select'
import Sidebar, {
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_KEYBOARD_SHORTCUT_RIGHT,
  type SidebarSide,
  useSidebar,
} from './components/navigation/sidebar'
import { useIsMobile } from './lib/use-is-mobile'
import { cn } from './lib/utils'

const icons: Record<string, LucideIcon> = {
  code: CodeXml,
  copy: Copy,
  check: Check,
  link: Link2,
  external: ExternalLink,
  menu: Menu,
  sun: Sun,
  moon: Moon,
  npm: Package,
}

/** Icon slot: the chrome asks for icons by name; lucide draws them. */
export function Icon({
  name,
  label,
}: {
  /** Which icon to draw: a chrome name or a `socials` key. */
  name: string
  /** Accessible text; the button around the icon carries it. Drawn for a name with no glyph. */
  label: string
}) {
  if (name === 'github') return <GithubMark />
  const Glyph = icons[name]
  return Glyph ? <Glyph size={16} strokeWidth={1.5} aria-hidden /> : <>{label}</>
}

/** lucide ships no brand marks; this is GitHub's (Simple Icons, CC0). */
function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
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
 * the panel) switches a side between open and on hover. Below md both sit in
 * flow, as the chrome stacks them: the nav under the header's menu toggle,
 * the panel below the content. The panel starts on hover below xl.
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
  const isMobile = useIsMobile(768)
  const nav = (
    <Sidebar.Content>
      <nav aria-label={side === 'left' ? 'Docs' : 'Page'}>{children}</nav>
    </Sidebar.Content>
  )
  // Below md the chrome stacks: the nav folds under the header's menu toggle
  // and the panel sits below the content, so both render in flow, not as drawers.
  if (isMobile) {
    return (
      <Sidebar.Provider persist={false} shortcut={null} className="min-h-0">
        <Sidebar variant="inset" side={side} collapsible="none" className="static h-auto" style={{ width: '100%' }}>
          {nav}
        </Sidebar>
      </Sidebar.Provider>
    )
  }
  return (
    <Sidebar.Provider
      defaultOpen={side === 'left' || window.matchMedia('(min-width: 1280px)').matches}
      openOnHover
      persist={false}
      shortcut={null}
    >
      <Sidebar variant="inset" side={side}>
        {nav}
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

/** How deep a nav element sits: a tier is a section, a group folder a section inside it, a nested group deeper still. */
const NavDepth = createContext(0)

function DocsNavItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  const { setOpenMobile } = useSidebar()
  if (useContext(NavDepth) >= 2) {
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
  if (depth >= 1) return <DocsNavGroup title={title}>{children}</DocsNavGroup>
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

/** Whether a nav subtree holds the current page, nested groups included. */
const holdsActive = (children: ReactNode): boolean =>
  Children.toArray(children).some(
    child =>
      isValidElement<{ active?: boolean; children?: ReactNode }>(child) &&
      (child.props.active || holdsActive(child.props.children)),
  )

/** A group folder inside a tier (or inside another group): a collapsible row, opened while it holds the current page. */
function DocsNavGroup({ title, children }: { title: string; children?: ReactNode }) {
  const depth = useContext(NavDepth)
  const current = holdsActive(children)
  const [open, setOpen] = useState(current)
  useEffect(() => {
    if (current) setOpen(true)
  }, [current])
  return (
    <Sidebar.MenuItem collapsible open={open} onOpenChange={setOpen}>
      <Sidebar.MenuButton>{title}</Sidebar.MenuButton>
      <NavDepth.Provider value={depth + 1}>
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

/** The header mark: modo's frame and drop (a docs page, a component settled into it), drawn in the text color so it follows the theme. */
export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <rect x="13" y="13" width="17" height="17" rx="8" fill="currentColor" />
    </svg>
  )
}
