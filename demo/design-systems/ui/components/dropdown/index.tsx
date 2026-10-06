// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/dropdown.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*` and
 *   `@/hooks/*` → `../../lib/*` (`SizeProvider` → `../../primitives/sizes`);
 *   `@/lib/elevated` → `../../primitives/surface`; `@/components/ui/scroll-area`
 *   → `../../primitives/scroll-area`; `@/components/ui/fluid-hover-highlight` →
 *   `../../lib/fluid-hover-highlight`; `@/components/ui/menu-item` and
 *   `@/components/ui/dropdown-search` → `./menu-item`, `./dropdown-search`
 *   (both vendored into this folder).
 * - Uncontrolled selection (Base UI's contract) on `Dropdown` and
 *   `Dropdown.Content`: `defaultCheckedIndex` / `defaultCheckedIndices` plus
 *   `onCheckedIndexChange` / `onCheckedIndicesChange`, through
 *   `useControllableState`. With a `default*` the panel owns the selection,
 *   so rows need no `checked` or `onSelect` of their own. `checkedIndex` /
 *   `checkedIndices` keep working exactly as upstream.
 * - Uncontrolled search: `Dropdown.Search` with `filter` hands the query to
 *   the panel, which drops the `Dropdown.Item` rows whose `label` doesn't
 *   match, re-indexes the survivors for fluid hover, and shows
 *   `Dropdown.Empty` only when nothing matched — the work the controlled
 *   form asks the consumer to do. Selection stays keyed on the authored
 *   index (`sourceIndex` on the row), so it survives re-indexing.
 * - `DropdownProps` members re-declared one per line with the FF docs
 *   API-table descriptions (modo's props table lists only members declared in
 *   the interface body).
 * - `items[next].focus()` guarded for `noUncheckedIndexedAccess`.
 * - Compound statics `Dropdown.Menu/.Trigger/.Content/.Item/.Label/
 *   .Separator/.Search/.Empty` attached with `Object.assign`, typed through a
 *   `DropdownComponent` cast on the forwardRef. Upstream's named exports are
 *   kept.
 * - modo item: TSDoc + examples from the FF "Dropdown" docs page (its
 *   "Create from the query" section is skipped — adding a row to the list is
 *   real consumer state, not something an uncontrolled panel can stand in
 *   for), and a default export.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 */

import type { MenuTriggerProps } from '@base-ui/react/menu'
import { Menu } from '@base-ui/react/menu'
import { AnimatePresence, motion } from 'motion/react'
import {
  Children,
  type ComponentProps,
  cloneElement,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
import { isDisabledRow, popupMotionClass, popupScrollAreaClass, popupViewportClass } from '../../lib/popup'
import { shapeMap } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { exitFallbackMs, spring } from '../../lib/springs'
import { useControllableState } from '../../lib/use-controllable-state'
import { type ItemRect, useFluidHover } from '../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../lib/use-merge-split'
import { cn } from '../../lib/utils'
import { ScrollArea } from '../../primitives/scroll-area'
import { SizeProvider } from '../../primitives/sizes'
import { Elevated } from '../../primitives/surface'
import {
  DropdownEmpty,
  DropdownFilterContext,
  type DropdownFilterContextValue,
  DropdownSearch,
  DropdownSearchHostContext,
  type DropdownSearchProps,
  useDropdownSearchHost,
} from './dropdown-search'
import {
  DropdownContext,
  type DropdownContextValue,
  MenuItem,
  type MenuItemRenderOptions,
  useDropdown,
  useDropdownMaybe,
} from './menu-item'

// Dropdown opts out of the global pill/rounded shape context — popover surfaces
// look cleaner with the smaller "rounded" radii regardless of how the rest of
// the UI is shaped (the heavy pill bubbling distorts perceived padding at this
// scale and produces the corner-shadow asymmetry).
const shape = shapeMap.rounded

// ---------------------------------------------------------------------------
// Panel context — shared by the inline Dropdown and the popup DropdownContent.
//
// The context object itself lives in menu-item.tsx so MenuItem resolves
// whichever dropdown provider actually wraps it, even when dropdowns built
// on different primitives render side by side. Re-exported here so the
// public dropdown API is unchanged.
// ---------------------------------------------------------------------------

export type { DropdownContextValue, MenuItemRenderOptions }
export { useDropdown, useDropdownMaybe }

// ---------------------------------------------------------------------------
// Uncontrolled selection and uncontrolled search (local additions)
//
// Both panels take the same pair of concerns, so both read them from here.
// ---------------------------------------------------------------------------

/* "Nothing checked", so useControllableState always sees a defined value
   while the caller drives the selection (`undefined` is what it reads as
   "uncontrolled"). */
const NONE = -1
const NO_INDICES: number[] = []
/* Stable empty rect list, so a closed popup's merge/split pass gets the same
   array every render instead of a fresh literal. */
const NO_RECTS: ItemRect[] = []

interface PanelSelectionProps {
  checkedIndex?: number
  defaultCheckedIndex?: number
  onCheckedIndexChange?: (index: number | undefined) => void
  checkedIndices?: number[]
  defaultCheckedIndices?: number[]
  onCheckedIndicesChange?: (indices: number[]) => void
}

/*
 * The panel's selection, in the two index spaces it lives in: every prop and
 * callback speaks the AUTHORED index (what a row was written with), while the
 * overlays and the row context speak the RENDERED index (what a filtering
 * panel re-indexed the visible rows to). They are the same list unless a
 * `Dropdown.Search filter` is dropping rows.
 */
function usePanelSelection(
  {
    checkedIndex,
    defaultCheckedIndex,
    onCheckedIndexChange,
    checkedIndices,
    defaultCheckedIndices,
    onCheckedIndicesChange,
  }: PanelSelectionProps,
  sourceOf: number[],
  filtering: boolean,
) {
  const [single, setSingle] = useControllableState<number>(
    defaultCheckedIndex === undefined ? (checkedIndex ?? NONE) : undefined,
    defaultCheckedIndex ?? NONE,
    index => onCheckedIndexChange?.(index === NONE ? undefined : index),
  )
  const [many, setMany] = useControllableState<number[]>(
    defaultCheckedIndices === undefined ? (checkedIndices ?? NO_INDICES) : undefined,
    defaultCheckedIndices ?? NO_INDICES,
    indices => onCheckedIndicesChange?.(indices),
  )

  const multiple = checkedIndices != null || defaultCheckedIndices != null
  // Only a `default*` makes the panel answer for rows that brought no
  // `checked` of their own.
  const selfManaged = defaultCheckedIndex !== undefined || defaultCheckedIndices !== undefined

  const toggleIndex = useCallback(
    (source: number) => {
      if (multiple) {
        setMany(prev =>
          prev.includes(source) ? prev.filter(i => i !== source) : [...prev, source].sort((a, b) => a - b),
        )
      } else {
        setSingle(source)
      }
    },
    [multiple, setMany, setSingle],
  )

  const renderedIndex = useMemo(() => {
    if (single === NONE) return undefined
    const i = filtering ? sourceOf.indexOf(single) : single
    return i === -1 ? undefined : i
  }, [single, filtering, sourceOf])

  const renderedIndices = useMemo(() => {
    if (!multiple) return undefined
    if (!filtering) return many
    return many.map(s => sourceOf.indexOf(s)).filter(i => i !== -1)
  }, [multiple, many, filtering, sourceOf])

  return {
    checkedIndex: renderedIndex,
    checkedIndices: renderedIndices,
    multiple,
    selfManaged,
    toggleIndex,
  }
}

interface PanelRows {
  /** What to render: the rows re-indexed and `Dropdown.Empty` dropped while
   *  anything matched, or the children untouched when nothing filters. */
  content: ReactNode
  /** Rendered index → authored index. Empty while nothing filters. */
  sourceOf: number[]
  filtering: boolean
  /** The query to publish to a `Dropdown.Search filter`, or null. */
  filterCtx: DropdownFilterContextValue | null
}

/*
 * Uncontrolled search. A `Dropdown.Search` with `filter` among the panel's
 * direct children hands the panel the query; the panel then keeps only the
 * rows (anything with a string `label` and a numeric `index` — MenuItem, or a
 * wrapper that forwards both) whose label contains it, re-indexes them from 0
 * for fluid hover, and stamps each with the index it was authored with so the
 * selection survives. `Dropdown.Empty` children are held back and rendered
 * only when no row matched.
 */
function usePanelRows(children: ReactNode): PanelRows {
  const [query, setQuery] = useState('')

  const filtering = useMemo(
    () =>
      Children.toArray(children).some(
        child =>
          isValidElement(child) &&
          child.type === DropdownSearch &&
          (child.props as { filter?: boolean }).filter === true,
      ),
    [children],
  )

  const filterCtx = useMemo(() => ({ query, setQuery }), [query])

  const { content, sourceOf } = useMemo(() => {
    if (!filtering) return { content: children, sourceOf: NO_INDICES }
    const needle = query.trim().toLowerCase()
    const rendered: ReactNode[] = []
    const empties: ReactNode[] = []
    const sources: number[] = []
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) {
        rendered.push(child)
        continue
      }
      if (child.type === DropdownEmpty) {
        empties.push(child)
        continue
      }
      const rowProps = child.props as { label?: unknown; index?: unknown }
      if (typeof rowProps.label !== 'string' || typeof rowProps.index !== 'number') {
        rendered.push(child)
        continue
      }
      if (needle && !rowProps.label.toLowerCase().includes(needle)) continue
      rendered.push(
        cloneElement(child as ReactElement<Record<string, unknown>>, {
          index: sources.length,
          sourceIndex: rowProps.index,
        }),
      )
      sources.push(rowProps.index)
    }
    if (sources.length === 0) rendered.push(...empties)
    return { content: rendered as ReactNode, sourceOf: sources }
  }, [children, filtering, query])

  return { content, sourceOf, filtering, filterCtx: filtering ? filterCtx : null }
}

