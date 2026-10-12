/*
 * Local addition (not part of Fluid Functionalism): the children-based menu
 * parts shadcn's DropdownMenu has and the FF port lacked. Groups, value-keyed
 * checkbox and radio rows, and submenus, all on Base UI's Menu
 * (`Menu.Group`, `Menu.CheckboxItem`, `Menu.RadioGroup` / `Menu.RadioItem`,
 * `Menu.SubmenuRoot` / `Menu.SubmenuTrigger`). The rows are `MenuItem`; a
 * submenu is a panel of its own (fluid hover, keyboard ring, selection
 * backgrounds) that grows out of its trigger row through the morph engine.
 * `useMenuPanel` is the state both popups share; both draw the shared
 * keyboard ring (`lib/focus-ring.tsx`, pinned to the rounded shape).
 */

import { Menu, type MenuRootChangeEventDetails } from '@base-ui/react/menu'
import {
  type ComponentProps,
  createContext,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { MorphSurface } from '../../../lib/morph-layers'
import { isDisabledRow, popupScrollAreaClass, popupViewportClass } from '../../../lib/popup'
import { RowOrderContext, useRowOrder, useRowSlot } from '../../../lib/row-order'
import { shapeMap } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { type ItemRect, type UseFluidHoverReturn, useFluidHover } from '../../../lib/use-fluid-hover'
import { useKeyboardNavGate } from '../../../lib/use-keyboard-nav-gate'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import { type MorphOrigin, useMorph, useMorphOrigin } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { ScrollArea } from '../../../primitives/scroll-area'
import {
  DropdownContext,
  type DropdownContextValue,
  MenuItem,
  type MenuItemRenderOptions,
  useDropdown,
} from './menu-item'

// Menus keep the "rounded" shape whatever the rest of the UI is (index.tsx).
const shape = shapeMap.rounded

const NO_INDICES: number[] = []

type MenuPositionerProps = ComponentProps<typeof Menu.Positioner>
type MenuPopupProps = ComponentProps<typeof Menu.Popup>
type MenuPortalProps = ComponentProps<typeof Menu.Portal>

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as MutableRefObject<T | null>).current = node
    }
  }
}

/**
 * A submenu is a React child of the popup that holds its trigger, so its
 * events bubble there through the portal. A panel acts only on events that
 * happened in its own DOM.
 */
const ownEvent = (e: SyntheticEvent) => (e.currentTarget as Node).contains(e.target as Node)

/** Runs a caller's handler, then the panel's own, so spread HTML attributes never replace what the popup needs. */
function chain<E>(theirs: ((e: E) => void) | undefined, own: (e: E) => void) {
  return (e: E) => {
    theirs?.(e)
    own(e)
  }
}

/** Wraps a MenuItem's styled row in the Base UI menu-item primitive. */
function renderPopupItem({
  radio,
  checkbox,
  checked,
  value,
  disabled,
  label,
  closeOnClick,
  onClick,
  element,
  children,
}: MenuItemRenderOptions) {
  if (checkbox)
    return (
      <Menu.CheckboxItem
        checked={!!checked}
        disabled={disabled}
        label={label}
        closeOnClick={closeOnClick}
        onClick={onClick}
        render={element}
      >
        {children}
      </Menu.CheckboxItem>
    )
  if (radio)
    return (
      <Menu.RadioItem
        value={value}
        disabled={disabled}
        label={label}
        closeOnClick={closeOnClick}
        onClick={onClick}
        render={element}
      >
        {children}
      </Menu.RadioItem>
    )
  return (
    <Menu.Item disabled={disabled} label={label} closeOnClick={closeOnClick} onClick={onClick} render={element}>
      {children}
    </Menu.Item>
  )
}

/** The rows a `Dropdown.CheckboxItem` / `Dropdown.RadioItem` reports checked, for the merged selection background. */
function useValueChecked() {
  const [valueChecked, setValueChecked] = useState(NO_INDICES)
  const reportChecked = useCallback(
    (index: number, on: boolean) =>
      setValueChecked(prev =>
        on === prev.includes(index) ? prev : on ? [...prev, index] : prev.filter(i => i !== index),
      ),
    [],
  )
  return { valueChecked, reportChecked }
}

// ---------------------------------------------------------------------------
// The state a popup panel keeps: fluid hover, the row order, the keyboard
// ring, the highlight an open submenu pins, and the value-checked rows.
// ---------------------------------------------------------------------------

