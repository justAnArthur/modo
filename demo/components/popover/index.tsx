import './popover.css'
import { Elevated } from 'modo-atomic-ui'
import { SPRING, useTween } from '../../hooks/useTween'
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'

type Side = 'top' | 'bottom'
type Align = 'start' | 'center' | 'end'
type TriggerMode = 'click' | 'hover'

const HOVER_CLOSE_DELAY = 120
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface Rect { x: number; y: number; w: number; h: number; r: number }
interface Geo {
  layerW: number
  layerH: number
  left: number
  top: number
  trigger: Rect
  panel: Rect
}

// trigger rect and panel rect in a shared local coordinate box.
function buildGeo(
  tW: number,
  tH: number,
  cW: number,
  cH: number,
  side: Side,
  align: Align,
  gap: number,
  panelRadius: number,
): Geo {
  const py = side === 'bottom' ? tH + gap : -(gap + cH)
  const px =
    align === 'start' ? 0 : align === 'end' ? tW - cW : (tW - cW) / 2

  const left = Math.min(0, px)
  const top = Math.min(0, py)
  const layerW = Math.max(tW, px + cW) - left
  const layerH = Math.max(tH, py + cH) - top

  const triggerRadius = Math.min(tH / 2, panelRadius)

  return {
    layerW,
    layerH,
    left,
    top,
    trigger: { x: -left, y: -top, w: tW, h: tH, r: triggerRadius },
    panel: { x: px - left, y: py - top, w: cW, h: cH, r: panelRadius },
  }
}

