/*
 * Local addition (not part of Fluid Functionalism): a site navigation bar
 * whose flyout panels grow out of their trigger through the morph engine
 * (`lib/use-morph.ts`), on Base UI's NavigationMenu. One panel is shared by
 * every item: moving to another trigger springs its size to the new content
 * while the content crossfades in from the side it came from. The strip has
 * one fluid hover highlight, and `NavigationMenu.Indicator` is a liquid
 * marker (`lib/goo-indicator.tsx`) under the open or current item.
 */

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { AnimatePresence, motion } from 'motion/react'
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { MorphSurface } from '../../../lib/morph-layers'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { type ItemRect, type UseFluidHoverReturn, useFluidHover } from '../../../lib/use-fluid-hover'
import { useKeyboardNavGate } from '../../../lib/use-keyboard-nav-gate'
import { useMorph, useMorphOrigin } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'

/* ─────────────────────── Shared ─────────────────────── */

const TARGET = 'data-navigation-menu-target'
const ROW = 'data-navigation-menu-row'

interface PanelSize {
  width: number
  height: number
}

interface RootContextValue {
  value: string | null
  triggers: MutableRefObject<Map<string, HTMLElement>>
  setList: (el: HTMLElement | null) => void
  setPanelSize: (size: PanelSize) => void
}

const RootContext = createContext<RootContextValue | null>(null)

function useRoot() {
  const ctx = useContext(RootContext)
  if (!ctx) throw new Error('NavigationMenu parts must be used within a NavigationMenu')
  return ctx
}

interface ListContextValue {
  hover: UseFluidHoverReturn
  indicatorRect: ItemRect | undefined
}

const ListContext = createContext<ListContextValue | null>(null)

const ItemContext = createContext<string>('')

// True inside a panel: links there are rows, not strip items.
const InContentContext = createContext(false)

/**
 * Registers every element matching `selector` inside the container with the
 * fluid hover, in document order, so parts need no `index`. Runs after every
 * render and only re-registers when the set changed.
 */
function useRegisterBySelector(
  container: RefObject<HTMLElement | null>,
  selector: string,
  register: UseFluidHoverReturn['registerItem'],
) {
  const registered = useRef<HTMLElement[]>([])
  const [items, setItems] = useState<HTMLElement[]>([])

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const next = [...root.querySelectorAll<HTMLElement>(selector)]
    const previous = registered.current
    if (next.length === previous.length && next.every((el, i) => el === previous[i])) return
    for (let i = next.length; i < previous.length; i++) register(i, null)
    next.forEach((el, i) => {
      if (previous[i] !== el) register(i, el)
    })
    registered.current = next
    setItems(next)
  })

  return items
}

/** Writes a node into a forwarded ref as well as a local one. */
function assignRef<T>(ref: React.ForwardedRef<T>, node: T | null) {
  if (typeof ref === 'function') ref(node)
  else if (ref) ref.current = node
}

/* ─────────────────────── List ─────────────────────── */

interface NavigationMenuListProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List> {
  /** `NavigationMenu.Item`s, and optionally a `NavigationMenu.Indicator`. */
  children?: ReactNode
}

const NavigationMenuList = forwardRef<HTMLUListElement, NavigationMenuListProps>(
  ({ className, children, ...props }, ref) => {
    const { value, setList } = useRoot()
    const containerRef = useRef<HTMLUListElement | null>(null)
    const hover = useFluidHover(containerRef, { axis: 'x' })
    const shape = useShape()
    const items = useRegisterBySelector(containerRef, `[${TARGET}]`, hover.registerItem)

    // The marker sits under the open item, else under the current page's item.
    const [marked, setMarked] = useState(-1)
    useLayoutEffect(() => {
      const open = value === null ? -1 : items.findIndex(el => el.dataset.navigationMenuValue === value)
      const next = open >= 0 ? open : items.findIndex(el => el.hasAttribute('data-active'))
      setMarked(next)
    })
    const indicatorRect = hover.isMeasured && marked >= 0 ? hover.itemRects[marked] : undefined

    const ctx = useMemo(() => ({ hover, indicatorRect }), [hover, indicatorRect])

    return (
      <ListContext.Provider value={ctx}>
        <NavigationMenuPrimitive.List
          ref={node => {
            containerRef.current = node as HTMLUListElement | null
            setList(node as HTMLElement | null)
            assignRef(ref, node as HTMLUListElement | null)
          }}
          {...hover.handlers}
          onFocus={event => {
            const index = items.indexOf(
              (event.target as HTMLElement).closest<HTMLElement>(`[${TARGET}]`) as HTMLElement,
            )
            if (index >= 0) hover.setActiveIndex(index)
          }}
          className={cn('relative m-0 flex list-none items-center p-0', className)}
          {...props}
        >
          <FluidHoverHighlight hover={hover} className={shape.bg} />
          {children}
        </NavigationMenuPrimitive.List>
      </ListContext.Provider>
    )
  },
)
NavigationMenuList.displayName = 'NavigationMenuList'