function useMenuPanel(containerRef: RefObject<HTMLDivElement | null>, open: boolean) {
  // Annotated: left to inference, the declaration emit names this type through the
  // root barrel (`import("../../..")`), a cycle that makes bunup's d.ts bundling
  // silently drop `index.d.ts` and every entry importing the dropdown.
  const hover: UseFluidHoverReturn = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
  const { activeIndex, setActiveIndex, itemRects, isMeasured } = hover
  const rowOrder = useRowOrder()
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const { keyboardNavRef, trackKeyboardNav } = useKeyboardNavGate(open)

  const [pinned, setPinned] = useState<number | null>(null)
  const pin = useCallback((index: number, on: boolean) => setPinned(p => (on ? index : p === index ? null : p)), [])

  const { valueChecked, reportChecked } = useValueChecked()

  // A close drops the ring and the highlight, so the next open doesn't
  // spring them over from the last row.
  useEffect(() => {
    if (open) return
    setFocusedIndex(null)
    setActiveIndex(null)
  }, [open, setActiveIndex])

  const lit = activeIndex ?? pinned
  const shownHover = useMemo(() => ({ ...hover, activeIndex: lit }), [hover, lit])
  const focusRect: ItemRect | null = isMeasured && focusedIndex !== null ? (itemRects[focusedIndex] ?? null) : null

  /** A row took focus: light it, and ring it when the keyboard moved it. */
  const focusRow = useCallback(
    (e: FocusEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-fluid-hover-index]')
      if (!row) return false
      const index = Number(row.getAttribute('data-fluid-hover-index'))
      // Base UI keeps disabled rows focusable; they get the ring, never the light.
      setActiveIndex(isDisabledRow(row) ? null : index)
      setFocusedIndex(keyboardNavRef.current && (e.target as HTMLElement).matches(':focus-visible') ? index : null)
      return true
    },
    [keyboardNavRef, setActiveIndex],
  )

  return {
    hover,
    shownHover,
    lit,
    rowOrder,
    focusRect,
    setFocusedIndex,
    focusRow,
    trackKeyboardNav,
    pin,
    valueChecked,
    reportChecked,
  }
}

// ---------------------------------------------------------------------------
// Dropdown.Group
// ---------------------------------------------------------------------------

/** True inside a `Dropdown.Group`, where `Dropdown.Label` names the group. */
const DropdownGroupContext = createContext(false)

interface DropdownGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Rows, with an optional `Dropdown.Label` first: it becomes the group's accessible name. */
  children?: ReactNode
  /** Extra classes. */
  className?: string
}

/** A run of related rows (role="group"), named by the `Dropdown.Label` inside it. */
const DropdownGroup = forwardRef<HTMLDivElement, DropdownGroupProps>(({ className, ...props }, ref) => {
  const own = useRef<HTMLDivElement>(null)
  useRowSlot(own, undefined, true)
  return (
    <DropdownGroupContext.Provider value={true}>
      <Menu.Group ref={mergeRefs(own, ref)} className={cn('flex flex-col', className)} {...props} />
    </DropdownGroupContext.Provider>
  )
})

DropdownGroup.displayName = 'DropdownGroup'

// ---------------------------------------------------------------------------
// Dropdown.CheckboxItem
// ---------------------------------------------------------------------------

interface DropdownCheckboxItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultChecked'> {
  /** Whether the row is checked. Pair with `onCheckedChange`. */
  checked?: boolean
  /** Initial checked state, for an uncontrolled row. Defaults to `false`. */
  defaultChecked?: boolean
  /** Called with the new state when the row is toggled. */
  onCheckedChange?: (checked: boolean) => void
  /** Optional leading icon. */
  icon?: IconComponent
  /** The row text. Omit it to pass the row's content as `children`. */
  label?: string
  /** Typeahead text for a row whose content is more than a string (an icon beside markup): the key a press matches while the menu is open. Defaults to `label`, else the row's text `children`. */
  textValue?: string
  /** The row's content when there is no `label`. */
  children?: ReactNode
  /** Position among the panel's rows. Omitted, the row takes its place in document order. */
  index?: number
  /** Called when the row is picked, before it toggles. With `closeOnClick`, `event.preventDefault()` keeps the menu open. */
  onSelect?: (event: Event) => void
  /** Dims the row; the pointer and the keyboard skip it. Defaults to `false`. */
  disabled?: boolean
  /** Whether toggling closes the menu. Defaults to `false`. */
  closeOnClick?: boolean
  /** Indents the row to the label column of rows with an icon. Defaults to `false`. */
  inset?: boolean
  /** A keyboard shortcut shown muted at the row's end. */
  shortcut?: ReactNode
  /** Extra classes for the row. */
  className?: string
}

