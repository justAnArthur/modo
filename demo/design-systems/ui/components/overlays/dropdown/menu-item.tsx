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
 */

import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { shapeMap } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
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
  /** The item's index — doubles as the radio value. */
  value: number
  disabled?: boolean
  label: string
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

interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional leading icon. When omitted, the row renders text-only with no
   *  reserved icon column. */
  icon?: IconComponent
  label: string
  index: number
  /** When a boolean, the item is a radio-style option (role="menuitemradio"
   *  with aria-checked). When undefined, it is a plain action item
   *  (role="menuitem"), unless the panel owns the selection — then the row
   *  reads its checked state off the panel and toggles it on activation. */
  checked?: boolean
  onSelect?: () => void
  disabled?: boolean
  /** Popup-only (inside DropdownContent): whether activating the item closes
   *  the menu. Ignored in the inline Dropdown panel. @default true */
  closeOnClick?: boolean
  /** Internal: the row's authored index, stamped by a filtering panel that
   *  re-indexed the visible rows. Selection is keyed on it. */
  sourceIndex?: number
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (
    { icon: Icon, label, index, checked, onSelect, disabled, closeOnClick, sourceIndex, className, onClick, ...props },
    ref,
  ) => {
    const internalRef = useRef<HTMLDivElement>(null)
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
    } = useDropdown()

    // Uncontrolled panels answer for rows that brought no `checked` of their
    // own; a row that did keeps it.
    const panelChecked = multiple ? (checkedIndices?.includes(index) ?? false) : checkedIndex === index
    const isChecked = checked ?? (selfManaged ? panelChecked : undefined)
    const isCheckbox = !!multiple && typeof isChecked === 'boolean'

    useRegisterFluidHoverItem(registerItem, index, internalRef)

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const isActive = activeIndex === index
    const skipAnimation = !hasMounted.current
    const sizeClasses = useSize()

    const mergeRef = (node: HTMLDivElement | null) => {
      ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    }

    // Selection is keyed on the authored index, which survives a filtering
    // panel's re-indexing of the visible rows.
    const activate = () => {
      onSelect?.()
      if (selfManaged) toggleIndex?.(sourceIndex ?? index)
    }

    const handleActivate = disabled
      ? undefined
      : (e: React.MouseEvent<HTMLDivElement>) => {
          onClick?.(e)
          activate()
        }

    const itemClassName = cn(
      // Fixed height (was py-2 around a 19.5px line box ≈ 35.5px) so the
      // text-box trim on the label doesn't shrink the row. shrink-0 because
      // menu popups are max-height flex columns — without it a long list
      // compresses rows to fit instead of scrolling.
      `relative z-10 flex ${sizeClasses.control} shrink-0 items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.itemPx} cursor-pointer outline-none`,
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
              strokeWidth={isActive || isChecked ? 2 : 1.5}
              className={cn(
                'col-start-1 row-start-1 transition-[color,stroke-width] duration-fast',
                isActive || isChecked ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </span>
        )}
        {/* Both stacked spans carry the text-box trim so the invisible bold
            sizer and the visible label keep identical boxes. */}
        <span className={cn('inline-grid flex-1', sizeClasses.text)}>
          <span
            className="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic] weight-semibold"
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast [text-box:trim-both_cap_alphabetic]',
              isActive || isChecked ? 'text-foreground' : 'text-muted-foreground',
              isChecked ? 'weight-semibold' : 'weight-normal',
            )}
          >
            {label}
          </span>
        </span>
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
              className="text-foreground shrink-0"
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
        radio: !isCheckbox && typeof isChecked === 'boolean',
        checkbox: isCheckbox,
        checked: isChecked,
        value: index,
        disabled,
        label,
        // Toggling one of several stays open; picking one of one closes.
        closeOnClick: closeOnClick ?? !multiple,
        onClick: handleActivate,
        element: (
          <div ref={mergeRef} data-fluid-hover-index={index} aria-label={label} className={itemClassName} {...props} />
        ),
        children: content,
      })
    }

    return (
      <div
        ref={mergeRef}
        data-fluid-hover-index={index}
        // Disabled items are never the roving tab stop.
        tabIndex={!disabled && index === (checkedIndex ?? checkedIndices?.[0] ?? 0) ? 0 : -1}
        role={isCheckbox ? 'menuitemcheckbox' : typeof isChecked === 'boolean' ? 'menuitemradio' : 'menuitem'}
        aria-checked={typeof isChecked === 'boolean' ? isChecked : undefined}
        aria-disabled={disabled || undefined}
        aria-label={label}
        onClick={handleActivate}
        onKeyDown={e => {
          if (disabled) return
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            activate()
          }
        }}
        className={itemClassName}
        {...props}
      >
        {content}
      </div>
    )
  },
)

MenuItem.displayName = 'MenuItem'

export type { MenuItemProps }
export { MenuItem }
export default MenuItem
