// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/accordion.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*`,
 *   `@/hooks/*` and `@/components/ui/fluid-hover-highlight` → `../../lib/*`,
 *   except `SizeProvider` → `../../primitives/sizes`.
 * - Open state (Accordion and AccordionGroup) runs through
 *   `useControllableState`, the Base UI contract: `value` controls, otherwise
 *   the accordion keeps its own state from `defaultValue` and still reports
 *   every change to `onValueChange`. Upstream treated `onValueChange` alone
 *   as controlled, so an uncontrolled accordion with a listener never opened.
 * - Standalone `Accordion` accepts `highlight` (the FF API table lists it on
 *   the root) and hands it to its items through context as their default;
 *   `AccordionItem`'s own `highlight` still wins.
 * - Prop JSDoc rewritten from the FF docs API tables; modo TSDoc and
 *   examples on `Accordion`.
 * - Compound statics `Accordion.Group/.Item/.Trigger/.Content` attached with
 *   `Object.assign`, typed through an `AccordionComponent` cast on the
 *   forwardRef. Upstream's named exports are kept.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-*`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 * - The panel morphs out of its row instead of springing its height (local
 *   morph language, see `primitives/morph`): one progress value grows a shape
 *   from the press point in the row (its middle for a keyboard open) to the
 *   whole item, the content is revealed by a clip from the same rect, and the
 *   panel's layout height follows the shape's bottom edge, so the rows below
 *   flow with it. Under `highlight="item"` the open tint is that shape, melted
 *   into the row through the shared `GooFilter`; it lives in
 *   `AccordionContent` now (the group draws only the `"trigger"` tint), and
 *   the hover fills sit one layer above it. The group's hover highlight and
 *   focus ring snap with rows a morph pushes around (instead of springing
 *   after them over the content) until the pointer or focus moves. `effect`
 *   and `tier` on `AccordionContent`; reduced motion snaps, as before.
 */

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useReducedMotionConfig,
  useTransform,
} from 'motion/react'
import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

// SSR-safe layout effect (client components still server-render in Next).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

import { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
import { useIcon } from '../../lib/icon-context'
import { GooFilter } from '../../lib/morph-layers'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { useControllableState } from '../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../lib/use-fluid-hover'
import { GOO_BLUR_RATIO } from '../../lib/use-morph'
import { cn } from '../../lib/utils'
import { SizeProvider } from '../../primitives/sizes'

// ─── Contexts ────────────────────────────────────────────────────────────────

interface ItemRect {
  top: number
  left: number
  width: number
  height: number
}

interface AccordionGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  registerFullItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  grouped: true
  remeasure: () => void
  openValues: Set<string>
  openItemRects: Map<number, ItemRect>
  /** The group's choice; its items draw the `"item"` tint themselves. */
  highlight: 'trigger' | 'item'
  /** A closed row is hovered: open tints step back. */
  dimOpen: boolean
}

const AccordionGroupContext = createContext<AccordionGroupContextValue | null>(null)

function useAccordionGroup() {
  return useContext(AccordionGroupContext)
}

interface AccordionItemContextValue {
  index?: number
  value: string
  isOpen: boolean
  triggerRef: React.MutableRefObject<HTMLDivElement | null>
  /** Standalone items carry the group's choice themselves. */
  highlight: 'trigger' | 'item'
  /** Where the row was last pressed, in px from its left edge; the panel grows from there. */
  press: React.MutableRefObject<number | null>
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

function useAccordionItemContext() {
  const ctx = useContext(AccordionItemContext)
  if (!ctx) throw new Error('AccordionTrigger/AccordionContent must be used within an AccordionItem')
  return ctx
}

// ─── AccordionGroup ──────────────────────────────────────────────────────────

type AccordionGroupSingleProps = {
  /** Whether one or multiple items can be expanded. Defaults to `"single"`. */
  type?: 'single'
  /** Controlled expanded value. */
  value?: string
  /** Initially expanded item value — uncontrolled. */
  defaultValue?: string
  /** Callback when expanded state changes. */
  onValueChange?: (value: string) => void
  /** Allow collapsing all items when type is single. Defaults to `true`. */
  collapsible?: boolean
}

type AccordionGroupMultipleProps = {
  /** Whether one or multiple items can be expanded. */
  type: 'multiple'
  /** Controlled expanded values. */
  value?: string[]
  /** Initially expanded item values — uncontrolled. */
  defaultValue?: string[]
  /** Callback when expanded state changes. */
  onValueChange?: (value: string[]) => void
}

type AccordionGroupProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  /** Pins the group's rows to one step of the size ladder (default 36px,
   *  compact 28px — see /docs/sizes). Omitted, they follow the surrounding
   *  SizeProvider. */
  size?: SizeVariant
  /** What an open item tints. "item" paints the row and its panel as one
   *  block, and holds while it stays open. "trigger" scopes the fill to the
   *  row and shows it on hover only, leaving the panel on the page's own
   *  surface — the way a sidebar row highlights without colouring its
   *  sub-tree. @default "item" */
  highlight?: 'trigger' | 'item'
} & (AccordionGroupSingleProps | AccordionGroupMultipleProps)