/* ─────────────────────── Indicator ─────────────────────── */

interface NavigationMenuIndicatorProps {
  /** Classes for the marker: its fill. Defaults to the `bg-active` overlay. */
  className?: string
}

/** A liquid marker under the open item, or the current page's item when nothing is open. */
function NavigationMenuIndicator({ className }: NavigationMenuIndicatorProps) {
  const ctx = useContext(ListContext)
  const shape = useShape()
  const rect = ctx?.indicatorRect
  // Rendered as a list item so the list stays valid markup.
  return (
    <li aria-hidden="true" className="contents">
      {rect && <GooIndicator rect={rect} className={cn('bg-active', shape.bg, className)} />}
    </li>
  )
}

/* ─────────────────────── Item ─────────────────────── */

interface NavigationMenuItemProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item> {
  /** Identifies the item for a controlled `value`. Defaults to a generated id. */
  value?: string
}

const NavigationMenuItem = forwardRef<HTMLLIElement, NavigationMenuItemProps>(({ value, ...props }, ref) => {
  const generated = useId()
  const itemValue = value ?? generated
  return (
    <ItemContext.Provider value={itemValue}>
      <NavigationMenuPrimitive.Item ref={ref} value={itemValue} {...props} />
    </ItemContext.Provider>
  )
})
NavigationMenuItem.displayName = 'NavigationMenuItem'

/* ─────────────────────── Strip label ─────────────────────── */

/** The strip's label: semibold while open or current, with an invisible semibold copy holding its width. */
function StripLabel({ emphasized, children }: { emphasized: boolean; children: ReactNode }) {
  const size = useSize()
  return (
    <span className={cn('inline-grid whitespace-nowrap', size.text)}>
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 weight-semibold [text-box:trim-both_cap_alphabetic]"
      >
        {children}
      </span>
      <span
        className={cn(
          'col-start-1 row-start-1 transition-[font-variation-settings] duration-fast [text-box:trim-both_cap_alphabetic]',
          emphasized ? 'weight-semibold' : 'weight-normal',
        )}
      >
        {children}
      </span>
    </span>
  )
}

const STRIP_ITEM =
  'group/item relative z-10 flex cursor-pointer select-none items-center bg-transparent text-muted-foreground no-underline outline-none transition-[color] duration-fast focus-visible:ring-1 focus-visible:ring-focus-ring data-[fluid-hover-active]:text-foreground'

/* ─────────────────────── Trigger ─────────────────────── */

interface NavigationMenuTriggerProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger> {
  /** The trigger's label. */
  children?: ReactNode
}

const NavigationMenuTrigger = forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { value, triggers } = useRoot()
    const itemValue = useContext(ItemContext)
    const size = useSize()
    const shape = useShape()
    const reduced = useReduceMotion()
    const Chevron = useIcon('chevron-down')
    const open = value === itemValue

    return (
      <NavigationMenuPrimitive.Trigger
        ref={node => {
          if (node) triggers.current.set(itemValue, node)
          else triggers.current.delete(itemValue)
          assignRef(ref, node)
        }}
        {...{ [TARGET]: '', 'data-navigation-menu-value': itemValue }}
        className={cn(STRIP_ITEM, size.control, size.px, size.gap, shape.button, open && 'text-foreground', className)}
        {...props}
      >
        <StripLabel emphasized={open}>{children}</StripLabel>
        <motion.span
          aria-hidden="true"
          className="flex"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : spring.moderate}
        >
          <Chevron
            size={size.icon}
            strokeWidth={1.5}
            className={cn(
              'transition-[stroke-width] duration-fast group-[[data-fluid-hover-active]]/item:stroke-2',
              open && 'stroke-2',
            )}
          />
        </motion.span>
      </NavigationMenuPrimitive.Trigger>
    )
  },
)
NavigationMenuTrigger.displayName = 'NavigationMenuTrigger'

