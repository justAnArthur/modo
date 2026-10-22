import { shell } from 'virtual:modo-shell'
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

const MIN_SCALE = 0.05
const MAX_SCALE = 4
/** Below this a frame that hasn't mounted stays empty: too small to use, and
    zoomed out far enough that every frame would mount at once. */
const LIVE_SCALE = 0.25
/** Frames mounted per animation frame, so arriving somewhere never stalls a gesture. */
const MOUNTS_PER_FRAME = 3
const STEP = 1.25

interface View {
  x: number
  y: number
  k: number
}

// Module-level, so the view survives a trip to an item page and back.
let saved: View = { x: 0, y: 0, k: 1 }

type Camera = ReturnType<typeof createCamera>

const CameraContext = createContext<Camera | null>(null)

function clamp(k: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, k))
}

/** The pan/zoom state, written straight to the world's transform: a gesture
    never re-renders React, only the zoom label and frames going live. */
function createCamera(root: RefObject<HTMLDivElement | null>, world: RefObject<HTMLDivElement | null>) {
  const view = { ...saved }
  const listeners = new Set<() => void>()
  // Frames not yet live, and those of them now near the view.
  const waiting = new Map<Element, () => void>()
  const near = new Set<Element>()
  let observer: IntersectionObserver | undefined
  let frame = 0
  let mounting = 0
  let idle: ReturnType<typeof setTimeout> | undefined

  function paint() {
    frame = 0
    world.current!.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`
    saved = { ...view }
    for (const fn of listeners) fn()
    wake()
  }

  function wake() {
    if (!mounting && near.size > 0 && view.k >= LIVE_SCALE) mounting = requestAnimationFrame(mount)
  }

  // Reads `near` as it is now, not as it was queued: frames the view has
  // already left stay unmounted.
  function mount() {
    mounting = 0
    let n = 0
    for (const el of near) {
      if (n++ === MOUNTS_PER_FRAME) return wake()
      waiting.get(el)!()
      forget(el)
    }
  }

  function forget(el: Element) {
    waiting.delete(el)
    near.delete(el)
    observer!.unobserve(el)
  }

  function move() {
    const el = root.current!
    el.dataset.moving = ''
    clearTimeout(idle)
    // will-change only while moving: once still, the browser re-rasterizes
    // the text at the new scale instead of stretching a bitmap.
    idle = setTimeout(() => delete el.dataset.moving, 150)
    if (!frame) frame = requestAnimationFrame(paint)
  }

  function zoomAt(px: number, py: number, k: number) {
    const next = clamp(k)
    view.x = px - ((px - view.x) * next) / view.k
    view.y = py - ((py - view.y) * next) / view.k
    view.k = next
    move()
  }

  function zoomCentered(k: number) {
    const el = root.current!
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, k)
  }

  return {
    view,
    paint,
    zoomAt,
    zoomBy: (f: number) => zoomCentered(view.k * f),
    zoomTo: zoomCentered,
    panBy(dx: number, dy: number) {
      view.x += dx
      view.y += dy
      move()
    },
    fit() {
      const r = root.current!
      const w = world.current!
      view.k = clamp(Math.min(r.clientWidth / w.offsetWidth, r.clientHeight / w.offsetHeight))
      view.x = (r.clientWidth - w.offsetWidth * view.k) / 2
      view.y = Math.max(0, (r.clientHeight - w.offsetHeight * view.k) / 2)
      move()
    },
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    /** Calls `onLive` once, when `el` is within half a viewport of the view
        and the view is zoomed in enough to use it. */
    observe(el: Element, onLive: () => void) {
      // Created on first use: child effects run before the viewport's own.
      observer ??= new IntersectionObserver(
        entries => {
          for (const e of entries) {
            if (e.isIntersecting) near.add(e.target)
            else near.delete(e.target)
          }
          wake()
        },
        { root: root.current, rootMargin: '50%' },
      )
      waiting.set(el, onLive)
      observer.observe(el)
      return () => forget(el)
    },
  }
}

/** Whether `ref` has come near the view while it was zoomed in enough to use.
    Stays true after: a mounted frame keeps its state wherever the view goes. */
export function useLive(ref: RefObject<Element | null>): boolean {
  const camera = useContext(CameraContext)!
  const [live, setLive] = useState(false)
  useEffect(() => camera.observe(ref.current!, () => setLive(true)), [camera, ref])
  return live
}

/** Whether a wheel over `target` belongs to something inside it that can still scroll that way. */
function scrollsInside(target: Element | null, root: Element, dx: number, dy: number): boolean {
  for (let el = target; el && el !== root; el = el.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(el)
    if (
      dy &&
      /auto|scroll/.test(overflowY) &&
      (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight)
    )
      return true
    if (
      dx &&
      /auto|scroll/.test(overflowX) &&
      (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth)
    )
      return true
  }
  return false
}

// What a press keeps for itself instead of starting a pan.
const OWN_PRESS = '[data-modo="canvas-stage"], [data-modo="canvas-controls"], a, button, input, select, textarea'

/** An endless surface: wheel or drag the background to pan, pinch or
    ⌘/Ctrl-wheel to zoom, hold Space to pan from anywhere. Shift+0 is 100%,
    Shift+1 fits everything. */
export function Viewport({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const [camera] = useState(() => createCamera(root, world))

  useEffect(() => {
    const el = root.current!
    camera.paint()
    let drag: { id: number; x: number; y: number } | null = null
    let space = false

    const onWheel = (e: WheelEvent) => {
      const zoom = e.ctrlKey || e.metaKey
      // Lines (Firefox) to pixels.
      const unit = e.deltaMode === 1 ? 16 : 1
      const dx = e.deltaX * unit
      const dy = e.deltaY * unit
      if (!zoom && scrollsInside(e.target as Element, el, dx, dy)) return
      e.preventDefault()
      if (!zoom) return camera.panBy(-dx, -dy)
      const r = el.getBoundingClientRect()
      // Pinches send small deltas, mouse wheels big ones: cap so both feel alike.
      const d = Math.max(-25, Math.min(25, dy))
      camera.zoomAt(e.clientX - r.left, e.clientY - r.top, camera.view.k * Math.exp(-d * 0.01))
    }

    const onDown = (e: PointerEvent) => {
      const grab = e.button === 1 || (e.button === 0 && (space || !(e.target as Element).closest(OWN_PRESS)))
      if (!grab) return
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      el.dataset.panning = ''
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }

    const onMove = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return
      camera.panBy(e.clientX - drag.x, e.clientY - drag.y)
      drag.x = e.clientX
      drag.y = e.clientY
    }

    const onUp = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return
      drag = null
      delete el.dataset.panning
    }

    // Only with nothing focused: a focused control keeps Space and its keys.
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== document.body) return
      if (e.code === 'Space') {
        e.preventDefault()
        space = e.type === 'keydown'
        if (space) el.dataset.space = ''
        else delete el.dataset.space
        return
      }
      if (e.type !== 'keydown' || !e.shiftKey) return
      if (e.code === 'Digit0') camera.zoomTo(1)
      if (e.code === 'Digit1') camera.fit()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [camera])

  return (
    <CameraContext.Provider value={camera}>
      <div ref={root} data-modo="canvas">
        <div ref={world} data-modo="canvas-world">
          {children}
        </div>
        <Controls camera={camera} />
      </div>
    </CameraContext.Provider>
  )
}

function Controls({ camera }: { camera: Camera }) {
  const { Button } = shell
  const k = useSyncExternalStore(camera.subscribe, () => camera.view.k)
  return (
    <div data-modo="canvas-controls">
      <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => camera.zoomBy(1 / STEP)}>
        −
      </Button>
      <span data-modo="canvas-zoom">{Math.round(k * 100)}%</span>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => camera.zoomBy(STEP)}>
        +
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Fit everything" onClick={camera.fit}>
        ⤢
      </Button>
    </div>
  )
}
