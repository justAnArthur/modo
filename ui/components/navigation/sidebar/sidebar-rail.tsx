/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef, type HTMLAttributes, type PointerEvent, useEffect, useRef, useState } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { useSizeVariant } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { Button, type ButtonProps } from '../../actions/button'
import { Tooltip } from '../../overlays/tooltip'
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, useSidebar } from './sidebar-context'
import { ShortcutKbd, useShortcutKey } from './sidebar-shortcut'

/** Dragging this far past the minimum width collapses the sidebar instead of bottoming out (px). */
const COLLAPSE_SLOP = 56

export type SidebarTriggerProps = ButtonProps

/** Ghost icon button calling `toggleSidebar()`. Its glyph mirrors the side and its tooltip shows the toggle key. With `openOnHover` it switches between open and on hover (a dashed glyph). */
const SidebarTrigger = forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ onClick, size, children, ...props }, ref) => {
    const { toggleSidebar, open, openMobile, isMobile, side, openOnHover, registerTrigger } = useSidebar()
    const shortcutKey = useShortcutKey()
    const hoverMode = openOnHover && !isMobile
    const TriggerIcon = useIcon(`panel-${side}${hoverMode && !open ? '-dashed' : ''}`)
    const iconSize = useSizeVariant() === 'compact' ? 'icon-compact' : 'icon'
    const collapsed = isMobile ? !openMobile : !open
    const label = hoverMode
      ? open
        ? 'Show sidebar on hover'
        : 'Keep sidebar open'
      : collapsed
        ? 'Expand sidebar'
        : 'Collapse sidebar'
    const node = useRef<HTMLButtonElement | null>(null)
    useEffect(() => (node.current ? registerTrigger(node.current) : undefined), [registerTrigger])

    return (
      <Tooltip
        side="bottom"
        content={
          <span className="flex items-center gap-1.5">
            {/* A flex row escapes the surface's text-box trim, so the label re-applies it. */}
            <span className="text-trim">{label}</span>
            <ShortcutKbd>{shortcutKey}</ShortcutKbd>
          </span>
        }
      >
        <Button
          ref={mergeRefs(node, ref)}
          variant="ghost"
          size={size ?? iconSize}
          data-sidebar="trigger"
          aria-label={hoverMode ? label : 'Toggle Sidebar'}
          onClick={event => {
            onClick?.(event)
            toggleSidebar()
          }}
          {...props}
        >
          {children ?? <TriggerIcon />}
        </Button>
      </Tooltip>
    )
  },
)
SidebarTrigger.displayName = 'SidebarTrigger'

export interface SidebarRailProps extends HTMLAttributes<HTMLButtonElement> {
  /** Pin the tooltip open or closed; `undefined` leaves it on hover. */
  tooltipOpen?: boolean
}

interface Drag {
  startX: number
  startWidth: number
  moved: boolean
  collapsed: boolean
  /** Kept open at the press; open on hover, the rail collapses and drags the hover, never keeping it open. */
  kept: boolean
}

/** The grab strip on the inner edge: drag it to resize (clamped), throw it at the edge or click it to collapse. */
const SidebarRail = forwardRef<HTMLButtonElement, SidebarRailProps>(({ className, tooltipOpen, ...props }, ref) => {
  const { toggleSidebar, open, setOpen, setHoverOpen, setWidth, side, setIsResizing } = useSidebar()
  const shortcutKey = useShortcutKey()
  const railRef = useRef<HTMLButtonElement | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const panel = railRef.current?.closest<HTMLElement>('[data-slot="sidebar"]')
    if (!panel) return
    dragRef.current = {
      startX: event.clientX,
      startWidth: panel.offsetWidth,
      moved: false,
      collapsed: false,
      kept: open,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    if (!drag.moved && Math.abs(dx) < 4) return
    if (!drag.moved) {
      drag.moved = true
      setDragging(true)
      setIsResizing(true)
    }
    const raw = drag.startWidth + (side === 'left' ? dx : -dx)
    // Past the slop: preview the collapse but keep the drag alive, so pulling
    // back re-expands and an overshoot commits only on release.
    if (raw < SIDEBAR_MIN_WIDTH - COLLAPSE_SLOP) {
      if (!drag.collapsed) {
        drag.collapsed = true
        setWidth(`${SIDEBAR_MIN_WIDTH}px`)
        ;(drag.kept ? setOpen : setHoverOpen)(false)
      }
      return
    }
    if (drag.collapsed) {
      drag.collapsed = false
      ;(drag.kept ? setOpen : setHoverOpen)(true)
    }
    setWidth(`${Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, raw))}px`)
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    setIsResizing(false)
    // A press that never turned into a drag is the collapse click.
    if (drag && !drag.moved) {
      if (drag.kept) toggleSidebar()
      else setHoverOpen(false)
    }
  }

  // A cancelled pointer ends the drag where it stands: no collapse click.
  const onPointerCancel = () => {
    dragRef.current = null
    setDragging(false)
    setIsResizing(false)
  }

  return (
    <Tooltip
      side={side === 'left' ? 'right' : 'left'}
      sideOffset={8}
      followCursor="y"
      open={dragging ? false : tooltipOpen}
      content={
        // The column escapes the surface's trim: both lines re-apply it, so the gap alone sets the rhythm.
        <span className="flex flex-col items-start gap-2">
          <span className="text-trim">
            <span className="weight-semibold">Drag</span> to resize
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-trim">
              <span className="weight-semibold">Click</span> to collapse
            </span>
            <ShortcutKbd>{shortcutKey}</ShortcutKbd>
          </span>
        </span>
      }
    >
      <button
        ref={mergeRefs(railRef, ref)}
        type="button"
        data-sidebar="rail"
        aria-label="Resize or collapse sidebar"
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className={cn(
          // touch-none: else the browser claims a touch drag for scrolling and cancels the resize.
          'absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none',
          // From context, not group-data selectors, so variant offsets in className win the merge.
          side === 'left' ? 'right-0' : 'left-0',
          'after:absolute after:inset-y-0 after:w-px after:bg-transparent hover:after:bg-foreground/25 after:transition-colors after:duration-fast',
          tooltipOpen && 'after:bg-foreground/25',
          side === 'left' ? 'after:right-0' : 'after:left-0',
          className,
        )}
        {...props}
      />
    </Tooltip>
  )
})
SidebarRail.displayName = 'SidebarRail'

export { SidebarRail, SidebarTrigger }
