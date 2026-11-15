/*!
 * Local addition (not part of Fluid Functionalism): a full-window image
 * viewer over the scrim. The image grows out of the thumbnail that opened it
 * through the shared morph (`lib/use-morph.ts` + `MorphSurface`, a plain
 * morph from the trigger) and, scaled to cover the growing shape, closes back
 * into whichever thumbnail is current. Base UI's Dialog keeps focus, Escape
 * and scroll lock.
 */

'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { motion, useMotionValueEvent } from 'motion/react'
import {
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useIcon } from '../../../lib/icon-context'
import { MorphSurface } from '../../../lib/morph-layers'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { spring } from '../../../lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { holdExit, type MorphOrigin, useMorph, useMorphOrigin } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import Button from '../../button'

/** One image: its source, its description, and optionally a smaller thumbnail and a caption. */
interface LightboxImage {
  src: string
  alt: string
  thumbnail?: string
  caption?: string
}

interface LightboxState {
  items: LightboxImage[]
  current: number | null
  open: (index: number, trigger: HTMLElement, event: Event) => void
  register: (index: number, el: HTMLElement | null) => void
}

const LightboxContext = createContext<LightboxState | null>(null)

const LEVEL_OFFSET = 4
const SWIPE = 48
const ZOOM = 2
const { exit: _exit, ...MOVE } = spring.moderate
const STILL = { duration: 0 }

interface LightboxTriggerProps {
  /** Which item it opens, counted from 0. */
  index: number
  /** What the thumbnail shows. Defaults to the item's `thumbnail` (or `src`), cropped to fill. */
  children?: ReactNode
  /** Accessible name. Defaults to "View" followed by the item's `alt`. */
  label?: string
  /** Classes for the button: its size, and its radius, which the opening image starts from. */
  className?: string
}

/** A thumbnail that opens the lightbox at its item. */
function LightboxTrigger({ index, children, label, className }: LightboxTriggerProps) {
  const lightbox = useContext(LightboxContext)
  const shape = useShape()
  if (!lightbox) throw new Error('Lightbox.Trigger must sit inside a Lightbox.')
  const item = lightbox.items[index]

  return (
    <button
      ref={el => lightbox.register(index, el)}
      type="button"
      aria-label={label ?? `View ${item?.alt ?? `image ${index + 1}`}`}
      aria-haspopup="dialog"
      onClick={e => lightbox.open(index, e.currentTarget, e.nativeEvent)}
      className={cn(
        'relative block size-16 shrink-0 cursor-zoom-in overflow-hidden bg-muted outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
        shape.item,
        className,
      )}
    >
      {children ??
        (item && <img src={item.thumbnail ?? item.src} alt="" draggable={false} className="size-full object-cover" />)}
    </button>
  )
}

interface ViewerProps {
  items: LightboxImage[]
  current: number | null
  origin: { current: MorphOrigin }
  zoom: boolean
  onIndexChange: (index: number | null) => void
  onExited: () => void
}

