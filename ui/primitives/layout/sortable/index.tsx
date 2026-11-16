/*
 * Local addition (not part of Fluid Functionalism): drag to reorder a list,
 * by pointer (motion's `Reorder`) or by keyboard (space lifts, arrows move,
 * space drops, Escape puts it back), announced through a live region. Items
 * make room on the moderate spring through motion's `layout`.
 */

'use client'

import { type DragControls, Reorder, useDragControls } from 'motion/react'
import {
  createContext,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useIcon } from '../../../lib/icon-context'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { spring, springEnter } from '../../../lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useLift, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'

/** One entry: a stable id, the name screen readers hear, and what the row shows. */
interface SortableItem {
  id: string
  label: string
  content?: ReactNode
}

type SortableOrientation = 'vertical' | 'horizontal'

/** The list's element: a list of its own, or `'none'` for rows that are already a host list's items. */
type SortableAs = 'ul' | 'ol' | 'none'

interface ItemState {
  controls: DragControls
  label: string
  /** Keyboard and focus wiring for whichever element takes focus: the item, or its handle. */
  focusProps: {
    ref: (node: HTMLElement | null) => void
    tabIndex: number
    'aria-roledescription': string
    'aria-describedby': string
    onKeyDown: (e: KeyboardEvent) => void
    onBlur: (e: FocusEvent) => void
  }
}

const SortableItemContext = createContext<ItemState | null>(null)

const MOVE = springEnter(spring.moderate)
const STILL = { duration: 0 }
const FOCUS_RING = 'outline-none focus-visible:ring-1 focus-visible:ring-focus-ring'

interface SortableHandleProps {
  /** Accessible name of the handle. Defaults to `'Reorder'` followed by the item's label. */
  label?: string
  /** Classes for the handle button. */
  className?: string
}

/** The props that make any button its item's drag handle: keyboard focus, the pointer grab and an accessible name. */
function useSortableHandle(label?: string) {
  const item = useContext(SortableItemContext)
  if (!item) throw new Error('A Sortable handle must sit inside a Sortable item.')
  return {
    ...item.focusProps,
    'aria-label': label ?? `Reorder ${item.label}`,
    onPointerDown: (e: PointerEvent) => item.controls.start(e),
  }
}

/** The grip that drags its item, when the list has `handle`. It also takes the item's keyboard focus. */
function SortableHandle({ label, className }: SortableHandleProps) {
  const handleProps = useSortableHandle(label)
  const size = useSize()
  const Grip = useIcon('grip-vertical')

  return (
    <button
      type="button"
      {...handleProps}
      className={cn(
        'flex shrink-0 cursor-grab touch-none items-center justify-center rounded-glyph text-muted-foreground transition-[color] duration-fast hover:text-foreground active:cursor-grabbing',
        FOCUS_RING,
        className,
      )}
    >
      <Grip size={size.icon} strokeWidth={1.5} />
    </button>
  )
}

interface SortableProps {
  /** Every entry, in any order: `{ id, label, content? }`. `label` is announced and shown when there is no `content`. */
  items: SortableItem[]
  /** Controlled order, as item ids. Pair with `onOrderChange`. */
  order?: string[]
  /** Initial order, for an uncontrolled list. Defaults to the order of `items`. */
  defaultOrder?: string[]
  /** Called with the new order of ids after every move. */
  onOrderChange?: (order: string[]) => void
  /** Which way the list runs, and which arrows move an item. Defaults to `'vertical'`. */
  orientation?: SortableOrientation
  /** The list's element. `'none'` renders plain boxes with no role, for rows that are a host list's own items (a `Sidebar.Menu`'s rows). Defaults to `'ul'`. */
  as?: SortableAs
  /** Drag only by each item's `Sortable.Handle` (which also takes keyboard focus) instead of the whole item. Defaults to `false`. */
  handle?: boolean
  /** Accessible name of the list (ignored with `as="none"`: name the host list). */
  label?: string
  /** Classes for the list. */
  className?: string
  /** Classes for every item. */
  itemClassName?: string
}

/**
 * Drag to reorder a list, with the pointer or the keyboard.
 *
 * Grab an item and the others make room as it passes, sliding on the
 * moderate spring; the item you hold lifts one surface step off the list.
 * From the keyboard, focus an item (or its handle) and press Space to lift
 * it, the arrow keys to move it, Space again to drop it, or Escape to put it
 * back where it was; each step is announced. With `handle`, only the grip
 * drags, so the rest of the row can hold buttons and text to select. Works
 * controlled (`order` + `onOrderChange`) or uncontrolled (`defaultOrder`).
 *
 * Statics:
 * - `Sortable.Handle` — the grip inside an item's `content`, for a list with
 *   `handle`: `label`, `className`.
 *
 * `useSortableHandle(label?)` returns the same wiring as props, to spread on
 * a button of your own (a sidebar row's action). With `as="none"` the list
 * and its items are plain boxes with no role, so a host list's rows (a
 * `Sidebar.Menu`'s items) can be the ones that move.
 *
 * @example {@include ./examples.mdx}
 */
