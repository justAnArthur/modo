/*
 * Local addition (not part of Fluid Functionalism): the docs chrome, every slot
 * adapter modo's viewer needs to draw a design system's docs the way modo-ui's
 * own site is drawn. A modo.config.ts picks each one by export name:
 * `./docs/chrome.tsx#DocsNav` here, `@justanarthur/modo-ui/docs#DocsNav` from
 * another package. Its look is chrome.css (`@justanarthur/modo-ui/docs/chrome.css`),
 * keyed on `data-modo-ui`, so no utility generator has to scan this module; the
 * pre-paint theme controller is `docsTheme` (`@justanarthur/modo-ui/docs/vite`).
 */

'use client'

import type {
  IconSlotProps,
  LinkSlotProps,
  SelectOption,
  SelectSlotProps,
  SidebarItemProps,
  SidebarSectionProps,
  SidebarSlotProps,
  SiteSwitcherSlotProps,
} from '@justanarthur/modo'
import {
  Check,
  CodeXml,
  Copy,
  Link2,
  type LucideIcon,
  Maximize2,
  Menu,
  Monitor,
  Moon,
  Package,
  PanelsTopLeft,
  Sun,
  X,
} from 'lucide-react'
import { Children, createContext, isValidElement, type ReactNode, useContext, useEffect, useState } from 'react'
import ModoButton from '../components/actions/button'
import List, { LIST_POPOVER } from '../components/data-display/list'
import FluidSelect from '../components/inputs/select'
import Sidebar, { type SidebarSide, useSidebar } from '../components/navigation/sidebar'
import Popover from '../components/overlays/popover'
import Tooltip from '../components/overlays/tooltip'
import { useIsMobile } from '../lib/use-is-mobile'

/**
 * Button slot: the chrome's icon buttons (Show code, Copy, the anchor toggles), as the design
 * system's Button. Pinned so a host with an item named `Button` of another shape is not matched by name.
 */
export const Button = ModoButton

/**
 * Link slot: every chrome and Markdown link, a plain anchor so the chrome's own link styling applies.
 * Pinned so a host with an item named `Link` of another shape is not matched by name.
 */