const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProps>((props, ref) => {
  const { children, highlight = 'item', type = 'single', size, className, ...rest } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const fullItemElementsRef = useRef<Map<number, HTMLElement>>(new Map())
  const [openItemRects, setOpenItemRects] = useState<Map<number, ItemRect>>(new Map())
  const openItemRectsRef = useRef(openItemRects)

  const hover = useFluidHover(containerRef)
  const { activeIndex, setActiveIndex, itemRects, handlers, registerItem, measureItems } = hover

  const registerFullItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      fullItemElementsRef.current.set(index, element)
    } else {
      fullItemElementsRef.current.delete(index)
    }
  }, [])

  const measureFullItems = useCallback(() => {
    if (!containerRef.current) return
    const next = new Map<number, ItemRect>()
    fullItemElementsRef.current.forEach((el, idx) => {
      next.set(idx, {
        top: el.offsetTop,
        left: el.offsetLeft,
        width: el.offsetWidth,
        height: el.offsetHeight,
      })
    })
    // Skip the state update when nothing moved (mirrors the fluid hover
    // hook's measureItems guard) — this runs per animation frame via
    // onUpdate, and an unconditional set would invalidate the group
    // context and re-render every item even on no-op remeasures.
    const prev = openItemRectsRef.current
    let changed = prev.size !== next.size
    if (!changed) {
      for (const [idx, r] of next) {
        const p = prev.get(idx)
        if (!p || p.top !== r.top || p.left !== r.left || p.width !== r.width || p.height !== r.height) {
          changed = true
          break
        }
      }
    }
    if (!changed) return
    openItemRectsRef.current = next
    setOpenItemRects(next)
  }, [])

  // Local: controlled while `value` is set, else own state seeded from
  // `defaultValue` — `onValueChange` reports either way (Base UI contract).
  const sp = props as AccordionGroupSingleProps
  const mp = props as AccordionGroupMultipleProps
  const [singleValue, setSingleValue] = useControllableState<string>(
    type === 'single' ? sp.value : undefined,
    type === 'single' ? (sp.defaultValue ?? '') : '',
    type === 'single' ? sp.onValueChange : undefined,
  )
  const [multipleValue, setMultipleValue] = useControllableState<string[]>(
    type === 'multiple' ? mp.value : undefined,
    type === 'multiple' ? (mp.defaultValue ?? []) : [],
    type === 'multiple' ? mp.onValueChange : undefined,
  )

  const openValuesList: string[] = type === 'multiple' ? multipleValue : singleValue ? [singleValue] : []

  // Keyed on the joined values so the Set (and the group context value
  // below) keeps a stable identity across re-renders where the open values
  // haven't actually changed.
  const openValuesKey = openValuesList.join(',')

  const openValues = useMemo(
    () => new Set(openValuesList),
    // Deliberately keyed on the joined string, not the (fresh) array.
    [openValuesKey],
  )

  const handleSingleValueChange = setSingleValue
  const handleMultipleValueChange = setMultipleValue

  useEffect(() => {
    measureItems()
    measureFullItems()
  }, [measureItems, measureFullItems, children])

  useEffect(() => {
    measureItems()
    measureFullItems()
  }, [measureItems, measureFullItems, openValuesKey])

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null
  // "trigger" tints the open row only while you're on it: the panel below
  // already says the item is open, so the fill goes back to being a hover
  // affordance rather than a persistent state. The trigger rects are the
  // ones fluid hover already tracks. Local: the "item" block is drawn by each
  // item's content, as the shape its panel morphs out of.
  const expandedRects =
    highlight === 'trigger'
      ? new Map(
          [...openItemRects.keys()].flatMap(idx => {
            const rect = idx === activeIndex ? itemRects[idx] : null
            return rect ? ([[idx, rect]] as [number, ItemRect][]) : []
          }),
        )
      : new Map<number, ItemRect>()

  const isHoveringNonOpen = activeIndex !== null && !openItemRects.has(activeIndex)
  const shape = useShape()

  const {
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    collapsible: _collapsible,
    type: _type,
    ...htmlProps
  } = rest as Record<string, unknown>

  // Translate FF API → Base UI Accordion API.
  // Base UI always uses `value: string[]` and a `multiple: boolean`. In
  // single mode we wrap the active value in a single-element array.
  const baseValue: string[] = openValuesList

  const baseOnValueChange = (next: string[]) => {
    if (type === 'multiple') handleMultipleValueChange(next)
    else handleSingleValueChange(next[0] ?? '')
  }

  // Local: rows a morphing panel pushes around carry the hover highlight and
  // the focus ring with them (a snap, not a spring chasing them), until the
  // pointer or the focus moves again.
  const [reflowing, setReflowing] = useState(false)
  const remeasure = useCallback(() => {
    setReflowing(true)
    measureItems()
    measureFullItems()
  }, [measureItems, measureFullItems])

  // Memoized: the group re-renders on every fluid-hover mousemove; a
  // fresh context object each time would re-render every item with it.
  const groupContextValue = useMemo<AccordionGroupContextValue>(
    () => ({
      registerItem,
      registerFullItem,
      activeIndex,
      grouped: true,
      remeasure,
      openValues,
      openItemRects,
      highlight,
      dimOpen: isHoveringNonOpen,
    }),
    [registerItem, registerFullItem, activeIndex, remeasure, openValues, openItemRects, highlight, isHoveringNonOpen],
  )

  const group = (
    <AccordionGroupContext.Provider value={groupContextValue}>
      <AccordionPrimitive.Root
        value={baseValue}
        onValueChange={baseOnValueChange}
        multiple={type === 'multiple'}
        render={rootProps => {
          const {
            style: _baseStyle,
            onDrag: _onDrag,
            onDragStart: _onDragStart,
            onDragEnd: _onDragEnd,
            onAnimationStart: _onAnimationStart,
            onAnimationEnd: _onAnimationEnd,
            onAnimationIteration: _onAnimationIteration,
            ...restRoot
          } = rootProps as React.HTMLAttributes<HTMLDivElement>
          return (
            <div
              {...restRoot}
              ref={node => {
                ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
                if (typeof ref === 'function') ref(node)
                else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
              }}
              onMouseEnter={handlers.onMouseEnter}
              onMouseMove={e => {
                setReflowing(false)
                const container = containerRef.current
                if (container) {
                  const cRect = container.getBoundingClientRect()
                  const layoutH = container.offsetHeight
                  const visualH = cRect.height
                  const scale = layoutH > 0 ? visualH / layoutH : 1
                  const localY = (e.clientY - cRect.top) / scale + container.scrollTop
                  for (const [idx, full] of openItemRects) {
                    const trigger = itemRects[idx]
                    if (!trigger) continue
                    const contentTop = trigger.top + trigger.height
                    const contentBottom = full.top + full.height
                    if (localY >= contentTop && localY <= contentBottom) {
                      setActiveIndex(null)
                      return
                    }
                  }
                }
                handlers.onMouseMove(e)
              }}
              onMouseLeave={handlers.onMouseLeave}
              onFocus={e => {
                setReflowing(false)
                const indexAttr = (e.target as HTMLElement)
                  .closest('[data-fluid-hover-index]')
                  ?.getAttribute('data-fluid-hover-index')
                if (indexAttr != null) {
                  const idx = Number(indexAttr)
                  setActiveIndex(idx)
                  setFocusedIndex((e.target as HTMLElement).matches(':focus-visible') ? idx : null)
                }
              }}
              onBlur={e => {
                if (containerRef.current?.contains(e.relatedTarget as Node)) return
                setFocusedIndex(null)
                setActiveIndex(null)
              }}
              className={cn('relative flex flex-col w-72 max-w-full', className)}
              {...(htmlProps as HTMLAttributes<HTMLDivElement>)}
            >
              {/* Expanded item backgrounds */}
              <AnimatePresence>
                {[...expandedRects.entries()].map(([idx, rect]) => (
                  <motion.div
                    key={`expanded-${idx}`}
                    className={`absolute ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
                    // Fade in from the item's current rect: with initial={false}
                    // a newly-opened item's background would pop in at full
                    // opacity mid-layout-shift while the previous item's bg is
                    // still fading out — reads as a glitch when switching items
                    // (especially under /demo's scaled card). Geometry still
                    // snaps (duration 0) so the bg hugs the animating item.
                    initial={{
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                      opacity: 0,
                    }}
                    animate={{
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                      opacity: isHoveringNonOpen ? 0.7 : 1,
                    }}
                    exit={{ opacity: 0, transition: spring.moderate.exit }}
                    transition={{
                      top: { duration: 0 },
                      left: { duration: 0 },
                      width: { duration: 0 },
                      height: { duration: 0 },
                      opacity: { duration: spring.moderate.exit.duration },
                    }}
                  />
                ))}
              </AnimatePresence>

              {/* Hover background, one layer above the items' open tints */}
              <FluidHoverHighlight
                hover={hover}
                className={cn(shape.bg, 'z-1')}
                transition={reflowing ? false : undefined}
              />

              {/* Focus ring */}
              <AnimatePresence>
                {focusRect && (
                  <motion.div
                    className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-focus-ring`}
                    initial={false}
                    animate={{
                      left: focusRect.left - 2,
                      top: focusRect.top - 2,
                      width: focusRect.width + 4,
                      height: focusRect.height + 4,
                    }}
                    exit={{ opacity: 0, transition: spring.fast.exit }}
                    transition={{
                      ...(reflowing ? { duration: 0 } : spring.fast),
                      opacity: { duration: spring.fast.duration },
                    }}
                  />
                )}
              </AnimatePresence>

              {children}
            </div>
          )
        }}
      />
    </AccordionGroupContext.Provider>
  )

  // A size prop pins every row in the group to one ladder step.
  return size ? <SizeProvider size={size}>{group}</SizeProvider> : group
})

