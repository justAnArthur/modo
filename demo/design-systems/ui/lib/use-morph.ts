/*
 * Local addition (not part of Fluid Functionalism): the morph engine every
 * overlay shares. One 0→1 progress value on a spring tier grows the overlay's
 * surface from where it was opened (the source rect) to its own box; the
 * renderer is `lib/morph-layers.tsx`, the docs page `primitives/morph`.
 *
 * The rect interpolation and the rounded-rect path follow beUI's gooey popover
 * (github.com/starc007/ui-components `components/motion/popover.tsx` @
 * de52f337e520e7ee37749b36eb1c32df86137bcb — MIT © 2026 Saurabh Chauhan,
 * notice: LICENSE.beui). Everything else is new: Base UI keeps behavior, and
 * the surface layers move their real box instead of a clip-path, so their
 * `shadow-surface-N` is never cut off.
 */

import { animate, useMotionValue, useReducedMotionConfig } from 'motion/react'
import { type RefObject, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { exitFallbackMs, spring } from './springs'

type MorphSide = 'top' | 'right' | 'bottom' | 'left'
type MorphFrom = 'trigger' | 'pointer' | 'center' | MorphSide | RefObject<HTMLElement | null>
type MorphEffect = 'goo' | 'morph' | 'slide' | 'fade'
type MorphTier = 'moderate' | 'slow'

interface MorphOptions {
  /** Where the surface grows from. */
  from?: MorphFrom
  /** How it gets there. */
  effect?: MorphEffect
  /** Hide the source while open, so it reads as becoming the overlay. */
  hideSource?: boolean
  /** Spring tier. */
  tier?: MorphTier
  /** Overrides `effect` (and `from`) for the close only, read as it starts: a swiped sheet slides on off its edge. */
  exit?: { effect: 'slide' | 'fade'; from?: MorphFrom }
  /**
   * Shows or hides at once while this returns true for the popup (Base UI's
   * `data-instant` hand-off between grouped tooltips). Checked as a run
   * starts and on every frame.
   */
  instant?: (popup: HTMLElement) => boolean
}

/** What opened the overlay: the pressed trigger and the press point. */
interface MorphOrigin {
  trigger?: HTMLElement
  point?: { x: number; y: number }
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

interface Geometry {
  source: Rect
  target: Rect
  /** The shapes layer's box: source ∪ target, padded for the goo blur. */
  layer: Rect
  /** Where a slide starts, as an offset from the target. */
  offset: { x: number; y: number }
}

// The alpha threshold that turns the blur back into solid, merging shapes
// (beUI popover.tsx / Sileo use 22 -10 and 20 -10), and the blur as a share of
// the surface radius (Sileo's BLUR_RATIO), so rounder surfaces melt more.
const GOO_MATRIX = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10'
const GOO_BLUR_RATIO = 0.5

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    r: lerp(a.r, b.r, t),
  }
}

// The slow tier overshoots past 1, which would push a size below zero on the
// way back.
function clampRect(rect: Rect): Rect {
  const w = Math.max(0, rect.w)
  const h = Math.max(0, rect.h)
  return { x: rect.x, y: rect.y, w, h, r: Math.max(0, Math.min(rect.r, w / 2, h / 2)) }
}

function roundedRectPath({ x, y, w, h, r }: Rect) {
  const n = (value: number) => value.toFixed(3)
  const arc = `A${n(r)} ${n(r)} 0 0 1`
  return (
    `M${n(x + r)} ${n(y)}` +
    `H${n(x + w - r)}${arc} ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}${arc} ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}${arc} ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}${arc} ${n(x + r)} ${n(y)}Z`
  )
}

function radiusOf(el: Element, width: number, height: number) {
  const value = getComputedStyle(el).borderTopLeftRadius
  const r = value.endsWith('%') ? (Number.parseFloat(value) / 100) * width : Number.parseFloat(value)
  return Math.min(r || 0, width / 2, height / 2)
}

function onScreen(rect: DOMRect) {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < innerHeight &&
    rect.left < innerWidth
  )
}

function sourceElement(from: MorphFrom, origin: MorphOrigin) {
  if (from === 'trigger') return origin.trigger
  if (typeof from === 'object') return from.current ?? undefined
}

