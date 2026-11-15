/*
 * Local addition (not part of Fluid Functionalism): the rounded rect the
 * morph engine tweens and its helpers, for every shape that grows from one
 * box into another (the morph engine, the accordion panel, Copy's disc).
 */

/** A box with one corner radius, in px. */
interface Rect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** The rect `t` of the way from `a` to `b`. A bouncing tier takes `t` past 1. */
function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    r: lerp(a.r, b.r, t),
  }
}

/** No negative size (a bounce overshooting back past 0), and a radius that fits the box. */
function clampRect(rect: Rect): Rect {
  const w = Math.max(0, rect.w)
  const h = Math.max(0, rect.h)
  return { x: rect.x, y: rect.y, w, h, r: Math.max(0, Math.min(rect.r, w / 2, h / 2)) }
}

/** Writes the rect onto an absolutely positioned element. */
function placeRect(el: HTMLElement | null, { x, y, w, h, r }: Rect) {
  if (!el) return
  el.style.inset = 'auto'
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.style.borderRadius = `${r}px`
}

export type { Rect }
export { clampRect, lerp, lerpRect, placeRect }
