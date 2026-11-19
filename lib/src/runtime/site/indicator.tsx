import { config, logoUrl } from 'virtual:modo-config'
import type { ItemEntry } from 'virtual:modo-items'
import { Logo, panelItems, shell } from 'virtual:modo-shell'
import { type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { CANVAS_PAGE, sitePath } from '../../lib/paths'
import { withBase } from '../location'
import { OVERVIEW_PATH, SITE_PAGES } from './routes'

const CORNERS = ['bottom-left', 'bottom-right', 'top-left', 'top-right'] as const
type Corner = (typeof CORNERS)[number]
const CORNER_KEY = 'modo-site-corner'
// A press that moves less than this is a click, not a drag.
const DRAG_SLOP = 6

function storedCorner(): Corner {
  try {
    return CORNERS.find(c => c === localStorage.getItem(CORNER_KEY)) ?? 'bottom-left'
  } catch {
    return 'bottom-left'
  }
}

function cornerAt(x: number, y: number): Corner {
  return `${y < window.innerHeight / 2 ? 'top' : 'bottom'}-${x < window.innerWidth / 2 ? 'left' : 'right'}`
}

/**
 * The site view's dev badge: a small round button in a corner (drag it to another one) that opens
 * the menu: the pages to switch between, the current one, the panel items and the way back to the docs.
 */
export function SiteIndicator({ current }: { current?: ItemEntry }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const { corner, offset, dragged, handlers } = useCornerDrag()

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
    const onDown = (e: globalThis.PointerEvent) => {
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
    <div
      ref={rootRef}
      data-modo="site-indicator"
      data-corner={corner}
      data-open={open || undefined}
      data-dragging={offset ? '' : undefined}
      style={offset ? { translate: `${offset.x}px ${offset.y}px` } : undefined}
    >
      <button
        ref={badgeRef}
        type="button"
        data-modo="site-badge"
        aria-label={current ? `Pages: ${current.name}` : 'Pages'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Pages (drag to move)"
        {...handlers}
        onClick={() => {
          if (!dragged()) setOpen(o => !o)
        }}
      >
        {Logo ? <Logo /> : logoUrl ? <img src={logoUrl} alt="" /> : <span aria-hidden>{config.name.slice(0, 1)}</span>}
      </button>
      {open ? <SiteMenu id={menuId} current={current} /> : null}
    </div>
  )
}

function SiteMenu({ id, current }: { id: string; current?: ItemEntry }) {
  const { Link } = shell
  return (
    <div id={id} role="dialog" aria-label={`${config.name} pages`} data-modo="site-menu">
      <div data-modo="site-menu-head">
        <span data-modo="site-menu-title">{config.name}</span>
        <span data-modo="site-menu-current">{current?.name ?? 'No page'}</span>
      </div>
      <nav aria-label="Pages">
        <ul data-modo="site-menu-pages">
          {SITE_PAGES.map(page => (
            <li key={page.id}>
              <a
                data-modo="site-menu-page"
                href={withBase(sitePath(page.id))}
                aria-current={page === current ? 'page' : undefined}
              >
                {page.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {panelItems.map((item, i) => (
        <section key={`${i}-${item.label}`} data-modo="site-menu-section">
          <h2 data-modo="site-menu-label">{item.label}</h2>
          <item.Component shell={shell} />
        </section>
      ))}
      <div data-modo="site-menu-foot">
        <Link href={withBase(OVERVIEW_PATH)}>Docs</Link>
        <Link href={withBase(CANVAS_PAGE.path)}>{CANVAS_PAGE.title}</Link>
      </div>
    </div>
  )
}

/** Drags the badge; on release it snaps to the viewport corner nearest the pointer, remembered across visits. */
function useCornerDrag() {
  const [corner, setCorner] = useState(storedCorner)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      if (e.button !== 0) return
      start.current = { x: e.clientX, y: e.clientY }
      moved.current = false
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove(e: PointerEvent<HTMLButtonElement>) {
      if (!start.current) return
      const x = e.clientX - start.current.x
      const y = e.clientY - start.current.y
      if (!moved.current && Math.hypot(x, y) < DRAG_SLOP) return
      moved.current = true
      setOffset({ x, y })
    },
    onPointerUp(e: PointerEvent<HTMLButtonElement>) {
      if (!start.current) return
      start.current = null
      setOffset(null)
      if (!moved.current) return
      const next = cornerAt(e.clientX, e.clientY)
      setCorner(next)
      try {
        localStorage.setItem(CORNER_KEY, next)
      } catch {}
    },
    onPointerCancel() {
      start.current = null
      setOffset(null)
    },
  }

  /** Whether the press that ends in this click was a drag; it then opens nothing. */
  const dragged = () => {
    const was = moved.current
    moved.current = false
    return was
  }

  return { corner, offset, dragged, handlers }
}