/* ─────────────────────── Content ─────────────────────── */

/** The panel's one keyboard ring: 2px outside the focused row, springing between rows (as in Dropdown). */
function FocusRing({ rect }: { rect: ItemRect | undefined }) {
  const shape = useShape()
  const reduced = useReduceMotion()
  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          aria-hidden="true"
          className={cn('pointer-events-none absolute z-20 border border-focus-ring', shape.focusRing)}
          initial={false}
          animate={{ left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 }}
          exit={{ opacity: 0, transition: spring.fast.exit }}
          transition={reduced ? { duration: 0 } : { ...spring.fast, opacity: { duration: spring.fast.duration } }}
        />
      )}
    </AnimatePresence>
  )
}

interface NavigationMenuContentProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content> {
  /** Classes for the panel's content: its width and layout (a grid of links, a feature column). */
  className?: string
  /** The panel: `NavigationMenu.Link`s and anything else. */
  children?: ReactNode
}

const NavigationMenuContent = forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ className, children, ...props }, ref) => {
    const { value, setPanelSize } = useRoot()
    const itemValue = useContext(ItemContext)
    const open = value === itemValue
    const reduced = useReduceMotion()
    const shape = useShape()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [element, setElement] = useState<HTMLDivElement | null>(null)
    const hover = useFluidHover(containerRef, { axis: 'xy' })
    const rows = useRegisterBySelector(containerRef, `[${ROW}]`, hover.registerItem)
    // Only keyboard focus earns the ring: Tab or an arrow key, or focus that arrived as :focus-visible.
    const { keyboardNavRef, trackKeyboardNav } = useKeyboardNavGate(open)
    const [focused, setFocused] = useState<number | null>(null)

    // The open panel tells the shared frame its natural size, and keeps telling it as it changes.
    useLayoutEffect(() => {
      if (!open || !element) return
      const report = () => setPanelSize({ width: element.offsetWidth, height: element.offsetHeight })
      report()
      const observer = new ResizeObserver(report)
      observer.observe(element)
      return () => observer.disconnect()
    }, [open, element, setPanelSize])

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node
        setElement(node)
        assignRef(ref, node)
      },
      [ref],
    )

    return (
      <InContentContext.Provider value={true}>
        <NavigationMenuPrimitive.Content
          ref={setRefs}
          {...hover.handlers}
          onKeyDown={event => {
            if (event.key === 'Tab') keyboardNavRef.current = true
            trackKeyboardNav(event)
          }}
          onFocus={event => {
            const target = event.target as HTMLElement
            const index = rows.indexOf(target.closest<HTMLElement>(`[${ROW}]`) as HTMLElement)
            if (index < 0) return
            hover.setActiveIndex(index)
            setFocused(keyboardNavRef.current || target.matches(':focus-visible') ? index : null)
          }}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(null)
          }}
          className={cn(
            'relative w-max p-1 transition-[opacity,transform] duration-moderate data-[ending-style]:duration-moderate-exit data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            !reduced &&
              'data-[starting-style]:data-[activation-direction=right]:translate-x-4 data-[starting-style]:data-[activation-direction=left]:-translate-x-4 data-[ending-style]:data-[activation-direction=right]:-translate-x-4 data-[ending-style]:data-[activation-direction=left]:translate-x-4',
            className,
          )}
          {...props}
        >
          <FluidHoverHighlight hover={hover} className={shape.bg} />
          <FocusRing rect={open && focused !== null ? hover.itemRects[focused] : undefined} />
          {children}
        </NavigationMenuPrimitive.Content>
      </InContentContext.Provider>
    )
  },
)
NavigationMenuContent.displayName = 'NavigationMenuContent'