// ---------------------------------------------------------------------------
// Dropdown (inline panel)
//
// An always-rendered panel — no trigger, positioning, or dismissal. Because it
// sits statically in the page it does NOT claim popup menu semantics: the
// container is a plain role="group" (pass `aria-label` to name it). The real
// role="menu" lives on the popup DropdownContent below, which Base UI wires to
// a trigger. Consumers who hand-roll a trigger around the inline panel get
// grouping semantics rather than a falsely-announced popup menu.
// ---------------------------------------------------------------------------

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  /** `Dropdown.Item` rows, plus `Dropdown.Label` and `Dropdown.Separator`. */
  children: ReactNode
  /** The checked row: drives the animated selected background and the rows' radio semantics. */
  checkedIndex?: number
  /** Uncontrolled twin of `checkedIndex`: the panel owns the selection, so rows need no `checked` or `onSelect` of their own. */
  defaultCheckedIndex?: number
  /** Called with the newly checked row, or `undefined` when nothing is checked. */
  onCheckedIndexChange?: (index: number | undefined) => void
  /** Multiple selection: the checked rows. Rows become checkbox items and contiguous runs share one merged background (see CheckboxGroup). */
  checkedIndices?: number[]
  /** Uncontrolled twin of `checkedIndices`: the panel toggles rows itself. */
  defaultCheckedIndices?: number[]
  /** Called with every checked row after a toggle. */
  onCheckedIndicesChange?: (indices: number[]) => void
  /** Pins the panel's rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
  /** Extra classes for the panel surface — it is 18rem wide by default. */
  className?: string
}

