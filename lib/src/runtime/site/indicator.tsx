import { config, logoUrl } from 'virtual:modo-config'
import type { ItemEntry } from 'virtual:modo-items'
import { Logo, panelItems, shell } from 'virtual:modo-shell'
import { type MouseEvent, type PointerEvent, useRef, useState } from 'react'
import type { SiteCorner } from '../../lib/contract'
import { CANVAS_PAGE, sitePath } from '../../lib/paths'
import { withBase } from '../location'
import { OVERVIEW_PATH, SITE_PAGES } from './routes'

const CORNERS = ['bottom-left', 'bottom-right', 'top-left', 'top-right'] as const satisfies SiteCorner[]
const CORNER_KEY = 'modo-site-corner'
// A press that moves less than this is a click, not a drag.
const DRAG_SLOP = 6

function storedCorner(): SiteCorner {
  try {
    return CORNERS.find(c => c === localStorage.getItem(CORNER_KEY)) ?? 'bottom-left'
  } catch {
    return 'bottom-left'
  }
}

function cornerAt(x: number, y: number): SiteCorner {
  return `${y < window.innerHeight / 2 ? 'top' : 'bottom'}-${x < window.innerWidth / 2 ? 'left' : 'right'}`
}

const logo = Logo ? <Logo /> : logoUrl ? <img src={logoUrl} alt="" /> : undefined

const sections = panelItems.map(item => ({ label: item.label, content: <item.Component shell={shell} /> }))

const links = [
  { label: 'Docs', href: withBase(OVERVIEW_PATH) },
  { label: CANVAS_PAGE.title, href: withBase(CANVAS_PAGE.path) },
]

/**
 * The site view's switcher (`shell.SiteSwitcher`) in a fixed box in a corner of the viewport. Dragging
 * the box moves it to another corner; the slot only draws the trigger and the menu it opens.
 */
export function SiteIndicator({ current }: { current?: ItemEntry }) {
  const { corner, offset, handlers } = useCornerDrag()
  const pages = SITE_PAGES.map(page => ({
    id: page.id,
    title: page.name,
    href: withBase(sitePath(page.id)),
    current: page === current,
  }))
  return (
    <div
      data-modo="site-indicator"
      data-corner={corner}
      data-dragging={offset ? '' : undefined}
      style={offset ? { translate: `${offset.x}px ${offset.y}px` } : undefined}
      {...handlers}
    >
      <shell.SiteSwitcher
        name={config.name}
        logo={logo}
        pages={pages}
        current={current?.name}
        sections={sections}
        links={links}
        corner={corner}
      />
    </div>
  )
}

/**
 * Drags the box from any press on the trigger; on release it snaps to the viewport corner nearest the
 * pointer, remembered across visits. The click that ends a drag is swallowed before the slot sees it.
 */
function useCornerDrag() {
  const [corner, setCorner] = useState(storedCorner)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  // The pointer soon leaves the box, so the drag follows it on the window.
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // React bubbles events from the slot's portalled menu here too: only a press on the box itself drags.
    if (e.button !== 0 || !e.currentTarget.contains(e.target as Node)) return
    const start = { x: e.clientX, y: e.clientY }
    dragged.current = false

    const move = (ev: globalThis.PointerEvent) => {
      const x = ev.clientX - start.x
      const y = ev.clientY - start.y
      if (!dragged.current && Math.hypot(x, y) < DRAG_SLOP) return
      dragged.current = true
      setOffset({ x, y })
    }
    const end = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setOffset(null)
      if (!dragged.current) return
      // The click (if any) follows this pointerup at once; a later one, a key press on the trigger, is no drag.
      setTimeout(() => {
        dragged.current = false
      })
      if (ev.type === 'pointercancel') return
      const next = cornerAt(ev.clientX, ev.clientY)
      setCorner(next)
      try {
        localStorage.setItem(CORNER_KEY, next)
      } catch {}
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (!dragged.current) return
    e.preventDefault()
    e.stopPropagation()
  }

  return { corner, offset, handlers: { onPointerDown, onClickCapture } }
}