/** A row that toggles on and off by itself (role="menuitemcheckbox"), keyed on its own state rather than an index. */
const DropdownCheckboxItem = forwardRef<HTMLDivElement, DropdownCheckboxItemProps>(
  ({ checked, defaultChecked = false, onCheckedChange, onSelect, closeOnClick = false, ...props }, ref) => {
    const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange)
    return (
      <MenuItem
        ref={ref}
        kind="checkbox"
        checked={on}
        closeOnClick={closeOnClick}
        onSelect={event => {
          onSelect?.(event)
          setOn(prev => !prev)
        }}
        {...props}
      />
    )
  },
)

DropdownCheckboxItem.displayName = 'DropdownCheckboxItem'

// ---------------------------------------------------------------------------
// Dropdown.RadioGroup + Dropdown.RadioItem
// ---------------------------------------------------------------------------

const RadioValueContext = createContext<{ value?: string; select: (value: string) => void } | null>(null)

interface DropdownRadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** The picked row's value. Pair with `onValueChange`. */
  value?: string
  /** Initial value, for an uncontrolled group. */
  defaultValue?: string
  /** Called with the picked row's value. */
  onValueChange?: (value: string) => void
  /** `Dropdown.RadioItem` rows, plus an optional `Dropdown.Label`. */
  children?: ReactNode
  /** Extra classes. */
  className?: string
}

/** One choice among its `Dropdown.RadioItem` rows, keyed on their `value`. */
const DropdownRadioGroup = forwardRef<HTMLDivElement, DropdownRadioGroupProps>(
  ({ value, defaultValue, onValueChange, className, ...props }, ref) => {
    const [current, setCurrent] = useControllableState<string | undefined>(value, defaultValue, next => {
      if (next !== undefined) onValueChange?.(next)
    })
    const own = useRef<HTMLDivElement>(null)
    useRowSlot(own, undefined, true)
    const ctx = useMemo(() => ({ value: current, select: (next: string) => setCurrent(next) }), [current, setCurrent])
    return (
      <RadioValueContext.Provider value={ctx}>
        <DropdownGroupContext.Provider value={false}>
          <Menu.RadioGroup
            ref={mergeRefs(own, ref)}
            value={current ?? null}
            className={cn('flex flex-col', className)}
            {...props}
          />
        </DropdownGroupContext.Provider>
      </RadioValueContext.Provider>
    )
  },
)

DropdownRadioGroup.displayName = 'DropdownRadioGroup'

interface DropdownRadioItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The value this row stands for in its `Dropdown.RadioGroup`. */
  value: string
  /** Optional leading icon. */
  icon?: IconComponent
  /** The row text. Omit it to pass the row's content as `children`. */
  label?: string
  /** Typeahead text for a row whose content is more than a string (an icon beside markup): the key a press matches while the menu is open. Defaults to `label`, else the row's text `children`. */
  textValue?: string
  /** The row's content when there is no `label`. */
  children?: ReactNode
  /** Position among the panel's rows. Omitted, the row takes its place in document order. */
  index?: number
  /** Called when the row is picked, before the group's value changes. Call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: Event) => void
  /** Dims the row; the pointer and the keyboard skip it. Defaults to `false`. */
  disabled?: boolean
  /** Whether picking the row closes the menu. Defaults to `true`. */
  closeOnClick?: boolean
  /** Indents the row to the label column of rows with an icon. Defaults to `false`. */
  inset?: boolean
  /** A keyboard shortcut shown muted at the row's end. */
  shortcut?: ReactNode
  /** Extra classes for the row. */
  className?: string
}