type DropdownComponent = ForwardRefExoticComponent<DropdownProps & RefAttributes<HTMLDivElement>> & {
  Menu: typeof DropdownMenu
  Trigger: typeof DropdownTrigger
  Content: typeof DropdownContent
  Item: typeof MenuItem
  Label: typeof DropdownLabel
  Separator: typeof DropdownSeparator
  Search: typeof DropdownSearch
  Empty: typeof DropdownEmpty
}

/**
 * A menu in two forms: an inline panel that sits in the page, or a popup on
 * any trigger you like.
 *
 * `Dropdown` is the inline panel — an elevated surface with the fluid hover
 * background gliding between rows, a selected background that springs to the
 * picked one, contiguous picks merging into a single block in multiple mode,
 * and an animated focus ring. `Dropdown.Menu` + `Dropdown.Trigger` +
 * `Dropdown.Content` is the same panel as a popup on Base UI's Menu, which
 * brings the positioning, dismissal, roving highlight, typeahead and
 * close-on-select. Both take `checkedIndex` / `checkedIndices` to be driven
 * from outside, or `defaultCheckedIndex` / `defaultCheckedIndices` to run
 * themselves — and a `Dropdown.Search` marked `filter` makes the panel own
 * the query too, keeping only the rows whose `label` matches and showing
 * `Dropdown.Empty` when none do.
 *
 * Statics: Dropdown.Menu (the popup root: open, defaultOpen, onOpenChange,
 * disabled), Dropdown.Trigger (render), Dropdown.Content (the popup panel),
 * Dropdown.Item (a row: index, label, icon, checked, onSelect, disabled),
 * Dropdown.Label, Dropdown.Separator, Dropdown.Search and Dropdown.Empty.
 *
 * @example {@include ./examples.mdx}
 */