export function Link({ href, children, ...rest }: LinkSlotProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

const icons: Record<string, LucideIcon> = {
  code: CodeXml,
  copy: Copy,
  check: Check,
  link: Link2,
  maximize: Maximize2,
  menu: Menu,
  close: X,
  sun: Sun,
  moon: Moon,
  npm: Package,
}

/** Icon slot: the chrome asks for icons by name; lucide draws them. */
export function Icon({ name, label }: IconSlotProps) {
  if (name === 'github') return <GithubMark />
  const Glyph = icons[name]
  return Glyph ? <Glyph size={16} strokeWidth={1.5} aria-hidden /> : label
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
 * Select slot: the chrome passes a flat `value` / `onValueChange` / `options`
 * contract; FF's Select is compositional, so this maps one onto the other,
 * an option's `group` onto a `Select.Group` under its `Select.Label`.
 */
export function Select({ value, onValueChange, options }: SelectSlotProps) {
  const item = (option: SelectOption) => (
    <FluidSelect.Item key={option.value} value={option.value}>
      {option.label}
    </FluidSelect.Item>
  )
  const groups = [...new Set(options.flatMap(option => option.group ?? []))]
  return (
    <FluidSelect value={value} onValueChange={onValueChange}>
      <FluidSelect.Trigger />
      <FluidSelect.Content>
        {options.filter(option => option.group === undefined).map(item)}
        {groups.map(group => (
          <FluidSelect.Group key={group}>
            <FluidSelect.Label>{group}</FluidSelect.Label>
            {options.filter(option => option.group === group).map(item)}
          </FluidSelect.Group>
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
 * (chrome.css). The trigger in the card's corner (or `[` for the nav, `]` for
 * the panel, page-scoped so a demo's own sidebar keeps its key only while
 * focus is inside it) switches a side between open and on hover. Below md both sit in
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
export const DocsNav = Object.assign(
  function DocsNav({ children }: SidebarSlotProps) {
    const [side, setSide] = useState<SidebarSide>()
    // The slot gets no side: which aside it landed in tells, before first paint.
    if (!side) return <div ref={node => node && setSide(node.closest('[data-modo="panel"]') ? 'right' : 'left')} />
    return <DocsSidebar side={side}>{children}</DocsSidebar>
  },
  { Item: DocsNavItem, Section: DocsNavSection },
)

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
      <Sidebar.Provider persist={false} shortcut={null} style={{ minHeight: 0 }}>
        <Sidebar
          variant="inset"
          side={side}
          collapsible="none"
          style={{ position: 'static', height: 'auto', width: '100%' }}
        >
          {nav}
        </Sidebar>
      </Sidebar.Provider>
    )
  }
  return (
    // The chrome's column holds the header above the nav, so the sidebar fills
    // what is left of it rather than the whole viewport.
    <Sidebar.Provider
      defaultOpen={side === 'left' || window.matchMedia('(min-width: 1280px)').matches}
      openOnHover
      persist={false}
      shortcutScope="page"
      style={{ height: '100%', minHeight: 0 }}
    >
      <Sidebar variant="inset" side={side} style={{ height: '100%' }}>
        {nav}
      </Sidebar>
      <DocsNavTrigger side={side} />
    </Sidebar.Provider>
  )
}

/**
 * The trigger, in the card's top corner where the inset topbar keeps it. The
 * card sits flush with an open sidebar and a gutter away from a hidden one,
 * so the trigger follows (chrome.css, `nav-trigger`), in the band `--docs-band` sets.
 */
function DocsNavTrigger({ side }: { side: SidebarSide }) {
  const { state, isMobile } = useSidebar()
  return (
    <div data-modo-ui="nav-trigger" data-side={side} data-gutter={state === 'collapsed' || isMobile ? '' : undefined}>
      <Sidebar.Trigger />
    </div>
  )
}

/** How deep a nav element sits: a tier is a section, a group folder a section inside it, a nested group deeper still. */
const NavDepth = createContext(0)

function DocsNavItem({ href, active, children }: SidebarItemProps) {
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

function DocsNavSection({ title, children }: SidebarSectionProps) {
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
      <div data-modo-ui="nav-controls">{children}</div>
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
function DocsNavGroup({ title, children }: SidebarSectionProps) {
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

const THEMES = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

/**
 * Theme panel item. The switching itself is the pre-paint script `docsTheme`
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

/**
 * SiteSwitcher slot: the site view's badge (the site's mark, else a pages glyph) on an elevated
 * surface, opening a Popover that grows out of it: the site and the page on screen, the pages as a
 * Sidebar menu (the current one lit, the hover melting from row to row, arrow keys between them), the
 * panel items as list rows, and the links back to the docs. It opens away from the corner modo keeps
 * it in; picking a page closes it. modo drags it between corners, so the tooltip says so.
 */
export function SiteSwitcher({ name, logo, pages, current, sections, links, corner }: SiteSwitcherSlotProps) {
  const [open, setOpen] = useState(false)
  const label = current ? `Pages: ${current}` : 'Pages'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div data-modo-ui="site-badge">
        <Tooltip content="Pages · drag to move" side={corner.startsWith('top') ? 'bottom' : 'top'}>
          <Popover.Trigger
            render={
              <ModoButton variant="ghost" size="icon" aria-label={label}>
                {logo ?? <PanelsTopLeft aria-hidden />}
              </ModoButton>
            }
          />
        </Tooltip>
      </div>
      <Popover.Content
        side={corner.startsWith('top') ? 'bottom' : 'top'}
        align={corner.endsWith('left') ? 'start' : 'end'}
        sideOffset={8}
        className={LIST_POPOVER}
        aria-label={`${name} pages`}
      >
        <div data-modo-ui="site-head">
          <Popover.Title>{name}</Popover.Title>
          <Popover.Description>{current ?? 'No page'}</Popover.Description>
        </div>
        <List.Section title="Pages">
          <nav aria-label="Pages">
            <Sidebar.Menu>
              {pages.map(page => (
                <Sidebar.MenuItem key={page.id}>
                  <Sidebar.MenuButton
                    isActive={page.current}
                    render={<a href={page.href} aria-current={page.current ? 'page' : undefined} />}
                    onClick={() => setOpen(false)}
                  >
                    {page.title}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </nav>
        </List.Section>
        {sections.length > 0 && (
          <List>
            {sections.map((section, i) => (
              <List.Row key={`${i}-${section.label}`} label={section.label}>
                {section.content}
              </List.Row>
            ))}
          </List>
        )}
        <div data-modo-ui="site-foot">
          {links.map(link => (
            <ModoButton
              key={link.href}
              variant="ghost"
              size="compact"
              render={<a href={link.href} />}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </ModoButton>
          ))}
        </div>
      </Popover.Content>
    </Popover>
  )
}
