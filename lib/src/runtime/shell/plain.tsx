import { useEffect, useId, useRef, useState } from 'react'
import type {
  ButtonSlotProps,
  CodeSlotProps,
  IconSlotProps,
  LinkSlotProps,
  SelectOption,
  SelectSlotProps,
  SidebarItemProps,
  SidebarSectionProps,
  SidebarSlotProps,
  SiteSwitcherSlotProps,
} from '../../lib/contract'

// Fallbacks for the slots a host doesn't fill: semantic tags and data-modo hooks, no visuals.

export function PlainButton({ variant: _variant, size: _size, ...rest }: ButtonSlotProps) {
  return <button type="button" {...rest} />
}

export function PlainLink(props: LinkSlotProps) {
  return <a {...props} />
}

export function PlainCode({ children }: CodeSlotProps) {
  return (
    <pre>
      <code>{children}</code>
    </pre>
  )
}

export function PlainSelect({ value, onValueChange, options }: SelectSlotProps) {
  const option = (o: SelectOption) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  )
  const groups = [...new Set(options.flatMap(o => o.group ?? []))]
  return (
    <select value={value} onChange={e => onValueChange(e.target.value)}>
      {options.filter(o => o.group === undefined).map(option)}
      {groups.map(group => (
        <optgroup key={group} label={group}>
          {options.filter(o => o.group === group).map(option)}
        </optgroup>
      ))}
    </select>
  )
}

/** Hosts without an Icon slot get the label as text. */
export function PlainIcon({ label }: IconSlotProps) {
  return <span data-modo="icon-label">{label}</span>
}

export function PlainSidebarRoot({ children }: SidebarSlotProps) {
  return <nav data-modo="sidebar-nav">{children}</nav>
}

export function PlainSidebarItem({ href, active, children }: SidebarItemProps) {
  return (
    <a data-modo="sidebar-item" href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

export function PlainSidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div data-modo="sidebar-section">
      <h3 data-modo="sidebar-section-title">{title}</h3>
      <div data-modo="sidebar-section-items">{children}</div>
    </div>
  )
}

/**
 * The site view's switcher without a host one: a round badge (the logo, else the name's initial) that
 * opens the menu: the pages, the current one, the panel items and the links back to the docs.
 */
export function PlainSiteSwitcher({ name, logo, pages, current, sections, links }: SiteSwitcherSlotProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const menu = rootRef.current?.querySelector('[data-modo="site-menu"]')
    const target =
      menu?.querySelector<HTMLElement>('[aria-current="page"]') ?? menu?.querySelector<HTMLElement>('a[href]')
    target?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      setOpen(false)
      badgeRef.current?.focus()
    }
    // A panel item's own overlay (a Select's list) portals outside #root: a press there keeps the menu open.
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (document.getElementById('root')?.contains(target) && !rootRef.current?.contains(target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div ref={rootRef} data-modo="site-switcher" data-open={open || undefined}>
      <button
        ref={badgeRef}
        type="button"
        data-modo="site-badge"
        aria-label={current ? `Pages: ${current}` : 'Pages'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(o => !o)}
      >
        {logo ?? <span aria-hidden>{name.slice(0, 1)}</span>}
      </button>
      {open ? (
        <div id={menuId} role="dialog" aria-label={`${name} pages`} data-modo="site-menu">
          <div data-modo="site-menu-head">
            <span data-modo="site-menu-title">{name}</span>
            <span data-modo="site-menu-current">{current ?? 'No page'}</span>
          </div>
          <nav aria-label="Pages">
            <ul data-modo="site-menu-pages">
              {pages.map(page => (
                <li key={page.id}>
                  <a data-modo="site-menu-page" href={page.href} aria-current={page.current ? 'page' : undefined}>
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {sections.map((section, i) => (
            <section key={`${i}-${section.label}`} data-modo="site-menu-section">
              <h2 data-modo="site-menu-label">{section.label}</h2>
              {section.content}
            </section>
          ))}
          <div data-modo="site-menu-foot">
            {links.map(link => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