const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      children,
      checkedIndex,
      defaultCheckedIndex,
      onCheckedIndexChange,
      checkedIndices,
      defaultCheckedIndices,
      onCheckedIndicesChange,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, setActiveIndex, itemRects, handlers, registerItem } = hover

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

    const rows = usePanelRows(children)
    const selection = usePanelSelection(
      {
        checkedIndex,
        defaultCheckedIndex,
        onCheckedIndexChange,
        checkedIndices,
        defaultCheckedIndices,
        onCheckedIndicesChange,
      },
      rows.sourceOf,
      rows.filtering,
    )

    const multiple = selection.multiple
    const checkedRect = !multiple && selection.checkedIndex != null ? itemRects[selection.checkedIndex] : null
    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null
    // Multiple: one merged block per contiguous run of checked rows.
    const runs = useSelectionRuns(selection.checkedIndices ?? NO_INDICES)
    const blocks = useMergeSplitBlocks(runs, itemRects, shape.bgRadius)
    const panelCtx = useMemo(
      () => ({
        registerItem,
        activeIndex,
        checkedIndex: selection.checkedIndex,
        multiple,
        checkedIndices: selection.checkedIndices,
        selfManaged: selection.selfManaged,
        toggleIndex: selection.toggleIndex,
      }),
      [
        registerItem,
        activeIndex,
        selection.checkedIndex,
        multiple,
        selection.checkedIndices,
        selection.selfManaged,
        selection.toggleIndex,
      ],
    )
    const panel = (
      <DropdownContext.Provider value={panelCtx}>
        <DropdownFilterContext.Provider value={rows.filterCtx}>
          <Elevated
            offset={2}
            shadowLevel={3}
            ref={node => {
              ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
            }}
            onMouseEnter={handlers.onMouseEnter}
            onMouseMove={handlers.onMouseMove}
            onMouseLeave={handlers.onMouseLeave}
            onClick={handlers.onClick}
            onFocus={e => {
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
            onKeyDown={e => {
              const items = Array.from(
                containerRef.current?.querySelectorAll(
                  '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
                ) ?? [],
              ) as HTMLElement[]
              const currentIdx = items.indexOf(e.target as HTMLElement)
              if (currentIdx === -1) return

              if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
                e.preventDefault()
                const next = ['ArrowDown', 'ArrowRight'].includes(e.key)
                  ? (currentIdx + 1) % items.length
                  : (currentIdx - 1 + items.length) % items.length
                items[next]?.focus()
              } else if (e.key === 'Home') {
                e.preventDefault()
                items[0]?.focus()
              } else if (e.key === 'End') {
                e.preventDefault()
                items[items.length - 1]?.focus()
              }
            }}
            role="group"
            className={cn(`relative flex flex-col w-72 max-w-full  p-1 select-none`, className)}
            {...props}
          >
            {/* Selected backgrounds — merged runs in multiple mode */}
            {multiple && <SelectionBackgrounds blocks={blocks} />}

            {/* Selected background */}
            <AnimatePresence>
              {checkedRect && (
                <motion.div
                  className={`absolute ${shape.bg} bg-active pointer-events-none`}
                  initial={false}
                  animate={{
                    top: checkedRect.top,
                    left: checkedRect.left,
                    width: checkedRect.width,
                    height: checkedRect.height,
                    opacity: 1,
                  }}
                  exit={{ opacity: 0, transition: spring.moderate.exit }}
                  transition={{
                    ...spring.moderate,
                    opacity: { duration: spring.fast.duration },
                  }}
                />
              )}
            </AnimatePresence>

            {/* Hover background */}
            <FluidHoverHighlight hover={hover} from={checkedRect} className={shape.bg} />

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
                    ...spring.fast,
                    opacity: { duration: spring.fast.duration },
                  }}
                />
              )}
            </AnimatePresence>

            {rows.content}
          </Elevated>
        </DropdownFilterContext.Provider>
      </DropdownContext.Provider>
    )

    // A size prop pins every row in the panel to one ladder step.
    return size ? <SizeProvider size={size}>{panel}</SizeProvider> : panel
  },
) as DropdownComponent