/** A row of a `Dropdown.RadioGroup` (role="menuitemradio"), checked while the group's value is its `value`. */
const DropdownRadioItem = forwardRef<HTMLDivElement, DropdownRadioItemProps>(({ value, onSelect, ...props }, ref) => {
  const group = useContext(RadioValueContext)
  return (
    <MenuItem
      ref={ref}
      kind="radio"
      value={value}
      checked={group?.value === value}
      onSelect={event => {
        onSelect?.(event)
        group?.select(value)
      }}
      {...props}
    />
  )
})

DropdownRadioItem.displayName = 'DropdownRadioItem'

// ---------------------------------------------------------------------------
// Dropdown.Sub + Dropdown.SubTrigger + Dropdown.SubContent
// ---------------------------------------------------------------------------

interface SubContextValue {
  open: boolean
  origin: RefObject<MorphOrigin>
}

const SubContext = createContext<SubContextValue | null>(null)

function useSubContext() {
  const ctx = useContext(SubContext)
  if (!ctx) throw new Error('Dropdown.SubTrigger and Dropdown.SubContent must be inside <Dropdown.Sub>')
  return ctx
}

interface DropdownSubProps {
  /** `Dropdown.SubTrigger` and `Dropdown.SubContent`. */
  children: ReactNode
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled submenu. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the submenu opens or closes, with Base UI's event details: `reason` and `cancel()`, which keeps the submenu as it is. */
  onOpenChange?: (open: boolean, details: MenuRootChangeEventDetails) => void
  /** Disables the submenu. Defaults to `false`. */
  disabled?: boolean
}

/** A submenu: its trigger row and its panel. Lives inside `Dropdown.Content` (or another submenu). */
function DropdownSub({ children, open, defaultOpen = false, onOpenChange, disabled = false }: DropdownSubProps) {
  const [current, setCurrent] = useControllableState(open, defaultOpen)
  const { origin, capture } = useMorphOrigin()
  const ctx = useMemo(() => ({ open: current, origin }), [current, origin])
  return (
    <SubContext.Provider value={ctx}>
      <Menu.SubmenuRoot
        open={current}
        disabled={disabled}
        onOpenChange={(next, details) => {
          // Base UI re-reports a sub that is already closed as closed (reason `sibling-open`,
          // once per sibling that opens). The caller hears changes only, as it did through
          // useControllableState's no-op skip: a handler shared with the root must not see them.
          if (next === current) return
          onOpenChange?.(next, details)
          if (details.isCanceled) return
          if (next) capture(details)
          setCurrent(next)
        }}
      >
        {children}
      </Menu.SubmenuRoot>
    </SubContext.Provider>
  )
}

DropdownSub.displayName = 'DropdownSub'

interface DropdownSubTriggerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Optional leading icon. */
  icon?: IconComponent
  /** The row text. Omit it to pass the row's content as `children`. */
  label?: string
  /** Typeahead text for a row whose content is more than a string (an icon beside markup): the key a press matches while the menu is open. Defaults to `label`, else the row's text `children`. */
  textValue?: string
  /** The row's content when there is no `label`. */
  children?: ReactNode
  /** Position among the panel's rows. Omitted, the row takes its place in document order. */
  index?: number
  /** Dims the row; the pointer and the keyboard skip it. Defaults to `false`. */
  disabled?: boolean
  /** Indents the row to the label column of rows with an icon. Defaults to `false`. */
  inset?: boolean
  /** Open the submenu when the pointer rests on the row. Defaults to `true`. */
  openOnHover?: boolean
  /** How long the pointer rests before it opens, in ms. Defaults to `100`. */
  delay?: number
  /** How long before a hover-opened submenu closes once the pointer leaves, in ms. Defaults to `0`. */
  closeDelay?: number
  /** Extra classes for the row. */
  className?: string
}

/**
 * The row that opens a submenu, with a trailing chevron: ArrowRight, a press
 * or a resting pointer opens it, ArrowLeft closes it. Its row stays lit while
 * the submenu is open.
 */