function Viewer({ items, current, origin, zoom, onIndexChange, onExited }: ViewerProps) {
  const open = current !== null
  const outer = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const hold = useRef<Animation | null>(null)
  const swipe = useRef<{ x: number; moved: boolean } | null>(null)
  const [shown, setShown] = useState(current ?? 0)
  const [zoomed, setZoomed] = useState<{ x: number; y: number } | null>(null)
  const [stepped, setStepped] = useState(false)
  const reduced = useReduceMotion()
  const shape = useShape()
  const level = Math.min(useSurface() + LEVEL_OFFSET, 8)
  const X = useIcon('x')
  const ArrowLeft = useIcon('arrow-left')
  const ArrowRight = useIcon('arrow-right')

  const morph = useMorph(open, origin, { effect: 'morph', hideSource: true }, () => {
    hold.current?.finish()
    onExited()
  })

  // The image fades in only when stepping, not when it grows out of its thumbnail.
  const [seen, setSeen] = useState(current)
  if (current !== seen) {
    setSeen(current)
    setZoomed(null)
    if (current !== null) {
      setShown(current)
      setStepped(seen !== null)
    }
  }
  const item = items[shown]

  // Base UI waits on the popup's own animations; the morph runs on the image box inside it.
  useLayoutEffect(() => {
    if (open || !outer.current) return
    hold.current = holdExit(outer.current, 'slow')
    return () => hold.current?.cancel()
  }, [open])

  // The image covers the growing shape, scaled from the thumbnail rather than revealed by the clip alone.
  useMotionValueEvent(morph.progress, 'change', p => {
    const el = frame.current
    const box = morph.popup?.getBoundingClientRect()
    const thumb = origin.current.trigger?.getBoundingClientRect()
    if (!el) return
    if (p >= 1 || morph.effect === 'fade' || !box || !thumb?.width) {
      el.style.transform = ''
      return
    }
    const w = thumb.width + (box.width - thumb.width) * p
    const h = thumb.height + (box.height - thumb.height) * p
    const x = (thumb.left - box.left) * (1 - p) + w / 2 - box.width / 2
    const y = (thumb.top - box.top) * (1 - p) + h / 2 - box.height / 2
    el.style.transform = `translate(${x}px, ${y}px) scale(${Math.max(w / box.width, h / box.height)})`
  })

  const step = (by: number) => {
    if (current === null || items.length < 2) return
    onIndexChange((current + by + items.length) % items.length)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'ArrowRight') step(1)
    else return
    e.preventDefault()
  }

  const onPointerDown = (e: PointerEvent) => {
    if (zoomed || e.button !== 0) return
    swipe.current = { x: e.clientX, moved: false }
  }
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current
    if (!start) return
    const dx = e.clientX - start.x
    start.moved = Math.abs(dx) > 6
    if (Math.abs(dx) > SWIPE) step(dx < 0 ? 1 : -1)
  }
  const onImageClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!zoom || swipe.current?.moved) return
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomed(
      zoomed
        ? null
        : { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 },
    )
  }
  const onImageMove = (e: MouseEvent<HTMLImageElement>) => {
    if (!zoomed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomed({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
  }

  const chrome = { style: { opacity: morph.progress } }
  const many = items.length > 1

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        render={<motion.div style={{ opacity: morph.progress }} />}
        className="fixed inset-0 z-50 bg-scrim"
      />
      <DialogPrimitive.Popup
        ref={outer}
        aria-label={item?.alt}
        finalFocus={() => origin.current.trigger ?? true}
        onKeyDown={onKeyDown}
        onClick={e => e.target === e.currentTarget && onIndexChange(null)}
        className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-6,24px)] outline-none"
      >
        <SurfaceProvider value={level}>
          <div ref={morph.popupRef} className="relative">
            <MorphSurface
              morph={morph}
              bg={SURFACE_BG[level]}
              shadow={SURFACE_SHADOW[level]}
              radius={shape.container}
              className={cn('overflow-hidden', shape.container)}
            >
              <div ref={frame} className="origin-center">
                {item && (
                  <motion.img
                    key={shown}
                    src={item.src}
                    alt={item.alt}
                    draggable={false}
                    initial={stepped ? { opacity: 0 } : false}
                    animate={{ opacity: 1, scale: zoomed ? ZOOM : 1 }}
                    transition={reduced ? STILL : MOVE}
                    style={{ transformOrigin: zoomed ? `${zoomed.x}% ${zoomed.y}%` : undefined }}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onClick={onImageClick}
                    onMouseMove={onImageMove}
                    className={cn(
                      'block max-h-[calc(100dvh-10rem)] max-w-[calc(100vw-10rem)] touch-pan-y select-none object-contain',
                      zoom && (zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'),
                    )}
                  />
                )}
              </div>
            </MorphSurface>
          </div>

          <motion.div {...chrome} className="absolute top-[var(--space-4,16px)] right-[var(--space-4,16px)]">
            <DialogPrimitive.Close
              render={
                <Button variant="secondary" size="icon" aria-label="Close">
                  <X />
                </Button>
              }
            />
          </motion.div>

          {many && (
            <>
              <motion.div {...chrome} className="absolute top-1/2 left-[var(--space-4,16px)] -translate-y-1/2">
                <Button variant="secondary" size="icon" aria-label="Previous image" onClick={() => step(-1)}>
                  <ArrowLeft />
                </Button>
              </motion.div>
              <motion.div {...chrome} className="absolute top-1/2 right-[var(--space-4,16px)] -translate-y-1/2">
                <Button variant="secondary" size="icon" aria-label="Next image" onClick={() => step(1)}>
                  <ArrowRight />
                </Button>
              </motion.div>
            </>
          )}

          {(many || item?.caption) && (
            <motion.div
              {...chrome}
              aria-live="polite"
              className={cn(
                'absolute bottom-[var(--space-4,16px)] left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 px-3 py-1.5 text-caption',
                SURFACE_BG[level],
                SURFACE_SHADOW[3],
                shape.button,
              )}
            >
              {many && (
                <span className="shrink-0 tabular-nums text-muted-foreground">{`${shown + 1} / ${items.length}`}</span>
              )}
              {item?.caption && <span className="truncate text-foreground">{item.caption}</span>}
            </motion.div>
          )}
        </SurfaceProvider>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

interface LightboxProps {
  /** The images, in viewing order: `{ src, alt, thumbnail?, caption? }`. */
  items: LightboxImage[]
  /** Controlled open item, counted from 0, or `null` while closed. Pair with `onIndexChange`. */
  index?: number | null
  /** Item open at first, for an uncontrolled lightbox. Defaults to `null`. */
  defaultIndex?: number | null
  /** Called with the item shown, or `null` when the lightbox closes. */
  onIndexChange?: (index: number | null) => void
  /** Click the image to zoom in at that point, move to pan, click again to zoom out. Defaults to `true`. */
  zoom?: boolean
  /** The thumbnails (`Lightbox.Trigger`) and whatever lays them out. */
  children?: ReactNode
}

/**
 * Images viewed full-window, grown out of the thumbnail you pressed.
 *
 * Press a thumbnail and its image grows out of it over the scrim, scaled from
 * the thumbnail's box to the window's, while the thumbnail steps aside (see
 * Morph). The arrow keys, the side buttons or a swipe step through the items;
 * Escape, the close button or a click on the scrim closes it, and the image
 * shrinks back into the thumbnail of whichever item is showing. A click on
 * the image zooms in at that point and follows the pointer; another zooms
 * out. Built on Base UI's Dialog, so focus stays inside and returns to the
 * thumbnail. Works controlled (`index` + `onIndexChange`, `null` closed) or
 * uncontrolled.
 *
 * Statics:
 * - `Lightbox.Trigger` — one thumbnail: `index`, `children` to draw your
 *   own, `label`, `className` (its size and radius).
 *
 * @example {@include ./examples.mdx}
 */
function Lightbox({ items, index, defaultIndex = null, onIndexChange, zoom = true, children }: LightboxProps) {
  const [current, setCurrent] = useControllableState<number | null>(index, defaultIndex, onIndexChange)
  const { origin, capture } = useMorphOrigin()
  const triggers = useRef(new Map<number, HTMLElement>())
  // A thumbnail this hid when stepping to its item, shown again once the close lands.
  const swapped = useRef<HTMLElement | null>(null)

  // Stepping to another item makes its thumbnail the one to close into.
  useLayoutEffect(() => {
    if (current === null) return
    const el = triggers.current.get(current)
    const previous = origin.current.trigger
    if (!el || el === previous) return
    if (previous) previous.style.opacity = ''
    el.style.opacity = '0'
    swapped.current = el
    origin.current.trigger = el
  }, [current, origin])

  const ctx = useMemo<LightboxState>(
    () => ({
      items,
      current,
      open: (at, trigger, event) => {
        capture({ trigger, event })
        setCurrent(at)
      },
      register: (at, el) => {
        if (el) triggers.current.set(at, el)
        else triggers.current.delete(at)
      },
    }),
    [items, current, capture, setCurrent],
  )

  return (
    <LightboxContext.Provider value={ctx}>
      <DialogPrimitive.Root open={current !== null} onOpenChange={next => next || setCurrent(null)}>
        {children}
        <Viewer
          items={items}
          current={current}
          origin={origin}
          zoom={zoom}
          onIndexChange={setCurrent}
          onExited={() => {
            if (swapped.current) swapped.current.style.opacity = ''
            swapped.current = null
          }}
        />
      </DialogPrimitive.Root>
    </LightboxContext.Provider>
  )
}

Lightbox.Trigger = LightboxTrigger

export type { LightboxImage, LightboxProps, LightboxTriggerProps }
export { Lightbox, LightboxTrigger }

export default Lightbox