Dropdown.displayName = 'Dropdown'

// ---------------------------------------------------------------------------
// DropdownMenu (popup root)
//
// Built on Base UI's Menu primitive, which owns the trigger wiring,
// positioning (collision flipping, anchor tracking), dismissal (outside
// press, focus-out, Escape), roving highlight, typeahead, and close-on-select.
// This layer keeps the fluid-hover overlays and the
// spring open/close animation (via actionsRef deferred unmount) — the same
// verified pattern as select.tsx.
// ---------------------------------------------------------------------------

interface DropdownMenuActions {
  unmount: () => void
  close: () => void
}

interface DropdownMenuContextValue {
  open: boolean
  actionsRef: React.RefObject<DropdownMenuActions | null>
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) throw new Error('DropdownMenu compound components must be inside <DropdownMenu>')
  return ctx
}

interface DropdownMenuProps {
  /** `Dropdown.Trigger` and `Dropdown.Content`. */
  children: ReactNode
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state — uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Disables the menu. Defaults to `false`. */
  disabled?: boolean
  /** Pins trigger-side content and the portalled popup rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
}

function DropdownMenu({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  size,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp !== undefined ? openProp : internalOpen
  const actionsRef = useRef<DropdownMenuActions | null>(null)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  const ctx = useMemo(() => ({ open, actionsRef }), [open])

  // A size prop pins the whole compound (trigger content + portalled popup —
  // React context crosses portals) to one ladder step.
  const root = (
    <DropdownMenuContext.Provider value={ctx}>
      <Menu.Root
        open={open}
        onOpenChange={handleOpenChange}
        actionsRef={actionsRef}
        disabled={disabled}
        // Non-modal: the page keeps scrolling and the Positioner tracks the
        // anchor, so the popup follows its trigger instead of detaching.
        modal={false}
      >
        {children}
      </Menu.Root>
    </DropdownMenuContext.Provider>
  )

  return size ? <SizeProvider size={size}>{root}</SizeProvider> : root
}

DropdownMenu.displayName = 'DropdownMenu'

// ---------------------------------------------------------------------------
// DropdownTrigger
//
// Base UI's Menu.Trigger, re-exported under the library name. Composes via
// the `render` prop, so any element can be the trigger:
//
//   <DropdownTrigger render={<Button variant="secondary">Open</Button>} />
// ---------------------------------------------------------------------------

type DropdownTriggerProps = MenuTriggerProps

const DropdownTrigger = Menu.Trigger

// ---------------------------------------------------------------------------
// DropdownContent (popup panel)
//
// Portal > Positioner > Popup carrying the exact inline-panel visuals:
// Elevated surface, fluid-hover overlays, animated selected background,
// and animated focus ring. Children are wrapped in a Menu.RadioGroup so
// radio-style MenuItems (boolean `checked`) get correct aria-checked from
// `checkedIndex`.
// ---------------------------------------------------------------------------

type MenuPositionerProps = ComponentProps<typeof Menu.Positioner>

interface DropdownContentProps {
  /** `Dropdown.Item` rows, plus `Dropdown.Label`, `Dropdown.Separator`, `Dropdown.Search`, `Dropdown.Empty`. */
  children: ReactNode
  /** Extra classes for the popup surface. */
  className?: string
  /** Index of the checked item. Drives the animated selected background and
   *  the radio-group value announced to assistive tech. */
  checkedIndex?: number
  /** Uncontrolled twin of `checkedIndex`: the popup owns the selection, so rows need no `checked` or `onSelect` of their own. */
  defaultCheckedIndex?: number
  /** Called with the newly checked row, or `undefined` when nothing is checked. */
  onCheckedIndexChange?: (index: number | undefined) => void
  /** Multiple selection: the checked rows. Rows become checkbox items that
   *  keep the menu open when toggled, and contiguous runs share one merged
   *  background (see CheckboxGroup). */
  checkedIndices?: number[]
  /** Uncontrolled twin of `checkedIndices`: the popup toggles rows itself. */
  defaultCheckedIndices?: number[]
  /** Called with every checked row after a toggle. */
  onCheckedIndicesChange?: (indices: number[]) => void
  /** Side of the trigger the popup prefers. Defaults to `"bottom"`. */
  side?: MenuPositionerProps['side']
  /** Alignment against the trigger. Defaults to `"start"`. */
  align?: MenuPositionerProps['align']
  /** Gap to the trigger, in px. Defaults to `6`. */
  sideOffset?: number
}