/* ─────────────────────── Link ─────────────────────── */

interface NavigationMenuLinkProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link> {
  /** Marks the link as the current page (`aria-current`); in the strip, the indicator rests under it. Defaults to `false`. */
  active?: boolean
  /** Leading icon of a link inside a panel. */
  icon?: IconComponent
  /** A muted line under the title of a link inside a panel. */
  description?: ReactNode
  /** Close the panel when the link is pressed. Defaults to `false`. */
  closeOnClick?: boolean
  /** The link's title. */
  children?: ReactNode
}

const NavigationMenuLink = forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
  ({ active = false, icon: Icon, description, className, children, ...props }, ref) => {
    const inContent = useContext(InContentContext)
    const size = useSize()
    const shape = useShape()

    if (!inContent) {
      return (
        <NavigationMenuPrimitive.Link
          ref={ref}
          active={active}
          {...{ [TARGET]: '' }}
          className={cn(STRIP_ITEM, size.control, size.px, shape.button, active && 'text-foreground', className)}
          {...props}
        >
          <StripLabel emphasized={active}>{children}</StripLabel>
        </NavigationMenuPrimitive.Link>
      )
    }

    const compact = size.variant === 'compact'
    return (
      <NavigationMenuPrimitive.Link
        ref={ref}
        active={active}
        {...{ [ROW]: '' }}
        className={cn(
          'group/row relative z-10 flex min-w-0 cursor-pointer items-start no-underline outline-none',
          description ? 'py-2' : cn(size.control, 'items-center'),
          size.itemPx,
          size.gap,
          shape.item,
          className,
        )}
        {...props}
      >
        {Icon && (
          <Icon
            size={size.icon}
            strokeWidth={1.5}
            className={cn(
              'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-fast group-[[data-fluid-hover-active]]/row:stroke-2 group-[[data-fluid-hover-active]]/row:text-foreground',
              description && 'mt-0.5',
            )}
          />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('truncate text-foreground', active ? 'weight-semibold' : 'weight-normal', size.text)}>
            {children}
          </span>
          {description && (
            <span className={cn('text-muted-foreground', compact ? 'text-caption-compact' : 'text-caption')}>
              {description}
            </span>
          )}
        </span>
      </NavigationMenuPrimitive.Link>
    )
  },
)
NavigationMenuLink.displayName = 'NavigationMenuLink'

/* ─────────────────────── Root ─────────────────────── */

interface NavigationMenuProps {
  /** Controlled open item (its `value`), or `null` when closed. Pair with `onValueChange`. */
  value?: string | null
  /** Initially open item, for an uncontrolled menu. Defaults to `null`. */
  defaultValue?: string | null
  /** Called with the open item's value, or `null` as the menu closes. */
  onValueChange?: (value: string | null) => void
  /** Hover delay before a panel opens, in ms. Defaults to `50`. */
  delay?: number
  /** Delay before the panel closes once the pointer leaves, in ms. Defaults to `50`. */
  closeDelay?: number
  /** Alignment of the panel along the strip. Defaults to `'start'`. */
  align?: 'start' | 'center' | 'end'
  /** Gap between strip and panel in px — the length of the goo neck. Defaults to `12`. */
  sideOffset?: number
  /** Where the panel grows from (see Morph): the pressed trigger, the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the trigger while open, so it reads as turning into the panel. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
  /** Pins the strip and its panels to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `nav` root. */
  className?: string
  /** A `NavigationMenu.List`. */
  children?: ReactNode
}

/**
 * A site navigation bar whose items open flyout panels of links.
 *
 * The panel grows out of the trigger that opened it (see Morph) and closes
 * back into it. Moving to another trigger keeps the one panel open: it
 * springs to the new content's size while the content slides in from the
 * side the pointer came from. One fluid hover highlight runs along the
 * strip and another inside each panel, and `NavigationMenu.Indicator` melts
 * from item to item under the open one, or under the current page's link.
 * The panel lifts 2 surface levels off its substrate. Built on Base UI's
 * NavigationMenu: panels open on hover or press, arrow keys move between
 * items, Escape closes; controlled with `value` + `onValueChange`.
 *
 * Statics:
 * - `NavigationMenu.List` — the strip.
 * - `NavigationMenu.Item` — one entry: a Trigger + Content pair, or a Link;
 *   `value`.
 * - `NavigationMenu.Trigger` — opens its item's panel; the chevron turns and
 *   the label turns semibold while open.
 * - `NavigationMenu.Content` — the item's panel; size it with `className`.
 * - `NavigationMenu.Link` — a link: in the strip, a top-level item; in a
 *   panel, a row with `icon` and `description`. `active` marks the current
 *   page; `closeOnClick`.
 * - `NavigationMenu.Indicator` — the liquid marker; put it in the List.
 *
 * @example {@include ./examples.mdx}
 */