const DropdownSubTrigger = forwardRef<HTMLDivElement, DropdownSubTriggerProps>(
  ({ openOnHover, delay, closeDelay, ...props }, ref) => {
    const { open, origin } = useSubContext()
    const parent = useDropdown()
    const Chevron = useIcon('chevron-right')
    const size = useSize()

    const ctx = useMemo<DropdownContextValue>(
      () => ({
        ...parent,
        renderMenuItem: ({ disabled, label, onClick, element, children }) => (
          <Menu.SubmenuTrigger
            disabled={disabled}
            label={label}
            onClick={onClick}
            openOnHover={openOnHover}
            delay={delay}
            closeDelay={closeDelay}
            render={element}
          >
            {children}
            <Chevron
              size={size.icon}
              strokeWidth={open ? 2 : 1.5}
              className={cn(
                'ml-auto shrink-0 transition-[color,stroke-width] duration-fast',
                open ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </Menu.SubmenuTrigger>
        ),
      }),
      [parent, openOnHover, delay, closeDelay, Chevron, size.icon, open],
    )

    // The submenu grows out of this row, whatever Base UI reports as the trigger.
    const setTrigger = useCallback(
      (node: HTMLDivElement | null) => {
        if (node) (origin as MutableRefObject<MorphOrigin>).current = { ...origin.current, trigger: node }
      },
      [origin],
    )

    return (
      <DropdownContext.Provider value={ctx}>
        <MenuItem ref={mergeRefs(setTrigger, ref)} pinned={open} {...props} />
      </DropdownContext.Provider>
    )
  },
)

DropdownSubTrigger.displayName = 'DropdownSubTrigger'

interface DropdownSubContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  /** Rows: `Dropdown.Item`, `Dropdown.CheckboxItem`, `Dropdown.RadioGroup`, `Dropdown.Group`, `Dropdown.Label`, `Dropdown.Separator`, another `Dropdown.Sub`. */
  children: ReactNode
  /** Extra classes for the submenu surface — it is 14rem wide by default. */
  className?: string
  /** Classes for the portalled positioner element: a z utility here lifts the submenu above other fixed layers (the positioner is `z-50`). */
  positionerClassName?: string
  /** Side of the trigger row the submenu prefers. Defaults to `"inline-end"`. */
  side?: MenuPositionerProps['side']
  /** Alignment against the trigger row. Defaults to `"start"`. */
  align?: MenuPositionerProps['align']
  /** Gap to the parent menu, in px: the goo neck's length. Defaults to `8`. */
  sideOffset?: number
  /** Shift along the trigger row, in px; `-4` lines the first row up with the trigger. Defaults to `-4`. */
  alignOffset?: number
  /** Space to keep between the submenu and the edge of the collision boundary, in px (a number, or per side). Defaults to `5`. */
  collisionPadding?: MenuPositionerProps['collisionPadding']
  /** The element the portalled submenu mounts into. Defaults to `document.body`. */
  container?: MenuPortalProps['container']
  /** Where focus goes once the submenu has closed: `false` leaves it, a ref moves it there, a function picks by how it closed. Defaults to `undefined`: Base UI's own return to the trigger row. */
  finalFocus?: MenuPopupProps['finalFocus']
  /** An element to focus once the submenu has opened. The ref may be a fresh object each render: it is read when the submenu opens. Defaults to `undefined`: keyboard opens focus the first row, as Base UI does. */
  initialFocus?: RefObject<HTMLElement | null>
  /** Key handler on the popup, in the capture phase, ahead of the panel's own. `preventDefault` is harmless: navigation and typeahead still run. `stopPropagation` stops Base UI's key handling; the keyboard ring still runs. Defaults to `undefined`. */
  onKeyDownCapture?: HTMLAttributes<HTMLDivElement>['onKeyDownCapture']
  /** Where the submenu grows from (see Morph): its trigger row, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
  /** Keep the rows mounted (hidden) while the submenu is closed, so rows that run their own state keep it across opens. Defaults to `false`. */
  keepMounted?: boolean
}

/** The submenu's panel: the same rows and systems as `Dropdown.Content`, lifted 2 levels above the menu it came from. */
const DropdownSubContent = forwardRef<HTMLDivElement, DropdownSubContentProps>(
  (
    {
      children,
      className,
      positionerClassName,
      side = 'inline-end',
      align = 'start',
      sideOffset = 8,
      alignOffset = -4,
      collisionPadding,
      container,
      finalFocus,
      initialFocus,
      from,
      effect,
      tier = 'moderate',
      keepMounted = false,
      onKeyDownCapture,
      onMouseEnter,
      onMouseMove,
      onMouseLeave,
      onClick,
      onFocus,
      onBlur,
      ...popupProps
    },
    ref,
  ) => {
    const { open, origin } = useSubContext()
    const morph = useMorph(open, origin, { from, effect, tier })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])
    const level = Math.min(useSurface() + 2, 8)
    const containerRef = useRef<HTMLDivElement>(null)
    const panel = useMenuPanel(containerRef, open)
    const { hover, focusRow, setFocusedIndex } = panel
    const { handlers, setActiveIndex, registerItem, itemRects, remeasure } = hover

    useEffect(() => {
      if (open) remeasure()
    }, [open, remeasure])

    // Base UI's Menu.Popup has no `initialFocus`: the element takes focus a frame after the open.
    // Read through a ref: a fresh `{ current }` object each render must not re-run the effect.
    const initialFocusRef = useRef(initialFocus)
    initialFocusRef.current = initialFocus
    const hasInitialFocus = Boolean(initialFocus)
    useEffect(() => {
      if (!open || !hasInitialFocus) return
      const frame = requestAnimationFrame(() => initialFocusRef.current?.current?.focus())
      return () => cancelAnimationFrame(frame)
    }, [open, hasInitialFocus])

    const runs = useSelectionRuns(panel.valueChecked)
    const blocks = useMergeSplitBlocks(runs, itemRects, shape.bgRadius)

    const ctx = useMemo<DropdownContextValue>(
      () => ({
        registerItem,
        activeIndex: panel.lit,
        inMenu: true,
        renderMenuItem: renderPopupItem,
        pin: panel.pin,
        reportChecked: panel.reportChecked,
      }),
      [registerItem, panel.lit, panel.pin, panel.reportChecked],
    )

    return (
      <Menu.Portal keepMounted={keepMounted} container={container}>
        <Menu.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          className={cn('z-50 outline-none', positionerClassName)}
        >
          <Menu.Popup
            {...popupProps}
            ref={morph.popupRef}
            finalFocus={finalFocus}
            onKeyDownCapture={chain(onKeyDownCapture, e => ownEvent(e) && panel.trackKeyboardNav(e))}
            onMouseEnter={chain(onMouseEnter, () => {
              handlers.onMouseEnter()
              setFocusedIndex(null)
            })}
            onMouseMove={chain(onMouseMove, e => ownEvent(e) && handlers.onMouseMove(e))}
            onMouseLeave={chain(onMouseLeave, handlers.onMouseLeave)}
            onClick={chain(onClick, e => ownEvent(e) && handlers.onClick(e))}
            onFocus={chain(onFocus, e => {
              if (!ownEvent(e) || focusRow(e)) return
              if (e.target !== e.currentTarget) setActiveIndex(null)
            })}
            onBlur={chain(onBlur, e => {
              if (!ownEvent(e) || e.currentTarget.contains(e.relatedTarget as Node)) return
              setFocusedIndex(null)
              setActiveIndex(null)
            })}
            className="relative select-none outline-none"
          >
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shape.container}
                className={cn(
                  'flex w-56 max-w-[var(--available-width)] max-h-[min(480px,var(--available-height))] flex-col overflow-hidden',
                  shape.container,
                  className,
                )}
              >
                <ScrollArea className={popupScrollAreaClass} viewportClassName={cn(popupViewportClass, 'scroll-fade')}>
                  <div ref={containerRef} className="relative flex flex-col p-1">
                    <SelectionBackgrounds blocks={blocks} />
                    <FluidHoverHighlight hover={panel.shownHover} hidden={!open} className={shape.bg} />
                    <FocusRing rect={open ? panel.focusRect : null} shape="rounded" />
                    <RowOrderContext.Provider value={panel.rowOrder}>
                      <DropdownContext.Provider value={ctx}>{children}</DropdownContext.Provider>
                    </RowOrderContext.Provider>
                  </div>
                </ScrollArea>
              </MorphSurface>
            </SurfaceProvider>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    )
  },
)

DropdownSubContent.displayName = 'DropdownSubContent'

export type {
  DropdownCheckboxItemProps,
  DropdownGroupProps,
  DropdownRadioGroupProps,
  DropdownRadioItemProps,
  DropdownSubContentProps,
  DropdownSubProps,
  DropdownSubTriggerProps,
  MenuPopupProps,
  MenuPortalProps,
  MenuPositionerProps,
}
export {
  chain,
  DropdownCheckboxItem,
  DropdownGroup,
  DropdownGroupContext,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  mergeRefs,
  ownEvent,
  renderPopupItem,
  useMenuPanel,
  useValueChecked,
}