const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
  (
    {
      className,
      children,
      checkedIndex,
      defaultCheckedIndex,
      onCheckedIndexChange,
      checkedIndices,
      defaultCheckedIndices,
      onCheckedIndicesChange,
      side = 'bottom',
      align = 'start',
      sideOffset = 6,
    },
    ref,
  ) => {
    const { open, actionsRef } = useDropdownMenuContext()
    const containerRef = useRef<HTMLDivElement>(null)

    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, setActiveIndex, itemRects, handlers, registerItem, remeasure } = hover

    const rows = usePanelRows(children)
    const selection = usePanelSelection(
      {
        checkedIndex,
        defaultCheckedIndex,
        onCheckedIndexChange,
        checkedIndices,
        defaultCheckedIndices,
        onCheckedIndicesChange,
      },
      rows.sourceOf,
      rows.filtering,
    )

    // An optional DropdownSearch child: typing on a focused row is
    // redirected into the field. (The field takes focus itself, a frame
    // after the primitive's own open autofocus.)
    const {
      host: searchHost,
      hasSearch,
      searchMounted,
      onKeyDownCapture: redirectTypingToSearch,
      isSearchField,
      highlightFirst,
    } = useDropdownSearchHost(open, { containerRef, setActiveIndex })

    // Open ready to act: focus the first enabled row (a mounted search field
    // takes focus itself instead). A frame after the primitive's own open
    // autofocus, which lands on the popup for pointer opens.
    useEffect(() => {
      if (!open) return
      let inner: number | undefined
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          if (hasSearch()) return
          const container = containerRef.current
          if (!container || (container.contains(document.activeElement) && document.activeElement !== container)) return
          const first = container.querySelector<HTMLElement>(
            '[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"])',
          )
          first?.focus()
        })
      })
      return () => {
        cancelAnimationFrame(outer)
        if (inner !== undefined) cancelAnimationFrame(inner)
      }
    }, [open, hasSearch])

    // Release Base UI's deferred unmount once the exit tween has played.
    // onAnimationComplete on the motion.div is the primary signal; this
    // timeout is a fallback for throttled/background tabs where rAF-driven
    // animation callbacks can stall. The popup exits with spring.fast, so the
    // fallback tracks that tier's exit duration plus a safety buffer.
    useEffect(() => {
      if (open) return
      const id = setTimeout(() => actionsRef.current?.unmount(), exitFallbackMs(spring.fast))
      return () => clearTimeout(id)
    }, [open, actionsRef])

    // The popup keeps its rows registered between opens, so their rects
    // were taken while it was hidden: re-measure once it is open and laid out.
    useEffect(() => {
      if (!open) return
      remeasure()
    }, [open, remeasure])

    const multiple = selection.multiple
    const checkedRect = !multiple && selection.checkedIndex != null ? itemRects[selection.checkedIndex] : null
    // Multiple: one merged block per contiguous run of checked rows.
    const runs = useSelectionRuns(selection.checkedIndices ?? NO_INDICES)
    const blocks = useMergeSplitBlocks(runs, open ? itemRects : NO_RECTS, shape.bgRadius)
    // Inside the popup, Base UI's Menu.Item / Menu.RadioItem own the role,
    // aria-checked, tabIndex, roving highlight, typeahead, and Enter/Space/
    // click activation (activation synthesizes a click, so the row div's
    // onClick also fires for keyboard). The render div carries the Fluid
    // Functionalism visuals and the fluid-hover registration.
    const renderMenuItem = useCallback(
      ({ radio, checkbox, checked, value, disabled, label, closeOnClick, element, children }: MenuItemRenderOptions) =>
        checkbox ? (
          // The row's own onClick toggles the consumer state; the primitive
          // only owns the role, aria-checked, and keyboard activation.
          <Menu.CheckboxItem
            checked={!!checked}
            disabled={disabled}
            label={label}
            closeOnClick={closeOnClick}
            render={element}
          >
            {children}
          </Menu.CheckboxItem>
        ) : radio ? (
          <Menu.RadioItem value={value} disabled={disabled} label={label} closeOnClick={closeOnClick} render={element}>
            {children}
          </Menu.RadioItem>
        ) : (
          <Menu.Item disabled={disabled} label={label} closeOnClick={closeOnClick} render={element}>
            {children}
          </Menu.Item>
        ),
      [],
    )

    const contentCtx = useMemo(
      () => ({
        registerItem,
        activeIndex,
        checkedIndex: selection.checkedIndex,
        multiple,
        checkedIndices: selection.checkedIndices,
        inMenu: true,
        renderMenuItem,
        selfManaged: selection.selfManaged,
        toggleIndex: selection.toggleIndex,
      }),
      [
        registerItem,
        activeIndex,
        selection.checkedIndex,
        multiple,
        selection.checkedIndices,
        selection.selfManaged,
        selection.toggleIndex,
        renderMenuItem,
      ],
    )

    return (
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
          <motion.div
            className={popupMotionClass}
            initial={{ opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 }}
            animate={open ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 }}
            transition={open ? spring.fast : spring.fast.exit}
            // Base UI defers unmount while actionsRef is set; release it once
            // the exit spring has finished so the close animation fully plays.
            onAnimationComplete={() => {
              if (!open) actionsRef.current?.unmount()
            }}
          >
            <DropdownContext.Provider value={contentCtx}>
              <DropdownFilterContext.Provider value={rows.filterCtx}>
                <DropdownSearchHostContext.Provider value={searchHost}>
                  <Menu.Popup
                    render={<Elevated offset={2} shadowLevel={3} ref={ref} />}
                    onKeyDownCapture={redirectTypingToSearch}
                    onMouseEnter={handlers.onMouseEnter}
                    onMouseMove={handlers.onMouseMove}
                    onClick={handlers.onClick}
                    onMouseLeave={() => {
                      handlers.onMouseLeave()
                      // The pointer's session is over; a focused search field
                      // gets its first-row highlight back.
                      if (isSearchField(document.activeElement)) highlightFirst()
                    }}
                    onFocus={e => {
                      const indexAttr = (e.target as HTMLElement)
                        .closest('[data-fluid-hover-index]')
                        ?.getAttribute('data-fluid-hover-index')
                      // Keyboard navigation moves the hover background only — no
                      // ring: in a menu the highlighted row is the focus indicator.
                      if (indexAttr != null) {
                        setActiveIndex(Number(indexAttr))
                      } else if (isSearchField(e.target)) {
                        // The search field: the first row (what Enter picks)
                        // carries the highlight while it has focus.
                        highlightFirst()
                      } else if (e.target !== e.currentTarget) {
                        // Focus moved to some other non-row inside the popup: no
                        // row is highlighted any more. The popup focusing itself
                        // (pointer leaving a row) doesn't count.
                        setActiveIndex(null)
                      }
                    }}
                    onBlur={e => {
                      // The popup itself takes focus when the pointer leaves a row; only a
                      // departure from the whole popup ends the hover session.
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return
                      setActiveIndex(null)
                    }}
                    className={cn(
                      // min-w tracks the trigger via the Positioner's
                      // --anchor-width var.
                      `flex flex-col w-72 max-w-full min-w-[var(--anchor-width)] max-h-[min(480px,var(--available-height))] overflow-hidden ${shape.container} select-none outline-none`,
                      className,
                    )}
                  >
                    {/* The list scrolls inside a ScrollArea; this wrapper is the rows'
                    offsetParent, so the overlays scroll with them. */}
                    <ScrollArea
                      className={popupScrollAreaClass}
                      viewportClassName={cn(popupViewportClass, !searchMounted && 'scroll-fade')}
                    >
                      <div ref={containerRef} className="relative flex flex-col p-1">
                        {/* Selected backgrounds — merged runs in multiple mode */}
                        {multiple && <SelectionBackgrounds blocks={blocks} />}

                        {/* Selected background */}
                        <AnimatePresence>
                          {checkedRect && (
                            <motion.div
                              className={`absolute ${shape.bg} bg-active pointer-events-none`}
                              initial={false}
                              animate={{
                                top: checkedRect.top,
                                left: checkedRect.left,
                                width: checkedRect.width,
                                height: checkedRect.height,
                                opacity: 1,
                              }}
                              exit={{ opacity: 0, transition: spring.moderate.exit }}
                              transition={{
                                ...spring.moderate,
                                opacity: { duration: spring.fast.duration },
                              }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Hover background */}
                        <FluidHoverHighlight hover={hover} from={checkedRect} className={shape.bg} />

                        {/* display: contents keeps items direct flex children of the
                    wrapper so fluid hover measurement and gap layout still work,
                    while the group provides the radio value context. */}
                        <Menu.RadioGroup value={selection.checkedIndex ?? null} className="contents">
                          {rows.content}
                        </Menu.RadioGroup>
                      </div>
                    </ScrollArea>
                  </Menu.Popup>
                </DropdownSearchHostContext.Provider>
              </DropdownFilterContext.Provider>
            </DropdownContext.Provider>
          </motion.div>
        </Menu.Positioner>
      </Menu.Portal>
    )
  },
)