function NavigationMenu({
  value,
  defaultValue = null,
  onValueChange,
  delay,
  closeDelay,
  align = 'start',
  sideOffset = 12,
  from,
  effect,
  hideSource,
  tier,
  size,
  className,
  children,
}: NavigationMenuProps) {
  const [current, setCurrent] = useControllableState<string | null>(value, defaultValue, onValueChange)
  const { origin, capture } = useMorphOrigin()
  const triggers = useRef(new Map<string, HTMLElement>())
  const [list, setList] = useState<HTMLElement | null>(null)
  const [panelSize, setPanelSize] = useState<PanelSize | null>(null)
  const open = current !== null
  const morph = useMorph(open, origin, { from, effect, hideSource, tier })
  const reduced = useReduceMotion()
  const shape = useShape()
  const level = Math.min(useSurface() + 2, 8)

  // A fresh open measures the panel at its natural size.
  if (!open && panelSize) setPanelSize(null)

  const ctx = useMemo(() => ({ value: current, triggers, setList, setPanelSize }), [current])

  const root = (
    <RootContext.Provider value={ctx}>
      <NavigationMenuPrimitive.Root
        value={current}
        onValueChange={(next, details) => {
          const nextValue = (next as string | null) ?? null
          // Every switch re-points the origin, so the panel closes into the trigger that is open.
          if (nextValue !== null) capture({ trigger: triggers.current.get(nextValue), event: details.event })
          setCurrent(nextValue)
        }}
        delay={delay}
        closeDelay={closeDelay}
        className={cn('relative', className)}
      >
        {children}
        <NavigationMenuPrimitive.Portal>
          <NavigationMenuPrimitive.Positioner
            anchor={list}
            side="bottom"
            align={align}
            sideOffset={sideOffset}
            collisionPadding={8}
            className="z-50 outline-none"
          >
            <NavigationMenuPrimitive.Popup ref={morph.popupRef} className="relative outline-none">
              <SurfaceProvider value={level}>
                <MorphSurface morph={morph} bg={SURFACE_BG[level]} shadow={SURFACE_SHADOW[3]} radius={shape.container}>
                  <motion.div
                    className="relative overflow-hidden"
                    initial={false}
                    animate={panelSize ? { width: panelSize.width, height: panelSize.height } : undefined}
                    transition={reduced ? { duration: 0 } : spring.moderate}
                  >
                    <NavigationMenuPrimitive.Viewport className="relative" />
                  </motion.div>
                </MorphSurface>
              </SurfaceProvider>
            </NavigationMenuPrimitive.Popup>
          </NavigationMenuPrimitive.Positioner>
        </NavigationMenuPrimitive.Portal>
      </NavigationMenuPrimitive.Root>
    </RootContext.Provider>
  )

  // A size prop pins the strip and its panels to one ladder step.
  return size ? <SizeProvider size={size}>{root}</SizeProvider> : root
}

NavigationMenu.List = NavigationMenuList
NavigationMenu.Item = NavigationMenuItem
NavigationMenu.Trigger = NavigationMenuTrigger
NavigationMenu.Content = NavigationMenuContent
NavigationMenu.Link = NavigationMenuLink
NavigationMenu.Indicator = NavigationMenuIndicator

export type {
  NavigationMenuContentProps,
  NavigationMenuIndicatorProps,
  NavigationMenuItemProps,
  NavigationMenuLinkProps,
  NavigationMenuListProps,
  NavigationMenuProps,
  NavigationMenuTriggerProps,
}
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
}

export default NavigationMenu
