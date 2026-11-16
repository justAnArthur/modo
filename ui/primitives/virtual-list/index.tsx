/*
 * Local addition (not part of Fluid Functionalism): a windowed list. Only the
 * rows inside the scroll viewport (plus an overscan) are mounted, at fixed
 * or measured heights, scrolled by the list itself or by a surrounding
 * ScrollArea; `follow` keeps a growing list pinned to its end.
 */

'use client'

import { forwardRef, type ReactNode, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

type VirtualListAlign = 'auto' | 'start' | 'center' | 'end'

/** What a `ref` on VirtualList holds. */
interface VirtualListHandle {
  /** Scrolls the row at `index` into view: only as far as needed (`auto`), or to the viewport's start, center or end. */
  scrollToIndex: (index: number, align?: VirtualListAlign) => void
  /** Scrolls to the very end and, with `follow`, starts following again. */
  scrollToEnd: () => void
}

interface VirtualListProps {
  /** Number of rows. */
  count: number
  /** Renders the row at `index`. Only rows near the viewport are rendered. */
  renderItem: (index: number) => ReactNode
  /** Fixed row height in px. Leave it out to measure each row as it renders. */
  itemHeight?: number
  /** Height in px assumed for a row not measured yet, when there is no `itemHeight`. Defaults to `36`. */
  estimateHeight?: number
  /** Rows rendered beyond each edge of the viewport, so a fast scroll never shows a gap. Defaults to `6`. */
  overscan?: number
  /** Stay scrolled to the end while rows are added or grow, as long as the reader is at the end; scrolling up lets go, scrolling back down (or `scrollToEnd`) follows again. A followed list starts at its end. Defaults to `false`. */
  follow?: boolean
  /** Called when following starts or stops, e.g. to show a jump-to-latest button. Only with `follow`. */
  onFollowChange?: (following: boolean) => void
  /** Width of the rows as a CSS length, for rows wider than the viewport (unwrapped log lines) that scroll sideways. Defaults to the list's width. */
  contentWidth?: string
  /** Accessible name of the list. */
  label?: string
  /** Classes for the root. On its own it is the scroller: give it a height. Inside a ScrollArea the area scrolls it. */
  className?: string
}

/** First index whose row ends below `y`. */
function rowAt(offsets: number[], count: number, y: number) {
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((offsets[mid + 1] ?? 0) <= y) lo = mid + 1
    else hi = mid
  }
  return lo
}

interface RowProps {
  index: number
  count: number
  top: number
  height?: number
  observer: () => ResizeObserver
  children: ReactNode
}

function Row({ index, count, top, height, observer, children }: RowProps) {
  const ref = useRef<HTMLLIElement>(null)

  // Unobserved on unmount: a detached row would report a height of 0.
  useLayoutEffect(() => {
    const node = ref.current
    if (height || !node) return
    const rows = observer()
    rows.observe(node)
    return () => rows.unobserve(node)
  }, [height, observer])

  return (
    <li
      ref={ref}
      aria-setsize={count}
      aria-posinset={index + 1}
      data-index={index}
      className="absolute inset-x-0"
      style={{ top, height }}
    >
      {children}
    </li>
  )
}

/**
 * A long list that renders only the rows you can see.
 *
 * Ten thousand rows scroll like ten: the list keeps its full height, and
 * only the rows inside the viewport, plus `overscan` on each side, are
 * mounted. Rows take a fixed `itemHeight`, or are measured as they render
 * (`estimateHeight` stands in until then), so wrapping text and rows of
 * different kinds just work. On its own the list scrolls itself; inside a
 * ScrollArea it follows the area's viewport, so the list can sit below a
 * header in one scroll. With `follow` a growing list (a log, a chat) stays
 * at its end until the reader scrolls up. A `ref` gives
 * `scrollToIndex(index, align)` and `scrollToEnd()`.
 *
 * @example {@include ./examples.mdx}
 */