DropdownContent.displayName = 'DropdownContent'

// ---------------------------------------------------------------------------
// DropdownLabel
// ---------------------------------------------------------------------------

const DropdownLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  // Group labels are the caption role of the type scale — see /docs/sizes.
  const compact = useSize().variant === 'compact'
  return (
    <div
      ref={ref}
      className={cn(
        'px-2 py-1.5 shrink-0 text-muted-foreground',
        compact ? 'text-caption-compact' : 'text-caption',
        className,
      )}
      {...props}
    />
  )
})

DropdownLabel.displayName = 'DropdownLabel'

// ---------------------------------------------------------------------------
// DropdownSeparator
// ---------------------------------------------------------------------------

const DropdownSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} role="separator" className={cn('my-1 -mx-1 h-px shrink-0 bg-border/60', className)} {...props} />
))

DropdownSeparator.displayName = 'DropdownSeparator'

// Compound statics: `<Dropdown.Menu>`, `<Dropdown.Item>`, … (typed by the
// DropdownComponent cast on the forwardRef above).
Object.assign(Dropdown, {
  Menu: DropdownMenu,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: MenuItem,
  Label: DropdownLabel,
  Separator: DropdownSeparator,
  Search: DropdownSearch,
  Empty: DropdownEmpty,
})

// DropdownContextValue and MenuItemRenderOptions are already re-exported
// above next to their import — repeating them here is a duplicate-export
// build error.
export type { DropdownContentProps, DropdownMenuProps, DropdownProps, DropdownSearchProps, DropdownTriggerProps }
export {
  Dropdown,
  DropdownContent,
  DropdownEmpty,
  DropdownLabel,
  DropdownMenu,
  DropdownSearch,
  DropdownSeparator,
  DropdownTrigger,
  MenuItem,
}
export default Dropdown