function insetFor(rect: Rect, layerW: number, layerH: number): string {
  const top = rect.y
  const right = layerW - (rect.x + rect.w)
  const bottom = layerH - (rect.y + rect.h)
  const left = rect.x
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${rect.r}px)`
}

function insetForProgress(geo: Geo, p: number): string {
  const t = geo.trigger
  const pn = geo.panel
  const rect: Rect = {
    x: lerp(t.x, pn.x, p),
    y: lerp(t.y, pn.y, p),
    w: lerp(t.w, pn.w, p),
    h: lerp(t.h, pn.h, p),
    r: lerp(t.r, pn.r, p),
  }
  return insetFor(rect, geo.layerW, geo.layerH)
}

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  openHover: () => void
  scheduleClose: () => void
  triggerMode: TriggerMode
  side: Side
  align: Align
  gap: number
  panelRadius: number
  gooStrength: number
  gooId: string
  contentId: string
  progress: number
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref && typeof ref === 'object')
        (ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

const ALIGN_ORIGIN: Record<Align, string> = {
  start: 'left',
  center: 'center',
  end: 'right',
}

interface GooeyPopoverProps {
  trigger?: ReactNode
  content?: ReactNode
  placement?: Side
  mode?: TriggerMode
  sideOffset?: number
  panelRadius?: number
  gooStrength?: number
  /** override the default trigger button. accepts a single element. */
  triggerElement?: ReactElement
}

function GooeyPopover({
  trigger = 'Click me',
  content = 'Popover content here',
  placement = 'bottom',
  mode = 'click',
  sideOffset = 14,
  panelRadius = 16,
  gooStrength = 8,
  triggerElement,
}: GooeyPopoverProps) {
  const gooId = `popover-goo-${useId().replace(/:/g, '')}`
  const contentId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const blobClipRef = useRef<HTMLDivElement>(null)
  const contentClipRef = useRef<HTMLDivElement>(null)

  const [internalOpen, setInternalOpen] = useState(false)
  const open = internalOpen
  const progress = useTween(open ? 1 : 0, 320, SPRING)

  const [sizes, setSizes] = useState({ tW: 0, tH: 0, cW: 0, cH: 0 })

  const setOpen = useCallback((next: boolean) => setInternalOpen(next), [])
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const openHover = useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose, setOpen])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY)
  }, [cancelClose, setOpen])
  const toggle = useCallback(() => setOpen(!open), [setOpen, open])

  useEffect(() => () => cancelClose(), [cancelClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    if (mode === 'click') window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open, setOpen, mode])

  useLayoutEffect(() => {
    const triggerNode = triggerRef.current
    const contentNode = measureRef.current
    if (!contentNode) return

    const measure = () => {
      const tW = triggerNode?.offsetWidth ?? 0
      const tH = triggerNode?.offsetHeight ?? 0
      const cW = contentNode.offsetWidth
      const cH = contentNode.offsetHeight
      setSizes((prev) =>
        prev.tW === tW && prev.tH === tH && prev.cW === cW && prev.cH === cH
          ? prev
          : { tW, tH, cW, cH },
      )
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(contentNode)
    if (triggerNode) observer.observe(triggerNode)
    return () => observer.disconnect()
  }, [])

  const geo = useMemo(
    () =>
      buildGeo(
        sizes.tW,
        sizes.tH,
        sizes.cW,
        sizes.cH,
        placement,
        'center',
        sideOffset,
        panelRadius,
      ),
    [sizes, placement, sideOffset, panelRadius],
  )

  useLayoutEffect(() => {
    if (geo.layerW === 0) return
    const clip = insetForProgress(geo, progress)
    if (blobClipRef.current) blobClipRef.current.style.clipPath = clip
    if (contentClipRef.current) contentClipRef.current.style.clipPath = clip
  }, [geo, progress])

  // default trigger — a styled button.
  const defaultTrigger = (
    <button
      type="button"
      data-aui="popover-trigger"
      style={{
        background: 'var(--accent)',
        color: 'var(--accent-foreground)',
        border: 'none',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '6px 12px',
        font: 'inherit',
        cursor: 'pointer',
      }}
    >
      {trigger}
    </button>
  )

  // attach ref + handlers to whichever trigger element the user provides.
  const triggerWithRef = useMemo(() => {
    const child = triggerElement ?? defaultTrigger
    if (!isValidElement(child)) return child
    const childEl = child as ReactElement<Record<string, unknown>>
    const childProps = childEl.props
    const childRef = (childProps as { ref?: Ref<HTMLElement> }).ref
    const compose =
      (name: string, handler: () => void) =>
      (event: { defaultPrevented?: boolean }) => {
        ;(childProps[name] as ((e: unknown) => void) | undefined)?.(event)
        if (!event.defaultPrevented) handler()
      }
    const handlers: Record<string, unknown> =
      mode === 'hover'
        ? {
            onFocus: compose('onFocus', openHover),
            onBlur: compose('onBlur', scheduleClose),
          }
        : { onClick: compose('onClick', toggle) }
    return cloneElement(childEl, {
      ...handlers,
      ref: mergeRefs(childRef, (node: HTMLElement | null) => {
        triggerRef.current = node
      }),
      style: { position: 'relative', zIndex: 0, ...(childProps.style as CSSProperties) },
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      'aria-controls': open ? contentId : undefined,
      'data-state': open ? 'open' : 'closed',
    })
  }, [triggerElement, defaultTrigger, mode, openHover, scheduleClose, toggle, open, contentId])

  const hoverHandlers =
    mode === 'hover'
      ? { onMouseEnter: openHover, onMouseLeave: scheduleClose }
      : {}

  return (
    <div
      ref={rootRef}
      data-aui="popover"
      style={{ position: 'relative', display: 'inline-flex', isolation: 'isolate' }}
      {...hoverHandlers}
    >
      {triggerWithRef}

        <svg
          aria-hidden
          width="0"
          height="0"
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          <title>Popover goo filter</title>
          <defs>
            <filter id={gooId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={gooStrength}
                result="blur"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        <div
          aria-hidden
          data-aui="popover-goobody"
          style={{
            position: 'absolute',
            left: geo.left,
            top: geo.top,
            width: geo.layerW,
            height: geo.layerH,
            filter: `url(#${gooId})`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <div
            data-aui="popover-trigger-shape"
            style={{
              position: 'absolute',
              left: geo.trigger.x,
              top: geo.trigger.y,
              width: geo.trigger.w,
              height: geo.trigger.h,
              borderRadius: geo.trigger.r,
              background: 'var(--surface-3)',
            }}
          />
          <div
            ref={blobClipRef}
            data-aui="popover-blob"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--surface-3)',
            }}
          />
        </div>

        <div
          data-aui="popover-panel-host"
          style={{
            position: 'absolute',
            left: geo.left,
            top: geo.top,
            width: geo.layerW,
            height: geo.layerH,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            ref={contentClipRef}
            data-aui="popover-panel-clip"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: open ? 'auto' : 'none',
            }}
          >
            <div
              ref={measureRef}
              id={contentId}
              role="dialog"
              data-aui="popover-panel"
              style={{
                position: 'absolute',
                left: geo.panel.x,
                top: geo.panel.y,
                transformOrigin: `${ALIGN_ORIGIN.center} ${placement === 'bottom' ? 'top' : 'bottom'}`,
              }}
            >
              <Elevated offset={2} className="popover-panel-body">
                {content}
              </Elevated>
            </div>
          </div>
        </div>
      </div>
  )
}

/**
 * Gooey popover: the panel oozes out of the trigger through an SVG goo filter —
 * a liquid neck that stretches and pinches — with crisp content fading in on
 * top. Wrapped in `<Elevated offset={2}>` so the panel sits one notch above
 * its substrate.
 *
 * @example
 * # Default
 *
 * Click the trigger to see the panel ooze out of it.
 *
 * ```tsx
 * <Popover trigger="Click me" content="Popover content here" />
 * ```
 *
 * @example
 * # Top placement
 *
 * Panel oozes upward when the trigger is near the bottom of the page.
 *
 * ```tsx
 * <Popover trigger="Open above" content="Floating above the trigger" placement="top" />
 * ```
 *
 * @example
 * # Hover trigger
 *
 * Open on mouseenter, close on mouseleave (with a 120ms grace period).
 *
 * ```tsx
 * <Popover trigger="Hover me" content="Appears on hover" mode="hover" />
 * ```
 */
export default function Popover(props: GooeyPopoverProps) {
  return <GooeyPopover {...props} />
}