/** The source in the popup's own coordinates (`box` is the popup's viewport rect). */
function sourceRect(from: MorphFrom, origin: MorphOrigin, box: DOMRect, target: Rect): Rect {
  const local = (x: number, y: number, w: number, h: number, r: number) => ({
    x: x - box.left,
    y: y - box.top,
    w,
    h,
    r,
  })
  const center = { x: target.w / 2, y: target.h / 2, w: 0, h: 0, r: target.r }

  if (from === 'center') return center
  if (from === 'top') return local(box.left, 0, box.width, 0, 0)
  if (from === 'bottom') return local(box.left, innerHeight, box.width, 0, 0)
  if (from === 'left') return local(0, box.top, 0, box.height, 0)
  if (from === 'right') return local(innerWidth, box.top, 0, box.height, 0)

  if (from === 'pointer') {
    const trigger = origin.trigger?.getBoundingClientRect()
    const point =
      origin.point ?? (trigger && { x: trigger.left + trigger.width / 2, y: trigger.top + trigger.height / 2 })
    // A droplet as wide as the surface's radius, so goo has a source to
    // draw its neck from.
    const d = target.r
    return point ? local(point.x - d / 2, point.y - d / 2, d, d, d / 2) : center
  }

  const el = sourceElement(from, origin)
  const rect = el?.getBoundingClientRect()
  if (!el || !rect || !onScreen(rect)) return center
  return local(rect.left, rect.top, rect.width, rect.height, radiusOf(el, rect.width, rect.height))
}

/** A slide from a viewport edge starts fully off screen; from anywhere else, centered on the source. */
function slideOffset(from: MorphFrom, source: Rect, target: Rect, box: DOMRect) {
  if (from === 'left') return { x: -box.right, y: 0 }
  if (from === 'right') return { x: innerWidth - box.left, y: 0 }
  if (from === 'top') return { x: 0, y: -box.bottom }
  if (from === 'bottom') return { x: 0, y: innerHeight - box.top }
  return { x: source.x + source.w / 2 - target.w / 2, y: source.y + source.h / 2 - target.h / 2 }
}

function layerBox(source: Rect, target: Rect, pad: number): Rect {
  const x = Math.min(source.x, target.x) - pad
  const y = Math.min(source.y, target.y) - pad
  const w = Math.max(source.x + source.w, target.x + target.w) + pad - x
  const h = Math.max(source.y + source.h, target.y + target.h) + pad - y
  return { x, y, w, h, r: 0 }
}

function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function place(el: HTMLElement | null, { x, y, w, h, r }: Rect) {
  if (!el) return
  el.style.inset = 'auto'
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.style.borderRadius = `${r}px`
}

function insetClip(rect: Rect, box: Rect) {
  const right = box.w - rect.x - rect.w
  const bottom = box.h - rect.y - rect.h
  return `inset(${rect.y}px ${right}px ${bottom}px ${rect.x}px round ${rect.r}px)`
}

/**
 * A trigger that turns into its panel (`effect: 'morph'` with `hideSource`)
 * opens in place: the panel lays over the trigger instead of beside it, so
 * the trigger's box is where the panel starts. Anchored overlays pass
 * `inPlaceOffset` as Base UI's `sideOffset` while this holds.
 */
function opensInPlace({ effect, hideSource }: MorphOptions) {
  return effect === 'morph' && (hideSource ?? false)
}

/** Base UI `sideOffset` that pulls the panel back over its anchor, edge to edge, on whichever side it lands. */
function inPlaceOffset({ side, anchor }: { side: string; anchor: { width: number; height: number } }) {
  return side === 'top' || side === 'bottom' ? -anchor.height : -anchor.width
}

/**
 * Base UI unmounts a closed popup once `getAnimations()` on it settles; a
 * JS-driven animation registers none, so an empty animation holds it open
 * for the tier's exit (plus a buffer). Finish or cancel it once the exit is
 * done or abandoned.
 */
function holdExit(el: HTMLElement, tier: MorphTier) {
  return el.animate(null, { duration: exitFallbackMs(spring[tier]) })
}

/** Where the opening event happened; none for a keyboard-activated click. */
function pressPoint(event: Event | undefined) {
  // A long press (Base UI's ContextMenu) hands over its touchstart.
  if (event && 'touches' in event) {
    const { touches, changedTouches } = event as TouchEvent
    const touch = touches[0] ?? changedTouches[0]
    return touch && { x: touch.clientX, y: touch.clientY }
  }
  if (!(event instanceof MouseEvent)) return
  // A keyboard-activated click reports `detail` 0 and no real coordinates; a
  // keyboard context menu is placed on the focused element.
  if (event.type === 'click' && event.detail === 0) return
  return { x: event.clientX, y: event.clientY }
}

/**
 * Remembers what opened an overlay. Call `capture` from the Base UI root's
 * `onOpenChange` on open: its details carry the pressed trigger and the event
 * (a click, a context menu, a long press).
 */
function useMorphOrigin() {
  const origin = useRef<MorphOrigin>({})
  const capture = useCallback((details: { trigger?: Element; event?: Event }) => {
    const { trigger, event } = details
    origin.current = {
      trigger: trigger instanceof HTMLElement ? trigger : origin.current.trigger,
      point: pressPoint(event),
    }
  }, [])
  return { origin, capture }
}