AccordionGroup.displayName = 'AccordionGroup'

// ─── Accordion (Standalone) ──────────────────────────────────────────────────

interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  /** The accordion's items (`Accordion.Item`). */
  children: ReactNode
  /** Whether one or multiple items can be expanded. Defaults to `"single"`. */
  type?: 'single' | 'multiple'
  /** Allow collapsing all items when type is single. Defaults to `true` (Base UI's single mode is always collapsible). */
  collapsible?: boolean
  /** Initially expanded item value(s) — uncontrolled. A string for `type="single"`, an array for `type="multiple"`. */
  defaultValue?: string | string[]
  /** Controlled expanded value(s). Pair with `onValueChange`. */
  value?: string | string[]
  /** Callback when expanded state changes. Receives a string in single mode, an array in multiple mode. */
  onValueChange?: ((value: string) => void) | ((value: string[]) => void)
  /** What an open item tints: `item` holds a block across the row and its panel, `trigger` scopes it to the row and shows it on hover. Same prop on `Accordion.Group` and on a standalone `Accordion.Item`. Defaults to `"item"`. */
  highlight?: 'trigger' | 'item'
  /** Pins the accordion's rows to one step of the size ladder (default 36px, compact 28px). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
}

type AccordionComponent = ForwardRefExoticComponent<AccordionProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof AccordionGroup
  Item: typeof AccordionItem
  Trigger: typeof AccordionTrigger
  Content: typeof AccordionContent
}

/**
 * Collapsible sections with animated expand/collapse and fluid hover in
 * grouped mode.
 *
 * Accordion is the standalone form: every row carries its own hover fill.
 * Accordion.Group takes the same props and adds one magnetic highlight that
 * glides between rows, so give each item inside it an `index`. Built on Base
 * UI Accordion (WAI-ARIA wiring, keyboard navigation, focus management).
 * Uncontrolled through `defaultValue`, controlled through `value` +
 * `onValueChange`.
 *
 * The panel grows out of its row (see Morph): a shape drips from where the
 * row was pressed (its middle, from the keyboard), widens into the whole
 * item, and the content is revealed by a clip from the same shape. Under the
 * default `highlight="item"` that shape is the open tint, melted into the
 * row through a liquid goo neck; closing folds it back into the row. The
 * rows below ride the shape's bottom edge, so nothing jumps.
 *
 * Statics: Accordion.Group (the grouped root: type, collapsible,
 * defaultValue, value, onValueChange, highlight, size), Accordion.Item (value,
 * index, disabled), Accordion.Trigger (the row that toggles its item) and
 * Accordion.Content (the collapsible panel: `effect` — `'goo'` or a plain
 * `'morph'` — and the spring `tier`, `'slow'` or `'moderate'`).
 *
 * @example {@include ./examples.mdx}
 */
