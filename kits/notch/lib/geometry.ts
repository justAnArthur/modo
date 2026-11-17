/*
 * The island's geometry, pure: its outline per state, the detached bubble of
 * `split`, the path that draws it and how icon tabs share the wings around
 * the notch. Ported from Just Notch's runtime (`island/geometry.ts`), with the
 * screen geometry replaced by sizes a component takes as props.
 */

/** What the island shows: the bare notch, an activity in the wings, two activities, the open panel, or an alert. */
export type IslandState = 'idle' | 'compact' | 'split' | 'expanded' | 'flash'

export const ISLAND_STATES: IslandState[] = ['idle', 'compact', 'split', 'expanded', 'flash']

/** A width and a height in px. */
export interface Size {
  width: number
  height: number
}

/** The sizes the island grows between: the hardware notch and the open panel. */
export interface IslandGeometry {
  notch: Size
  panel: Size
}

/** The island's outline: a body of `w` × `h` hanging from the top edge, `radius` below, concave `shoulder`s into the edge. */
export interface Shape {
  w: number
  h: number
  radius: number
  shoulder: number
}

export const DEFAULT_NOTCH: Size = { width: 185, height: 32 }
export const DEFAULT_PANEL: Size = { width: 720, height: 320 }

/** The open island's one content inset: header, title and content all start here, clear of the bottom corners. */
export const INSET = 20
/** Kept free on each side of the notch. */
export const NOTCH_GAP = 8
/** How far a flash reaches past the compact wings, on each side. */
const FLASH_REACH = 64
/** How far a flash drops below the notch. */
const FLASH_DROP = 48

/** Room for one compact slot beside the notch: about as wide as the notch is tall. */
export const slotWidth = (notch: Size) => notch.height + 8

/**
 * The outline for `state`. `room` is the width the island may take (its
 * container's); the open panel and the flash shrink to fit it, shoulders included.
 */
export function shapeFor(state: IslandState, { notch, panel }: IslandGeometry, room = Number.POSITIVE_INFINITY): Shape {
  const slot = slotWidth(notch)
  if (state === 'idle') return { w: notch.width, h: notch.height, radius: 10, shoulder: 6 }
  if (state === 'compact' || state === 'split')
    return { w: notch.width + 2 * slot, h: notch.height, radius: 13, shoulder: 8 }
  if (state === 'flash')
    return {
      w: Math.min(notch.width + 2 * (slot + FLASH_REACH), room - 20),
      h: notch.height + FLASH_DROP,
      radius: 24,
      shoulder: 10,
    }
  return { w: Math.max(notch.width, Math.min(panel.width, room - 28)), h: panel.height, radius: 32, shoulder: 14 }
}

/** The detached bubble of `split`: a circle as tall as the compact island, its center `x` from the island's center. */
export function bubbleFor(shape: Shape, notch: Size, detached: boolean) {
  const r = notch.height / 2 - 1
  return detached ? { x: shape.w / 2 + shape.shoulder + 14 + r, r } : { x: shape.w / 2 - r, r: r * 0.5 }
}

// A circle's quarter as a cubic has handles at 0.5523 of the radius. Stretching
// the corner over 1.28 r with longer handles spreads the curvature like Apple's
// continuous corners, so the bottom never reads as a plain rounded rectangle.
const CIRCLE = 0.5523
const SMOOTH_SPAN = 1.28
const SMOOTH_HANDLE = 0.64

/**
 * The outline as one SVG path, centered on `cx`. It starts a point above the
 * top edge so no hairline shows where it meets the screen.
 */
export function islandPath(cx: number, { w, h, radius, shoulder }: Shape): string {
  const s = Math.max(0, Math.min(shoulder, h / 2))
  const span = Math.max(0, Math.min(radius * SMOOTH_SPAN, h - s, w / 2))
  const k = span * (1 - SMOOTH_HANDLE)
  const q = s * (1 - CIRCLE)
  const l = cx - w / 2
  const r = cx + w / 2
  return [
    `M${l - s} -1`,
    `L${l - s} 0`,
    `C${l - q} 0 ${l} ${q} ${l} ${s}`,
    `L${l} ${h - span}`,
    `C${l} ${h - k} ${l + k} ${h} ${l + span} ${h}`,
    `L${r - span} ${h}`,
    `C${r - k} ${h} ${r} ${h - k} ${r} ${h - span}`,
    `L${r} ${s}`,
    `C${r} ${q} ${r + q} 0 ${r + s} 0`,
    `L${r + s} -1`,
    'Z',
  ].join('')
}

export interface StripLayout {
  /** Tabs in the left wing; the rest follow in the right one. */
  before: number
  /** More tabs than both wings hold: the strip scrolls, behind the notch. */
  overflow: boolean
  /** The notch and its gaps in the strip's coordinates. */
  hole: { start: number; end: number }
  /** Least width of the gap between the wings, so the right wing starts past the notch. */
  spacer: number
}

/**
 * Tabs of `tab` px across a strip of `width` centered under a notch of
 * `notchWidth`, flowing from the left wing into the right one, balanced.
 * `reserve` is kept free at the right wing's far end (a settings button).
 */
export function stripLayout(count: number, width: number, notchWidth: number, tab: number, reserve = 0): StripLayout {
  const left = Math.max(0, (width - notchWidth) / 2 - NOTCH_GAP)
  const leftCap = Math.floor(left / tab)
  const rightCap = Math.max(0, Math.floor((left - reserve) / tab))
  const overflow = count > leftCap + rightCap
  const before = overflow ? leftCap : Math.min(leftCap, Math.max(Math.ceil(count / 2), count - rightCap))
  const hole = { start: left, end: width - left }
  return { before, overflow, hole, spacer: hole.end - before * tab }
}