const Sortable = Object.assign(
  function Sortable({
    items,
    order,
    defaultOrder,
    onOrderChange,
    orientation = 'vertical',
    as = 'ul',
    handle = false,
    label,
    className,
    itemClassName,
  }: SortableProps) {
    const [ids, setIds] = useControllableState(order, defaultOrder ?? items.map(item => item.id), onOrderChange)
    const [lifted, setLifted] = useState<{ id: string; from: string[] } | null>(null)
    const [dragging, setDragging] = useState<string | null>(null)
    const [announcement, setAnnouncement] = useState('')
    const targets = useRef(new Map<string, HTMLElement>())
    const reduced = useReduceMotion()
    const hintId = useId()
    const horizontal = orientation === 'horizontal'
    const byId = new Map(items.map(item => [item.id, item]))
    const labelOf = (id: string) => byId.get(id)?.label ?? id
    const position = (list: string[], id: string) => `position ${list.indexOf(id) + 1} of ${list.length}`

    // A move re-inserts the lifted node, which drops its focus.
    useLayoutEffect(() => {
      if (lifted) targets.current.get(lifted.id)?.focus({ preventScroll: true })
    }, [ids, lifted])

    const onKeyDown = (id: string) => (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (lifted) {
          setLifted(null)
          setAnnouncement(`Dropped ${labelOf(id)} at ${position(ids, id)}.`)
        } else {
          setLifted({ id, from: ids })
          setAnnouncement(
            `Lifted ${labelOf(id)}, ${position(ids, id)}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
          )
        }
        return
      }
      if (!lifted) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setIds(lifted.from)
        setLifted(null)
        setAnnouncement(`Cancelled. ${labelOf(id)} is back at ${position(lifted.from, id)}.`)
        return
      }

      const back = horizontal ? 'ArrowLeft' : 'ArrowUp'
      const forward = horizontal ? 'ArrowRight' : 'ArrowDown'
      if (e.key !== back && e.key !== forward) return
      e.preventDefault()
      const from = ids.indexOf(id)
      const to = from + (e.key === forward ? 1 : -1)
      if (to < 0 || to >= ids.length) return
      const next = [...ids]
      next.splice(from, 1)
      next.splice(to, 0, id)
      setIds(next)
      setAnnouncement(`Moved ${labelOf(id)} to ${position(next, id)}.`)
    }

    const onBlur = (e: FocusEvent) => {
      // A null related target is the move re-inserting the node; anything else is the user leaving.
      if (lifted && e.relatedTarget) setLifted(null)
    }

    const live = (
      <>
        <span id={hintId} className="sr-only">
          Press Space to lift, the arrow keys to move, Space to drop.
        </span>
        <span aria-live="assertive" className="sr-only">
          {announcement}
        </span>
      </>
    )

    return (
      <>
        <Reorder.Group
          axis={horizontal ? 'x' : 'y'}
          values={ids}
          onReorder={setIds}
          as={as === 'none' ? 'div' : as}
          role={as === 'none' ? 'none' : undefined}
          // A name would override `role="none"` and turn the box back into a group.
          aria-label={as === 'none' ? undefined : label}
          className={cn('relative flex', horizontal ? 'flex-row' : 'flex-col', className)}
        >
          {ids.map(id => (
            <Row
              key={id}
              id={id}
              item={byId.get(id)}
              handle={handle}
              bare={as === 'none'}
              raised={lifted?.id === id || dragging === id}
              transition={reduced ? STILL : MOVE}
              hintId={hintId}
              focusRef={node => {
                if (node) targets.current.set(id, node)
                else targets.current.delete(id)
              }}
              onKeyDown={onKeyDown(id)}
              onBlur={onBlur}
              onDragStart={() => setDragging(id)}
              onDragEnd={() => setDragging(null)}
              className={itemClassName}
            />
          ))}
          {/* Inside a host list the box is the only place that isn't the list itself. */}
          {as === 'none' && live}
        </Reorder.Group>
        {as !== 'none' && live}
      </>
    )
  },
  { Handle: SortableHandle },
)

interface RowProps {
  id: string
  item?: SortableItem
  handle: boolean
  bare: boolean
  raised: boolean
  transition: typeof MOVE | typeof STILL
  hintId: string
  focusRef: (node: HTMLElement | null) => void
  onKeyDown: (e: KeyboardEvent) => void
  onBlur: (e: FocusEvent) => void
  onDragStart: () => void
  onDragEnd: () => void
  className?: string
}

function Row({
  id,
  item,
  handle,
  bare,
  raised,
  transition,
  hintId,
  focusRef,
  onKeyDown,
  onBlur,
  onDragStart,
  onDragEnd,
  className,
}: RowProps) {
  const controls = useDragControls()
  const shape = useShape()
  const substrate = useSurface()
  const level = useLift(2)
  const label = item?.label ?? id
  const focusProps = {
    ref: focusRef,
    tabIndex: 0,
    'aria-roledescription': 'sortable',
    'aria-describedby': hintId,
    onKeyDown,
    onBlur,
  }

  return (
    <Reorder.Item
      value={id}
      as={bare ? 'div' : 'li'}
      role={bare ? 'none' : undefined}
      dragListener={!handle}
      dragControls={controls}
      transition={transition}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      {...(handle ? {} : focusProps)}
      className={cn(
        'relative transition-[background-color,box-shadow] duration-fast',
        shape.item,
        !handle && cn('cursor-grab touch-none select-none active:cursor-grabbing', FOCUS_RING),
        raised && cn('z-10', SURFACE_BG[level], SURFACE_SHADOW[3]),
        className,
      )}
    >
      <SurfaceProvider value={raised ? level : substrate}>
        <SortableItemContext.Provider value={{ controls, label, focusProps }}>
          {item?.content ?? label}
        </SortableItemContext.Provider>
      </SurfaceProvider>
    </Reorder.Item>
  )
}

export type { SortableAs, SortableHandleProps, SortableItem, SortableOrientation, SortableProps }
export { Sortable, SortableHandle, useSortableHandle }

export default Sortable
