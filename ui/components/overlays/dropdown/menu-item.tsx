// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/menu-item.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*` and
 *   `@/hooks/*` imports rewritten to `../../../lib/*`.
 * - Uncontrolled selection: when the surrounding panel owns the selection
 *   (`defaultCheckedIndex` / `defaultCheckedIndices` on Dropdown or
 *   Dropdown.Content, `selfManaged` in context), a row with no `checked` prop
 *   derives it from the panel and toggles the panel's state on activation —
 *   so a docs example can be interactive with no state of its own. An
 *   explicit `checked` still wins, and the controlled API is unchanged.
 * - `sourceIndex`: the row's authored index, stamped by a filtering panel
 *   (`Dropdown.Search filter`) that re-indexed the visible rows. Selection is
 *   keyed on it, fluid hover on the re-indexed `index`.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-*`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 * - Inside a popup the row's activation travels as `onClick` in the render
 *   options, for the primitive, instead of sitting on the render element:
 *   Base UI's Enter/Space activation calls only the primitive's own `onClick`
 *   prop, so a keyboard pick used to close the menu without selecting.
 * - Children-based rows (shadcn parity): `label` and `index` are optional.
 *   `children` stand in for the label (a string keeps the weight ghost; any
 *   other node is laid out as the row's own flex items, svgs sized to the
 *   ladder's icon); a row with no `index` takes its place in the panel's
 *   document order (`row-order.tsx`). `inset` pads a row to the icon column,
 *   `shortcut` adds a trailing `Dropdown.Shortcut`, `onSelect` receives a
 *   cancelable event (`preventDefault()` keeps the menu open), and the
 *   panel-owned selection only answers rows with an authored `index`.
 * - `kind` / `value` (internal): `Dropdown.CheckboxItem` and
 *   `Dropdown.RadioItem` force the selection primitive and hand the radio its
 *   real value; their checked rows report to the panel (`reportChecked`) for
 *   the merged selection background.
 * - `DropdownContextValue` gains `pin` (a submenu trigger keeps the panel's
 *   highlight while its submenu is open) and `reportChecked`.
 * - `render` / `asChild` (`lib/slot.ts`): the row becomes the given element
 *   (a link, a router `Link`), keeping its own props and ref; its children are
 *   the row's content. In the inline panel Enter and Space click it once, so a
 *   link navigates.
 * - `textValue`: the typeahead text of a row whose content is more than a
 *   string; it goes to the primitive's `label`.
 */

import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  createElement,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useRef,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { useRowSlot } from '../../../lib/row-order'
import { shapeMap } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { slotRender } from '../../../lib/slot'
import { spring } from '../../../lib/springs'
import { useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'

// MenuItem is only used inside Dropdown, which opts out of the global pill
// shape — see index.tsx for the rationale.
const shape = shapeMap.rounded

// ---------------------------------------------------------------------------
// Dropdown context — the single shared context for every Dropdown build.
//
// It lives here rather than in the dropdown module so that (a) MenuItem stays
// primitive-free and self-contained, and (b) dropdowns built on different
// primitives (Radix, Base UI) can render side by side — each provides this
// same context object, so MenuItem resolves whichever provider actually
// wraps it. The dropdown module re-exports useDropdown from here, keeping
// its public API unchanged.
// ---------------------------------------------------------------------------

/** What MenuItem hands to the popup's primitive wrapper. `element` is the
 *  styled row div (visuals + fluid hover registration, no children); `children`
 *  is the row content (icon, label, check). The dropdown wraps them in its
 *  own Item / RadioItem primitive, so MenuItem itself stays primitive-free. */
export interface MenuItemRenderOptions {
  /** Radio-style option (boolean `checked` on MenuItem) vs plain action item. */
  radio: boolean
  /** Checkbox-style option: a boolean `checked` inside a multiple-selection
   *  dropdown (`checkedIndices`). Takes precedence over `radio`. */
  checkbox: boolean
  /** The item's checked state (radio and checkbox items). */
  checked?: boolean
  /** The radio value: the item's index, or a `Dropdown.RadioItem`'s own value. */
  value: unknown
  disabled?: boolean
  /** Typeahead text. Undefined for a children-based row: the primitive reads its text content. */
  label?: string
  closeOnClick: boolean
  /** The row's activation. It goes on the primitive, not on `element`: Base
   *  UI's Enter/Space activation calls the primitive's own `onClick` prop and
   *  never sees a handler on the render element. */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  element: ReactElement
  children: ReactNode
}

export interface DropdownContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  checkedIndex?: number
  /** Multiple selection (`checkedIndices` on the dropdown): rows are
   *  checkbox items and activating one keeps the menu open by default. */
  multiple?: boolean
  checkedIndices?: number[]
  /** True when items render inside a Menu popup (DropdownContent), where the
   *  primitive's Item / RadioItem own roles, roving highlight, typeahead,
   *  and activation. MenuItem switches its rendering accordingly. */
  inMenu?: boolean
  /** Popup-only: wraps a MenuItem's styled div in the dropdown's menu-item
   *  primitive. Absent in the inline Dropdown panel, where MenuItem renders
   *  its own ARIA menuitem div. */
  renderMenuItem?: (opts: MenuItemRenderOptions) => ReactElement
  /** Local addition. The panel owns its selection (`defaultCheckedIndex` /
   *  `defaultCheckedIndices`), so a row with no `checked` prop takes its
   *  checked state from `checkedIndex` / `checkedIndices` and toggles the
   *  panel on activation. */
  selfManaged?: boolean
  /** Local addition. Toggles the row at an AUTHORED index (see
   *  `sourceIndex`). Present with `selfManaged`. */
  toggleIndex?: (sourceIndex: number) => void
  /** Local addition. Keeps the highlight on a row while its submenu is open. */
  pin?: (index: number, on: boolean) => void
  /** Local addition. A value-checked row (`Dropdown.CheckboxItem`,
   *  `Dropdown.RadioItem`) reports itself for the merged selection background. */
  reportChecked?: (index: number, on: boolean) => void
}

export const DropdownContext = createContext<DropdownContextValue | null>(null)

export function useDropdown() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('useDropdown must be used within a Dropdown')
  return ctx
}

/** Null-safe context read for callers that render outside a provider. */
export function useDropdownMaybe() {
  return useContext(DropdownContext)
}

/* `inset` swaps the row's padding for one that starts at the label column of
   a row with an icon: the ladder's padding + icon + gap (8+16+8, 6+14+4). */
export const INSET_PX = { default: 'pl-8 pr-2', compact: 'pl-6 pr-1.5' } as const
/* Children-based rows lay their nodes out as the row's own flex items; a
   bare svg among them takes the ladder's icon size. */
const FREEFORM_SVG = {
  default: '[&>svg]:size-4 [&>svg]:shrink-0',
  compact: '[&>svg]:size-3.5 [&>svg]:shrink-0',
} as const

interface MenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Optional leading icon. When omitted, the row renders text-only with no
   *  reserved icon column. */
  icon?: IconComponent
  /** The row text, also its typeahead text and what a `Dropdown.Search filter` matches. Omit it to pass the row's content as `children`. */
  label?: string
  /** Position among the panel's rows, for the index-based selection (`checkedIndex`). Omitted, the row takes its place in document order. */
  index?: number
  /** The row's content when there is no `label`: text, or any nodes (an svg among them takes the icon size). */
  children?: ReactNode
  /** When a boolean, the item is a radio-style option (role="menuitemradio"
   *  with aria-checked). When undefined, it is a plain action item
   *  (role="menuitem"), unless the panel owns the selection — then the row
   *  reads its checked state off the panel and toggles it on activation. */
  checked?: boolean
  /** Called when the row is picked, by pointer or keyboard. Call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: Event) => void
  /** Dims the row; the pointer and the keyboard skip it. Defaults to `false`. */
  disabled?: boolean
  /** Popup-only (inside DropdownContent): whether activating the item closes
   *  the menu. Ignored in the inline Dropdown panel. Defaults to `true` (`false` in multiple selection). */
  closeOnClick?: boolean
  /** Indents the row to the label column of rows with an icon. Defaults to `false`. */
  inset?: boolean
  /** A keyboard shortcut shown muted at the row's end, e.g. `⌘K` (see Dropdown.Shortcut). */
  shortcut?: ReactNode
  /** Typeahead text for a row whose content is more than a string (an icon beside markup): the key a press matches while the menu is open. Defaults to `label`, else the row's text `children`. */
  textValue?: string
  /** The element that becomes the row, e.g. a link: `render={<a href="/docs" />}`. Its own props and ref are kept, the row's classes and handlers are added, and its children are the row's content. */
  render?: ReactElement
  /** Compose onto the single child instead of `render`: `<Dropdown.Item asChild><a href="/docs">Docs</a></Dropdown.Item>`. Defaults to `false`. */
  asChild?: boolean
  /** Internal: the row's authored index, stamped by a filtering panel that
   *  re-indexed the visible rows. Selection is keyed on it. */
  sourceIndex?: number
  /** Internal: the selection primitive a `Dropdown.CheckboxItem` / `Dropdown.RadioItem` forces. */
  kind?: 'checkbox' | 'radio'
  /** Internal: a `Dropdown.RadioItem`'s value. */
  value?: unknown
  /** Internal: keeps the panel's highlight on the row (a `Dropdown.SubTrigger` whose submenu is open). */
  pinned?: boolean
}

interface DropdownShortcutProps extends HTMLAttributes<HTMLElement> {
  /** The keys, e.g. `⇧⌘P`. */
  children?: ReactNode
  /** Extra classes. */
  className?: string
}

/** A muted caption at the end of a row: the row's keyboard shortcut. */
const DropdownShortcut = forwardRef<HTMLElement, DropdownShortcutProps>(({ className, ...props }, ref) => {
  const compact = useSize().variant === 'compact'
  return (
    <kbd
      ref={ref}
      className={cn(
        'ml-auto shrink-0 pl-4 font-sans text-muted-foreground',
        compact ? 'text-caption-compact' : 'text-caption',
        className,
      )}
      {...props}
    />
  )
})

DropdownShortcut.displayName = 'DropdownShortcut'

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (
    {
      icon: Icon,
      label,
      textValue,
      render,
      asChild,
      index: indexProp,
      children: childrenProp,
      checked,
      onSelect,
      disabled,
      closeOnClick,
      inset,
      shortcut,
      sourceIndex,
      kind,
      value,
      pinned,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const slot = slotRender(render, asChild, childrenProp)
    // The slot element's own children are the row's content.
    const children = slot ? (slot.props as { children?: ReactNode }).children : childrenProp
    const hasMounted = useRef(false)
    const {
      registerItem,
      activeIndex,
      checkedIndex,
      multiple,
      checkedIndices,
      renderMenuItem,
      selfManaged,
      toggleIndex,
      reportChecked,
      pin,
    } = useDropdown()
    const { index, firstRow } = useRowSlot(internalRef, indexProp)
    // The panel's index-keyed selection answers only rows written with an index.
    const authored = indexProp !== undefined

    // Uncontrolled panels answer for rows that brought no `checked` of their
    // own; a row that did keeps it.
    const panelChecked = multiple ? (checkedIndices?.includes(indexProp ?? -1) ?? false) : checkedIndex === indexProp
    const isChecked = checked ?? (selfManaged && authored ? panelChecked : undefined)
    const isCheckbox = kind ? kind === 'checkbox' : !!multiple && typeof isChecked === 'boolean'
    const isRadio = kind ? kind === 'radio' : !isCheckbox && typeof isChecked === 'boolean'

    useRegisterFluidHoverItem(registerItem, index, internalRef)

    useEffect(() => {
      if (!kind || !isChecked || index === undefined || !reportChecked) return
      reportChecked(index, true)
      return () => reportChecked(index, false)
    }, [kind, isChecked, index, reportChecked])

    useEffect(() => {
      if (!pinned || index === undefined || !pin) return
      pin(index, true)
      return () => pin(index, false)
    }, [pinned, index, pin])

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const isActive = index !== undefined && activeIndex === index
    const skipAnimation = !hasMounted.current
    const sizeClasses = useSize()
    const text = label ?? (typeof children === 'string' ? children : undefined)
    const freeform = label === undefined && text === undefined
    const lit = isActive || isChecked

    const slotRef = slot ? (slot as ReactElement & { ref?: Ref<HTMLElement> }).ref : undefined
    const mergeRef = (node: HTMLDivElement | null) => {
      ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      for (const target of [ref, slotRef]) {
        if (typeof target === 'function') target(node)
        else if (target) (target as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    }

    // The row element: a div, or the slot element with the row's props on top of its own.
    // The caller's own props come last, as they always did.
    const rowElement = (extra?: object) => {
      const rowProps = {
        ref: mergeRef,
        'data-fluid-hover-index': index,
        ...(label !== undefined && { 'aria-label': label }),
        ...extra,
        ...props,
      }
      if (!slot) return <div {...rowProps} className={itemClassName} />
      // Built without the slot's own children, which would win over the row's content in the primitive.
      const { children: _content, ...slotProps } = slot.props as { children?: ReactNode; className?: string }
      return createElement(slot.type, { ...slotProps, ...rowProps, className: cn(slotProps.className, itemClassName) })
    }

    // Selection is keyed on the authored index, which survives a filtering
    // panel's re-indexing of the visible rows. Returns whether the consumer
    // asked to keep the menu open.
    const activate = () => {
      const event = new Event('select', { cancelable: true })
      onSelect?.(event)
      if (selfManaged && authored && !kind) toggleIndex?.(sourceIndex ?? indexProp)
      return event.defaultPrevented
    }

    const handleActivate = disabled
      ? undefined
      : (e: React.MouseEvent<HTMLDivElement>) => {
          onClick?.(e)
          // Base UI's own close runs after this handler unless prevented.
          if (activate()) (e as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.()
        }

    const itemClassName = cn(
      // Fixed height (was py-2 around a 19.5px line box ≈ 35.5px) so the
      // text-box trim on the label doesn't shrink the row. shrink-0 because
      // menu popups are max-height flex columns — without it a long list
      // compresses rows to fit instead of scrolling.
      `relative z-10 flex ${sizeClasses.control} shrink-0 items-center ${sizeClasses.gap} ${shape.item} ${inset ? INSET_PX[sizeClasses.variant] : sizeClasses.itemPx} cursor-pointer outline-none`,
      freeform && [
        sizeClasses.text,
        FREEFORM_SVG[sizeClasses.variant],
        'min-w-0 transition-[color,font-variation-settings] duration-fast',
        lit ? 'text-foreground' : 'text-muted-foreground',
        isChecked ? 'weight-semibold' : 'weight-normal',
      ],
      disabled && 'opacity-50 pointer-events-none',
      className,
    )

    const content = (
      <>
        {Icon && (
          <span className="inline-grid">
            <span className="col-start-1 row-start-1 invisible">
              <Icon size={sizeClasses.icon} strokeWidth={2} />
            </span>
            <Icon
              size={sizeClasses.icon}
              strokeWidth={lit ? 2 : 1.5}
              className={cn(
                'col-start-1 row-start-1 transition-[color,stroke-width] duration-fast',
                lit ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </span>
        )}
        {text !== undefined && (
          // Both stacked spans carry the text-box trim so the invisible bold
          // sizer and the visible label keep identical boxes.
          <span className={cn('inline-grid min-w-0 flex-1', sizeClasses.text)}>
            <span
              className="col-start-1 row-start-1 invisible truncate [text-box:trim-both_cap_alphabetic] weight-semibold"
              aria-hidden="true"
            >
              {text}
            </span>
            <span
              className={cn(
                'col-start-1 row-start-1 truncate transition-[color,font-variation-settings] duration-fast [text-box:trim-both_cap_alphabetic]',
                lit ? 'text-foreground' : 'text-muted-foreground',
                isChecked ? 'weight-semibold' : 'weight-normal',
              )}
            >
              {text}
            </span>
          </span>
        )}
        {label !== undefined || freeform ? children : null}
        {shortcut != null && <DropdownShortcut>{shortcut}</DropdownShortcut>}
        <AnimatePresence>
          {isChecked && (
            <motion.svg
              key="check"
              width={sizeClasses.icon}
              height={sizeClasses.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn('text-foreground shrink-0', freeform && shortcut == null && 'ml-auto')}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <motion.path
                d="M4 12L9 17L20 6"
                initial={{ pathLength: skipAnimation ? 1 : 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: spring.fast.duration, ease: 'easeOut' },
                }}
                exit={{
                  pathLength: 0,
                  transition: { duration: 0.04, ease: 'easeIn' },
                }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </>
    )

    if (renderMenuItem) {
      // Inside DropdownContent, the menu-item primitive (supplied by the
      // surrounding DropdownContent through context) owns the role,
      // aria-checked, tabIndex, roving highlight, typeahead, and Enter/Space/
      // click activation (handleActivate rides on the primitive, whose
      // keyboard activation calls it too). The styled div carries the Fluid
      // Functionalism visuals and the fluid-hover registration; MenuItem
      // itself imports no primitive.
      return renderMenuItem({
        radio: isRadio,
        checkbox: isCheckbox,
        checked: isChecked,
        value: kind === 'radio' ? value : index,
        disabled,
        label: textValue ?? text,
        // Toggling one of several stays open; picking one of one closes.
        closeOnClick: closeOnClick ?? (kind ? kind === 'radio' : !multiple),
        onClick: handleActivate,
        element: rowElement(),
        children: content,
      })
    }

    // The roving tab stop: the checked row, else the first one.
    const tabStop = authored ? (checkedIndex ?? checkedIndices?.[0] ?? 0) : firstRow
    const slotOnClick = (slot?.props as { onClick?: (e: React.MouseEvent<HTMLDivElement>) => void } | undefined)
      ?.onClick
    return rowElement({
      // Disabled items are never the roving tab stop.
      tabIndex: !disabled && index === tabStop ? 0 : -1,
      role: isCheckbox ? 'menuitemcheckbox' : isRadio ? 'menuitemradio' : 'menuitem',
      'aria-checked': typeof isChecked === 'boolean' ? isChecked : undefined,
      'aria-disabled': disabled || undefined,
      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
        slotOnClick?.(e)
        handleActivate?.(e)
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          // A slot element is clicked once: a link navigates, its own handlers run.
          if (slot) e.currentTarget.click()
          else activate()
        }
      },
      children: content,
    })
  },
)

MenuItem.displayName = 'MenuItem'

export type { DropdownShortcutProps, MenuItemProps }
export { DropdownShortcut, MenuItem }
export default MenuItem