const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      children,
      type = 'single',
      collapsible = true,
      defaultValue,
      value,
      onValueChange,
      highlight,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    void collapsible // Base UI's single-mode is always collapsible.

    // Local: controlled while `value` is set, else own state seeded from
    // `defaultValue` — `onValueChange` reports either way (Base UI contract).
    const [singleValue, setSingleValue] = useControllableState<string>(
      type === 'single' ? (value as string | undefined) : undefined,
      type === 'single' ? ((defaultValue as string | undefined) ?? '') : '',
      type === 'single' ? (onValueChange as ((v: string) => void) | undefined) : undefined,
    )
    const [multipleValue, setMultipleValue] = useControllableState<string[]>(
      type === 'multiple' ? (value as string[] | undefined) : undefined,
      type === 'multiple' ? ((defaultValue as string[] | undefined) ?? []) : [],
      type === 'multiple' ? (onValueChange as ((v: string[]) => void) | undefined) : undefined,
    )

    const openValues = new Set<string>(type === 'multiple' ? multipleValue : singleValue ? [singleValue] : [])

    const handleSingleChange = setSingleValue
    const handleMultipleChange = setMultipleValue

    const baseValue: string[] = [...openValues]

    const baseOnValueChange = (next: string[]) => {
      if (type === 'multiple') handleMultipleChange(next)
      else handleSingleChange(next[0] ?? '')
    }

    const root = (
      <AccordionPrimitive.Root
        value={baseValue}
        onValueChange={baseOnValueChange}
        multiple={type === 'multiple'}
        render={rootProps => {
          const { style: _s, ...restRoot } = rootProps as React.HTMLAttributes<HTMLDivElement>
          return (
            <div {...restRoot} ref={ref} className={cn('w-72 max-w-full flex flex-col', className)} {...props}>
              <StandaloneOpenContext.Provider value={openValues}>
                <StandaloneHighlightContext.Provider value={highlight}>{children}</StandaloneHighlightContext.Provider>
              </StandaloneOpenContext.Provider>
            </div>
          )
        }}
      />
    )

    // A size prop pins every row to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root
  },
) as AccordionComponent

