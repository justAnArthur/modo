/*
 * Vendored from Fluid Functionalism — `registry/default/hooks/use-merge-split.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react` (the package's current name).
 * - `@/lib/*` and `@/hooks/*` imports rewritten to sibling `./*` paths.
 * - The merge/split choreography (boundaries, converge/commit/split phases,
 *   resolve timers, the split safety net and its `bridgePair`) is replaced by
 *   the morph style's goo (`GooLayer` in `./goo-indicator`, local): every
 *   checked row draws its own block, squared where it meets a checked
 *   neighbour, and a block grows out of its row's center or shrinks back into
 *   it while the goo melts it into, or pinches it off, its neighbours. The
 *   exports keep their names and shapes; `SelBlock` keeps `key`, the rect,
 *   `radii` and `instant`.
 */

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GooLayer, union } from './goo-indicator'
import { useReduceMotion } from './reduced-motion'
import { spring } from './springs'
import type { ItemRect } from './use-fluid-hover'
import { GOO_BLUR_RATIO } from './use-morph'

// Edge spring for the selected backgrounds: spring.moderate (critically
// damped) so converging edges meet exactly instead of overshooting.
const mergeSpring = spring.moderate
// The goo runs from a change of the checked rows until their springs settle.
const settleMs = mergeSpring.duration * 1000 + 80
// The share of its row's width a block grows out of, and shrinks back into, at the row's center.
const SEED = 0.5

type Rect = { top: number; left: number; width: number; height: number }
export interface SelBlock extends Rect {
  key: string
  radii: [number, number, number, number] // tl, tr, br, bl
  instant: boolean // skip the motion (a reflow that moved the rows underneath)
}

// A contiguous run of selected/checked rows, with a stable id.
export type Run = { start: number; end: number; id: number }

/**
 * Groups checked row indices into contiguous runs with ids that survive
 * re-renders: a run keeps its id while any of its rows was in a run last
 * render. Feed the result to useMergeSplitBlocks.
 */
export function useSelectionRuns(checkedIndices: readonly number[]): Run[] {
  const prevGroupMap = useRef(new Map<number, number>())
  const groupIdCounter = useRef(0)

  const runs: { start: number; end: number }[] = []
  const sorted = [...checkedIndices].sort((a, b) => a - b)
  for (const idx of sorted) {
    const last = runs[runs.length - 1]
    if (last && idx === last.end + 1) last.end = idx
    else runs.push({ start: idx, end: idx })
  }

  const usedIds = new Set<number>()
  const nextGroupMap = new Map<number, number>()
  const result = runs.map(run => {
    let stableId: number | null = null
    for (let i = run.start; i <= run.end; i++) {
      const prevId = prevGroupMap.current.get(i)
      if (prevId !== undefined && !usedIds.has(prevId)) {
        stableId = prevId
        break
      }
    }
    const id = stableId ?? ++groupIdCounter.current
    usedIds.add(id)
    for (let i = run.start; i <= run.end; i++) nextGroupMap.set(i, id)
    return { ...run, id }
  })
  prevGroupMap.current = nextGroupMap
  return result
}

/**
 * The background blocks to paint for the contiguous selection `runs`: one per
 * checked row, reaching down to the next row of its run (so gaps between rows
 * fill) and rounded to `R` only on the run's outer corners, so a run reads as
 * one block. Render them with <SelectionBackgrounds>.
 */
export function useMergeSplitBlocks(runs: Run[], itemRects: ItemRect[], R: number): SelBlock[] {
  const blocks: SelBlock[] = []
  for (const run of runs) {
    const first = itemRects[run.start]
    const last = itemRects[run.end]
    if (!first || !last) continue
    const left = Math.min(first.left, last.left)
    const width = Math.max(first.width, last.width)
    for (let i = run.start; i <= run.end; i++) {
      const row = itemRects[i]
      if (!row) continue
      const next = i < run.end ? itemRects[i + 1] : undefined
      const bottom = next?.top ?? row.top + row.height
      const top = i === run.start ? R : 0
      const end = i === run.end ? R : 0
      blocks.push({
        key: `sel-${i}`,
        top: row.top,
        left,
        width,
        height: bottom - row.top,
        radii: [top, top, end, end],
        instant: false,
      })
    }
  }
  return blocks
}

type Mode = 'goo' | 'fade' | 'snap'

const corners = ([tl, tr, br, bl]: SelBlock['radii']) => ({
  borderTopLeftRadius: tl,
  borderTopRightRadius: tr,
  borderBottomRightRadius: br,
  borderBottomLeftRadius: bl,
})

const rest = (b: SelBlock) => ({
  top: b.top,
  left: b.left,
  width: b.width,
  height: b.height,
  opacity: 1,
  ...corners(b.radii),
})

const seed = (b: SelBlock) => ({
  top: b.top + b.height / 2,
  left: b.left + (b.width * (1 - SEED)) / 2,
  width: b.width * SEED,
  height: 0,
  ...corners(b.radii),
})

const variants = (b: SelBlock) => ({
  rest: rest(b),
  enter: (mode: Mode) => (mode === 'goo' ? seed(b) : { ...rest(b), opacity: 0 }),
  leave: (mode: Mode) =>
    mode === 'goo'
      ? { ...seed(b), transition: mergeSpring.exit }
      : { opacity: 0, transition: mode === 'fade' ? mergeSpring.exit : { duration: 0 } },
})

/**
 * Renders the selected-background blocks produced by useMergeSplitBlocks. A
 * checked row's block grows out of its center and an unchecked one shrinks
 * back into it, while the goo melts it into its checked neighbours or pinches
 * it off them; the filter runs only for that change. Reduced motion fades.
 */
export function SelectionBackgrounds({ blocks }: { blocks: SelBlock[] }) {
  const reduced = useReduceMotion()
  const mode: Mode = blocks.some(b => b.instant) ? 'snap' : reduced ? 'fade' : 'goo'
  const rows = blocks.map(b => b.key).join('|')
  const [melting, setMelting] = useState(false)
  const shown = useRef(rows)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const covered = useRef<ItemRect | null>(null)
  const radius = useRef(0)

  useLayoutEffect(() => {
    if (rows === shown.current) return
    shown.current = rows
    if (mode !== 'goo') return
    setMelting(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMelting(false), settleMs)
  }, [rows, mode])

  useEffect(() => () => clearTimeout(timer.current), [])

  // While it melts, the layer keeps covering every row it has drawn, the ones leaving included.
  const box = blocks.reduce<ItemRect | null>(union, null)
  const changing = melting || rows !== shown.current
  if (!changing) covered.current = box
  else if (box) covered.current = union(covered.current, box)
  radius.current = Math.max(changing ? radius.current : 0, ...blocks.flatMap(b => b.radii))

  return (
    <GooLayer active={melting} blur={radius.current * GOO_BLUR_RATIO} box={covered.current} fill="bg-active">
      <AnimatePresence initial={false} custom={mode}>
        {blocks.map(b => (
          <motion.div
            key={b.key}
            aria-hidden
            className="pointer-events-none absolute bg-active"
            custom={mode}
            variants={variants(b)}
            initial={mode === 'snap' ? false : 'enter'}
            animate="rest"
            exit="leave"
            transition={
              mode === 'snap' ? { duration: 0 } : { ...mergeSpring, opacity: { duration: spring.fast.duration } }
            }
          />
        ))}
      </AnimatePresence>
    </GooLayer>
  )
}