/**
 * Drives one overlay's morph. `open` is the overlay's open state, `origin` what
 * opened it (`useMorphOrigin`). Spread the returned refs through
 * `MorphSurface`; `popupRef` goes on the Base UI popup, which keeps its final
 * size the whole time, so positioning and collision flipping never see the
 * animation. `onExited` runs once a close has finished.
 */
function useMorph(
  open: boolean,
  origin: RefObject<MorphOrigin>,
  { from = 'trigger', effect = 'goo', hideSource = false, tier = 'slow', exit, instant }: MorphOptions = {},
  onExited?: () => void,
) {
  const reduced = useReducedMotionConfig()
  const resolved: MorphEffect = reduced ? 'fade' : effect
  const progress = useMotionValue(0)
  const gooId = `morph-goo-${useId().replace(/:/g, '')}`
  const geometry = useRef<Geometry | null>(null)
  // The effect and source of the run in flight: a close can override both.
  const run = useRef({ effect: resolved, from })
  const targetRadius = useRef(0)
  const hidden = useRef<{ el: HTMLElement; opacity: string } | null>(null)
  const exited = useRef(onExited)
  exited.current = onExited

  // Base UI mounts the popup a render after `open` flips, so the engine
  // starts from the element's arrival, not from the flag.
  const [popup, setPopup] = useState<HTMLDivElement | null>(null)
  const refs = {
    popup: useRef<HTMLDivElement | null>(null),
    shapes: useRef<HTMLDivElement>(null),
    blur: useRef<SVGFEGaussianBlurElement>(null),
    copy: useRef<HTMLDivElement>(null),
    shape: useRef<HTMLDivElement>(null),
    bg: useRef<HTMLDivElement>(null),
    shadow: useRef<HTMLDivElement>(null),
    content: useRef<HTMLDivElement>(null),
  }

  const render = (p: number) => {
    const g = geometry.current
    if (!g) return
    const { bg, content, shadow, popup, shape } = refs
    const { effect } = run.current
    const shaped = effect === 'goo' || effect === 'morph'
    const slide = { ...g.target, x: g.offset.x * (1 - p), y: g.offset.y * (1 - p) }
    const rect = clampRect(shaped ? lerpRect(g.source, g.target, p) : effect === 'slide' ? slide : g.target)

    place(
      shaped ? shape.current : bg.current,
      shaped ? { ...rect, x: rect.x - g.layer.x, y: rect.y - g.layer.y } : rect,
    )
    place(shadow.current, rect)
    if (shadow.current) shadow.current.style.opacity = String(Math.min(1, Math.max(0, p)))

    // Every property on every frame: a reopen can change the effect mid-run.
    if (content.current) {
      content.current.style.clipPath = shaped ? insetClip(rect, g.target) : ''
      content.current.style.transform = effect === 'slide' ? `translate(${rect.x}px, ${rect.y}px)` : ''
    }
    if (popup.current) popup.current.style.opacity = effect === 'fade' ? String(p) : ''
  }

  // Back to the resting state: the background and shadow fall back to their
  // classes (inset-0 plus the shape's radius), so they follow the popup if its
  // content resizes.
  const rest = () => {
    refs.bg.current?.removeAttribute('style')
    refs.shadow.current?.removeAttribute('style')
    if (refs.shapes.current) refs.shapes.current.style.display = ''
    if (refs.content.current) {
      refs.content.current.style.clipPath = ''
      refs.content.current.style.transform = ''
    }
    if (refs.popup.current) refs.popup.current.style.opacity = ''
  }

  const measure = () => {
    const el = refs.popup.current
    if (!el) return
    const { effect, from } = run.current
    // goo and morph draw the moving surface in the shapes layer, which is cut
    // around the source; slide and fade move the resting background itself.
    const shaped = effect === 'goo' || effect === 'morph'
    const box = el.getBoundingClientRect()
    const target = { x: 0, y: 0, w: box.width, h: box.height, r: targetRadius.current }
    const source = sourceRect(from, origin.current ?? {}, box, target)
    const blur = effect === 'goo' ? target.r * GOO_BLUR_RATIO : 0
    const layer = layerBox(source, target, blur * 3)
    geometry.current = { source, target, layer, offset: slideOffset(from, source, target, box) }

    const { shapes, copy, bg } = refs
    if (bg.current) bg.current.style.opacity = shaped ? '0' : ''
    if (!shapes.current) return
    shapes.current.style.display = shaped ? 'block' : ''
    if (!shaped) return
    const local = (rect: Rect) => ({ ...rect, x: rect.x - layer.x, y: rect.y - layer.y })
    place(shapes.current, { ...layer, r: 0 })
    if (effect === 'goo') {
      place(copy.current, local(source))
      refs.blur.current?.setAttribute('stdDeviation', String(blur))
    }
    // The layer sits above the page, so the surface growing out of the source
    // would cover it; punching the source back out keeps it visible. Not when
    // the overlay lands on top of its source (a dialog over its trigger): the
    // hole would show through it. A clip path, not a mask: WebKit ignores
    // `mask: url(#…)` on an SVG <mask>.
    const cut = source.w > 0 && source.h > 0 && !hideSource && !overlaps(source, target)
    shapes.current.style.clipPath = cut
      ? `path(evenodd, "${roundedRectPath({ ...layer, x: 0, y: 0 })} ${roundedRectPath(local(source))}")`
      : ''
  }

  const reveal = () => {
    if (!hidden.current) return
    hidden.current.el.style.opacity = hidden.current.opacity
    hidden.current = null
  }

  const hide = (el: HTMLElement | undefined) => {
    if (!hideSource || !el || hidden.current?.el === el) return
    // Reopened from another source: the last one comes back.
    reveal()
    hidden.current = { el, opacity: el.style.opacity }
    // opacity, not visibility: the source must stay focusable so focus can return to it.
    el.style.opacity = '0'
  }

  const skip = (el: HTMLElement) => instant?.(el) ?? false

  useLayoutEffect(() => {
    if (!popup) {
      // The popup left mid-run (Base UI or its owner unmounted it): give the
      // source back and start the next open from scratch.
      reveal()
      progress.jump(0)
      if (geometry.current && !open) exited.current?.()
      geometry.current = null
      return
    }
    const { exit: leave, ...enter } = spring[tier]

    if (open) {
      run.current = { effect: resolved, from }
      const first = !geometry.current
      if (first && refs.bg.current) {
        const box = popup.getBoundingClientRect()
        targetRadius.current = radiusOf(refs.bg.current, box.width, box.height)
      }
      let controls: ReturnType<typeof animate> | undefined
      const begin = () => {
        measure()
        hide(sourceElement(from, origin.current ?? {}))
        if (skip(popup)) {
          progress.jump(1)
          rest()
          return
        }
        render(progress.get())
        controls = animate(progress, 1, {
          ...enter,
          onUpdate: p => {
            if (skip(popup)) controls?.complete()
            render(p)
          },
          onComplete: rest,
        })
      }
      // A reopen picks the closing surface up where it is, and a skipped morph
      // shows at once (the popup it replaces is already gone); only a fresh
      // open waits a frame, hidden, since Base UI positions the popup in a
      // microtask after this effect.
      if (!first || skip(popup) || !refs.bg.current) {
        begin()
        return () => controls?.stop()
      }
      refs.bg.current.style.opacity = '0'
      if (refs.shadow.current) refs.shadow.current.style.opacity = '0'
      if (refs.content.current) refs.content.current.style.clipPath = 'inset(50%)'
      const frame = requestAnimationFrame(begin)
      return () => {
        cancelAnimationFrame(frame)
        controls?.stop()
      }
    }

    if (!geometry.current) return
    const done = () => {
      reveal()
      geometry.current = null
      exited.current?.()
    }
    if (skip(popup)) {
      progress.jump(0)
      popup.style.opacity = '0'
      done()
      return
    }
    run.current = exit
      ? { effect: reduced ? 'fade' : exit.effect, from: exit.from ?? from }
      : { effect: resolved, from }
    // An override leaves from the whole surface as it stands, not from
    // wherever the open had got to.
    if (exit) progress.jump(1)
    const hold = holdExit(popup, tier)
    measure()
    render(progress.get())
    let controls: ReturnType<typeof animate> | undefined
    controls = animate(progress, 0, {
      ...leave,
      onUpdate: p => {
        if (skip(popup)) controls?.complete()
        render(p)
      },
      onComplete: () => {
        hold.finish()
        done()
      },
    })
    return () => {
      controls?.stop()
      hold.cancel()
    }
  }, [open, popup])

  useEffect(() => reveal, [])

  const popupRef = useCallback((node: HTMLDivElement | null) => {
    refs.popup.current = node
    setPopup(node)
  }, [])

  return { refs, popupRef, popup, gooId, effect: resolved, progress }
}

type Morph = ReturnType<typeof useMorph>

export type { Morph, MorphEffect, MorphFrom, MorphOptions, MorphOrigin, MorphSide, MorphTier }
export { GOO_BLUR_RATIO, GOO_MATRIX, holdExit, inPlaceOffset, opensInPlace, useMorph, useMorphOrigin }