Accordion.displayName = 'Accordion'

const StandaloneOpenContext = createContext<Set<string>>(new Set())

// Local: the standalone root's `highlight`, the default for its items.
const StandaloneHighlightContext = createContext<'trigger' | 'item' | undefined>(undefined)

// ─── AccordionItem ───────────────────────────────────────────────────────────

interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Unique identifier for this item. */
  value: string
  /** Position index for fluid hover. Required inside `Accordion.Group`, omit for standalone. */
  index?: number
  /** Whether this item is disabled. Defaults to `false`. */
  disabled?: boolean
  /** Standalone equivalent of the group's prop: what an open item tints. Ignored inside a group, which decides for all its rows. Defaults to the standalone root's `highlight`, else `"item"`. */
  highlight?: 'trigger' | 'item'
  /** The item's `Accordion.Trigger` and `Accordion.Content`. */
  children: ReactNode
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, index, disabled, highlight: highlightProp, children, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const groupCtx = useAccordionGroup()
    const standaloneOpen = useContext(StandaloneOpenContext)
    const standaloneHighlight = useContext(StandaloneHighlightContext)
    const highlight = groupCtx ? groupCtx.highlight : (highlightProp ?? standaloneHighlight ?? 'item')

    const isOpen = groupCtx?.grouped ? groupCtx.openValues.has(value) : standaloneOpen.has(value)

    const triggerRef = useRef<HTMLDivElement>(null)
    const press = useRef<number | null>(null)

    useRegisterFluidHoverItem(groupCtx?.grouped ? groupCtx.registerItem : undefined, index, triggerRef)

    useEffect(() => {
      if (groupCtx?.grouped && index !== undefined) {
        if (isOpen) {
          groupCtx.registerFullItem(index, internalRef.current)
        } else {
          groupCtx.registerFullItem(index, null)
        }
        return () => groupCtx.registerFullItem(index, null)
      }
    }, [index, groupCtx, isOpen])

    return (
      <AccordionItemContext.Provider value={{ index, value, isOpen, triggerRef, highlight, press }}>
        <AccordionPrimitive.Item
          value={value}
          disabled={disabled}
          render={itemProps => {
            const { style: _s, ...restItem } = itemProps as React.HTMLAttributes<HTMLDivElement>
            return (
              <div
                {...restItem}
                ref={node => {
                  ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node
                  if (typeof ref === 'function') ref(node)
                  else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
                }}
                data-fluid-hover-index={index}
                // Positioned in a group too: the content's open tint covers
                // the whole item (fluid hover adds positioned ancestors'
                // offsets, so the row rects don't move).
                className={cn('relative', className)}
                {...props}
              >
                {children}
              </div>
            )
          }}
        />
      </AccordionItemContext.Provider>
    )
  },
)