const VirtualList = forwardRef<VirtualListHandle, VirtualListProps>(
  (
    {
      count,
      renderItem,
      itemHeight,
      estimateHeight = 36,
      overscan = 6,
      follow = false,
      onFollowChange,
      contentWidth,
      label,
      className,
    },
    ref,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLUListElement>(null)
    const [scroller, setScroller] = useState<HTMLElement | null>(null)
    const [view, setView] = useState({ top: 0, height: 0 })
    const heights = useRef(new Map<number, number>())
    const [, setMeasured] = useState(0)
    const own = scroller !== null && scroller === rootRef.current

    const offsets = [0]
    for (let i = 0; i < count; i++)
      offsets.push((offsets[i] ?? 0) + (itemHeight ?? heights.current.get(i) ?? estimateHeight))
    const latest = useRef(offsets)
    latest.current = offsets
    const total = offsets[count] ?? 0

    // Whether the reader is at the end; starts true so a followed list opens there.
    const following = useRef(true)
    const followChange = useRef(onFollowChange)
    followChange.current = onFollowChange

    useLayoutEffect(() => {
      const root = rootRef.current
      if (root) setScroller(root.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? root)
    }, [])

    // The list's top in the scroller's content, so a header above it in a ScrollArea is accounted for.
    const listTop = useCallback(() => {
      const inner = innerRef.current
      if (!scroller || !inner) return 0
      return inner.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    }, [scroller])

    useLayoutEffect(() => {
      if (!scroller) return
      const update = () => {
        setView({ top: scroller.scrollTop - listTop(), height: scroller.clientHeight })
        if (!follow) return
        const atEnd = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 2
        if (atEnd === following.current) return
        following.current = atEnd
        followChange.current?.(atEnd)
      }
      update()
      scroller.addEventListener('scroll', update, { passive: true })
      const resize = new ResizeObserver(update)
      resize.observe(scroller)
      return () => {
        scroller.removeEventListener('scroll', update)
        resize.disconnect()
      }
    }, [scroller, listTop, follow])

    // Content grew under a reader at the end: no scroll event fires, so `following` still holds.
    useLayoutEffect(() => {
      if (follow && following.current && scroller) scroller.scrollTop = scroller.scrollHeight
    }, [follow, scroller, count, total])

    // One observer for every mounted row, made on first use: rows attach before this component's effects run.
    const rows = useRef<ResizeObserver | null>(null)
    const observer = useCallback(() => {
      rows.current ??= new ResizeObserver(entries => {
        let changed = false
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index)
          const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
          if (heights.current.get(index) === height) continue
          heights.current.set(index, height)
          changed = true
        }
        if (changed) setMeasured(n => n + 1)
      })
      return rows.current
    }, [])
    useLayoutEffect(() => () => rows.current?.disconnect(), [])

    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex(index, align = 'auto') {
          const jump = () => {
            if (!scroller) return
            const at = Math.max(0, Math.min(index, count - 1))
            const start = latest.current[at] ?? 0
            const top = listTop() + start
            const height = (latest.current[at + 1] ?? start) - start
            const { scrollTop, clientHeight } = scroller
            if (align === 'start') scroller.scrollTop = top
            else if (align === 'end') scroller.scrollTop = top + height - clientHeight
            else if (align === 'center') scroller.scrollTop = top + height / 2 - clientHeight / 2
            else if (top < scrollTop) scroller.scrollTop = top
            else if (top + height > scrollTop + clientHeight) scroller.scrollTop = top + height - clientHeight
          }
          jump()
          // Measured rows land on estimates first; once the rows there are measured, land again.
          if (!itemHeight) requestAnimationFrame(() => requestAnimationFrame(jump))
        },
        scrollToEnd() {
          if (!scroller) return
          if (follow && !following.current) followChange.current?.(true)
          following.current = true
          scroller.scrollTop = scroller.scrollHeight
        },
      }),
      [scroller, listTop, count, itemHeight, follow],
    )

    const first = Math.max(0, rowAt(offsets, count, view.top) - overscan)
    const last = Math.min(count, rowAt(offsets, count, view.top + view.height) + 1 + overscan)
    const visible: number[] = []
    for (let i = first; i < last; i++) visible.push(i)

    return (
      <div
        ref={rootRef}
        // A scrolling region takes focus so it scrolls by keyboard.
        tabIndex={own ? 0 : undefined}
        className={cn(
          own && 'overflow-auto outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
          className,
        )}
      >
        <ul
          ref={innerRef}
          aria-label={label}
          className={cn('relative', contentWidth && 'min-w-full')}
          style={{ height: total, width: contentWidth }}
        >
          {visible.map(i => (
            <Row key={i} index={i} count={count} top={offsets[i] ?? 0} height={itemHeight} observer={observer}>
              {renderItem(i)}
            </Row>
          ))}
        </ul>
      </div>
    )
  },
)

VirtualList.displayName = 'VirtualList'

export type { VirtualListAlign, VirtualListHandle, VirtualListProps }
export { VirtualList }

export default VirtualList