AccordionItem.displayName = 'AccordionItem'

// ─── AccordionTrigger ────────────────────────────────────────────────────────

interface AccordionTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  /** Trigger label content. */
  children: ReactNode
}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const ChevronRight = useIcon('chevron-right')
    const groupCtx = useAccordionGroup()
    const { index, isOpen, triggerRef, highlight, press } = useAccordionItemContext()
    const shape = useShape()
    const sizeClasses = useSize()
    const [isHovered, setIsHovered] = useState(false)

    const isActive = groupCtx?.grouped ? groupCtx.activeIndex === index : isHovered

    // In layout px, so a scaled ancestor doesn't move the source.
    const capture = (event: React.PointerEvent<HTMLDivElement>) => {
      const row = event.currentTarget
      const box = row.getBoundingClientRect()
      press.current = ((event.clientX - box.left) * row.offsetWidth) / box.width
    }

    const triggerContent = (
      // Render Header as a <div>. Base UI's Header defaults to <h3>, which
      // would be more semantic but breaks the ancestor selectors the styles
      // rely on.
      <AccordionPrimitive.Header render={<div />}>
        <AccordionPrimitive.Trigger
          ref={ref as React.Ref<HTMLElement>}
          className={cn(
            `relative z-10 flex items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} ${sizeClasses.variant === 'compact' ? 'py-1' : 'py-2'} w-full cursor-pointer outline-none select-none`,
            !groupCtx?.grouped && 'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-0',
            className,
          )}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {/* Label with dual-layer text */}
          <span className={cn('inline-grid flex-1 text-left', sizeClasses.text)}>
            <span className="col-start-1 row-start-1 invisible weight-semibold" aria-hidden="true">
              {children}
            </span>
            <span
              className={cn(
                'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast',
                isOpen || isActive ? 'text-foreground' : 'text-muted-foreground',
                isOpen ? 'weight-semibold' : 'weight-normal',
              )}
            >
              {children}
            </span>
          </span>

          {/* Chevron */}
          <motion.span
            className="shrink-0 inline-flex items-center justify-center"
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={spring.fast}
          >
            <ChevronRight
              size={sizeClasses.icon}
              strokeWidth={isOpen || isActive ? 2 : 1.5}
              className={cn(
                'transition-[color,stroke-width] duration-fast',
                isOpen || isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </motion.span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    )

    if (groupCtx?.grouped) {
      return (
        <div ref={triggerRef} onPointerDown={capture}>
          {triggerContent}
        </div>
      )
    }

    return (
      <div
        className="relative"
        onPointerDown={capture}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Open tint, scoped to this row: the panel below keeps the page's
            own surface, the way a sidebar row highlights without colouring
            its sub-tree. */}
        <AnimatePresence>
          {isOpen && highlight === 'trigger' && isHovered && (
            <motion.div
              className={`absolute inset-0 ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              // The expanded tint rides the moderate tier, like the grouped
              // one — it marks a state, where the hover fill below tracks the
              // pointer and stays fast.
              exit={{ opacity: 0, transition: spring.moderate.exit }}
              transition={{ duration: spring.moderate.exit.duration }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className={`absolute inset-0 z-1 ${shape.bg} bg-hover pointer-events-none`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ duration: spring.fast.duration }}
            />
          )}
        </AnimatePresence>
        {triggerContent}
      </div>
    )
  },
)

AccordionTrigger.displayName = 'AccordionTrigger'

// ─── AccordionContent ────────────────────────────────────────────────────────

interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Collapsible content. */
  children: ReactNode
  /** How the panel grows out of its row (see Morph): `goo` melts the open tint out of the row through a liquid neck, `morph` grows it without one. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph'
  /** Spring tier the panel opens on; it closes on the tier's faster exit tween. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

// The morph engine's rect interpolation (lib/use-morph.ts). `t` stops at 1:
// the slow tier's bounce would push the rows below past their place and back.
function grow(a: Rect, b: Rect, t: number): Rect {
  const at = (from: number, to: number) => from + (to - from) * Math.min(1, t)
  const w = at(a.w, b.w)
  const h = at(a.h, b.h)
  return { x: at(a.x, b.x), y: at(a.y, b.y), w, h, r: Math.min(at(a.r, b.r), w / 2, h / 2) }
}

function place(el: HTMLElement | null, { x, y, w, h, r }: Rect) {
  if (!el) return
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.style.borderRadius = `${r}px`
}

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, effect = 'goo', tier = 'slow', ...props }, ref) => {
    const groupCtx = useAccordionGroup()
    const { isOpen, highlight, press } = useAccordionItemContext()
    const shape = useShape()
    const sizeClasses = useSize()
    // The OS setting as well as MotionConfig's: the panel's height is layout,
    // which a consumer without a MotionConfig would otherwise animate for a
    // reduced-motion user.
    const reduceOS = useReducedMotion() ?? false
    const reduceConfig = useReducedMotionConfig()
    const reduceMotion = reduceOS || reduceConfig
    const gooId = `accordion-goo-${useId().replace(/:/g, '')}`
    const progress = useMotionValue(isOpen ? 1 : 0)
    // The tint is there for most of the morph and fades only as the shape
    // gets back into the row, so the shape, not a fade, carries the motion.
    const tint = useTransform(progress, [0, 0.3], [0, 1])
    const tinted = highlight === 'item'
    const remeasure = useRef(groupCtx?.remeasure)
    remeasure.current = groupCtx?.remeasure

    const refs = {
      panel: useRef<HTMLDivElement>(null),
      content: useRef<HTMLDivElement>(null),
      rest: useRef<HTMLDivElement>(null),
      goo: useRef<HTMLDivElement>(null),
      row: useRef<HTMLDivElement>(null),
      shape: useRef<HTMLDivElement>(null),
    }
    useImperativeHandle(ref, () => refs.panel.current as HTMLDivElement, [])

    // In the item's own coordinates: `x` is the source's left edge, `row`
    // the trigger row's height (the panel's offsetTop), `body` the content's.
    const geometry = useRef({ x: 0, width: 0, row: 0, body: 0 })

    // One frame of the morph. The shape grows from a point in the middle of
    // the row to the whole item; the panel's layout height is the shape's
    // reach below the row, so the rows underneath move with its bottom edge,
    // and the content shows only inside the shape.
    const render = (p: number) => {
      const { x, width, row, body } = geometry.current
      const rect = grow(
        { x, y: row / 2, w: 0, h: 0, r: width },
        { x: 0, y: 0, w: width, h: row + body, r: shape.bgRadius },
        p,
      )
      const reach = rect.y + rect.h - row
      const { panel, content } = refs
      if (panel.current) panel.current.style.height = `${Math.max(0, reach)}px`
      if (content.current) {
        content.current.style.clipPath = `inset(${rect.y - row}px ${width - rect.x - rect.w}px ${body - reach}px ${rect.x}px round ${rect.r}px)`
      }
      place(refs.shape.current, rect)
      remeasure.current?.()
    }

    // Base UI's Panel would apply `hidden` the moment a controlled item
    // closes (no CSS animation for it to wait on) — `display: none` would
    // cut the morph off mid-flight. So the `hidden` attribute is ours, and
    // only lands once the close has finished.
    const [exitComplete, setExitComplete] = useState(!isOpen)
    if (isOpen && exitComplete) {
      // Reset during render so the panel is laid out before the opening
      // morph's first frame.
      setExitComplete(false)
    }

    // Back to rest: open, the panel's height and the tint are their classes
    // again (auto height, one block over the item), so they follow content
    // that resizes; closed, the panel goes `hidden`.
    const settle = (open: boolean) => {
      const { panel, content, goo, rest } = refs
      if (panel.current) panel.current.style.height = open ? '' : '0px'
      // Closed, the content stays clipped shut: `hidden` lands with React's
      // next commit, a task later, and unclipped content would paint below
      // the collapsed row for a frame in between.
      if (content.current) content.current.style.clipPath = open ? '' : 'inset(50%)'
      if (goo.current) goo.current.style.display = ''
      if (rest.current) rest.current.style.display = ''
      remeasure.current?.()
      if (!open) setExitComplete(true)
    }

    const wasOpen = useRef(isOpen)
    useIsoLayoutEffect(() => {
      if (wasOpen.current === isOpen) return
      wasOpen.current = isOpen
      const { panel, content, goo, rest, row } = refs
      if (!panel.current || !content.current) return
      const g = geometry.current
      g.width = panel.current.offsetWidth
      g.row = panel.current.offsetTop
      g.body = content.current.offsetHeight
      // A reopen mid-close keeps its source, so the shape never jumps.
      if (isOpen && progress.get() === 0) g.x = press.current ?? g.width / 2
      press.current = null

      if (reduceMotion) {
        progress.set(isOpen ? 1 : 0)
        settle(isOpen)
        return
      }
      if (goo.current) goo.current.style.display = 'block'
      if (rest.current) rest.current.style.display = 'none'
      if (row.current) row.current.style.height = `${g.row}px`
      render(progress.get())
      const { exit, ...enter } = spring[tier]
      const controls = animate(progress, isOpen ? 1 : 0, {
        ...(isOpen ? enter : exit),
        onUpdate: render,
        onComplete: () => settle(isOpen),
      })
      return () => controls.stop()
    }, [isOpen])

    // The content keeps its natural size while the panel morphs, so this
    // never feeds back: it retargets a running morph and, at rest, lets the
    // group re-measure rows a nested accordion pushed around.
    useIsoLayoutEffect(() => {
      const content = refs.content.current
      if (!content) return
      const observer = new ResizeObserver(() => {
        if (content.offsetHeight > 0) geometry.current.body = content.offsetHeight
        remeasure.current?.()
      })
      observer.observe(content)
      return () => observer.disconnect()
    }, [])

    // Render through `<AccordionPrimitive.Panel keepMounted>` so the panel
    // element persists through the close and the trigger ↔ panel ARIA
    // contract stays intact: the panel carries `role="region"`,
    // `aria-labelledby` and the id that the Trigger's `aria-controls` points
    // to.
    return (
      <AccordionPrimitive.Panel
        keepMounted
        render={panelProps => {
          const {
            hidden: _baseHidden,
            // Only carries the --accordion-panel-height/width vars, which
            // stay 'auto' since Base UI never measures JS-driven animations.
            style: _baseStyle,
            ...restPanel
          } = panelProps as React.HTMLAttributes<HTMLDivElement> & {
            hidden?: boolean
          }
          return (
            <div {...restPanel} hidden={!isOpen && exitComplete}>
              {/* Neither this nor the panel is positioned, so the tint
                  below covers the whole item (row + panel). */}
              <div ref={refs.panel} className={className} {...props}>
                {tinted && (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    initial={false}
                    animate={{ opacity: groupCtx?.dimOpen ? 0.7 : 1 }}
                    transition={{ duration: spring.moderate.exit.duration }}
                  >
                    <motion.div className="absolute inset-0" style={{ opacity: tint }}>
                      {/* The tint's strength: solid shapes, so the goo
                          threshold sees full alpha, faded as one layer. */}
                      <div className="absolute inset-0 opacity-20 dark:opacity-12">
                        <div ref={refs.rest} className={cn('absolute inset-0 bg-accent', shape.bg)} />
                        {effect === 'goo' && <GooFilter id={gooId} blur={shape.bgRadius * GOO_BLUR_RATIO} />}
                        {/* The filter is the effect itself: it melts the row and the growing shape into one. */}
                        <div
                          ref={refs.goo}
                          className="absolute inset-0 hidden"
                          style={effect === 'goo' ? { filter: `url(#${gooId})` } : undefined}
                        >
                          <div ref={refs.row} className={cn('absolute inset-x-0 top-0 bg-accent', shape.bg)} />
                          <div ref={refs.shape} className="absolute bg-accent" />
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                <div
                  ref={refs.content}
                  className={cn(
                    'relative pt-1 text-muted-foreground',
                    sizeClasses.px,
                    sizeClasses.text,
                    sizeClasses.variant === 'compact' ? 'pb-2.5' : 'pb-3',
                  )}
                >
                  {children}
                </div>
              </div>
            </div>
          )
        }}
      />
    )
  },
)

AccordionContent.displayName = 'AccordionContent'

// Compound statics: `<Accordion.Group>`, `<Accordion.Item>`, … (typed by the
// AccordionComponent cast on the forwardRef above).
Object.assign(Accordion, {
  Group: AccordionGroup,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
})

export { Accordion, AccordionContent, AccordionGroup, AccordionItem, AccordionTrigger }
export default Accordion
