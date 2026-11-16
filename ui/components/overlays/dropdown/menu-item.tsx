/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/menu-item.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useRef,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import { POPUP_SHAPE } from '../../../lib/popup'
import { CheckMark, RowIcon, rowClasses } from '../../../lib/popup-rows'
import { useRowIndex } from '../../../lib/row-index'
import { useSize } from '../../../lib/size-context'
import { useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'

/**
 * What a row hands to the popup's primitive wrapper: `element` is the styled
 * row (visuals and fluid-hover registration), `children` its content.
 */
export interface MenuItemRenderOptions {
  /** A boolean `checked` in single selection: a radio item. */
  radio: boolean
  /** A boolean `checked` in multiple selection: a checkbox item. Wins over `radio`. */
  checkbox: boolean
  checked?: boolean
  /** The row's index, which is also its radio value. */
  value: number
  disabled?: boolean
  label: string
  closeOnClick: boolean
  /** The row's activation. It goes on the primitive: Base UI's Enter / Space call only the primitive's own `onClick`. */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  element: ReactElement
  children: ReactNode
}

/** What a row reads from its panel (the inline Dropdown, or a menu popup). */
export interface DropdownContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  checkedIndex?: number
  multiple?: boolean
  checkedIndices?: number[]
  /** The rows render inside a Base UI menu, which owns roles, roving highlight, typeahead and activation. */
  inMenu?: boolean
  /** Popup only: wraps a row in the menu's item primitive. */
  renderMenuItem?: (opts: MenuItemRenderOptions) => ReactElement
  /** The panel owns its selection: a row with no `checked` reads it from the panel and toggles it on activation. */
  selfManaged?: boolean
  /** Toggles the row at an authored index. Present with `selfManaged`. */
  toggleIndex?: (sourceIndex: number) => void
  /** Popup only: keeps a row lit while it is `on` (a submenu's trigger while its submenu is open). */
  pin?: (index: number, on: boolean) => void
}

export const DropdownContext = createContext<DropdownContextValue | null>(null)

export function useDropdown() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('useDropdown must be used within a Dropdown')
  return ctx
}

interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading icon. Without one the row is text only, with no reserved icon column. */
  icon?: IconComponent
  /** The row's label; also what a `Dropdown.Search filter` matches. */
  label: string
  /** Position among the panel's rows, what the fluid hover and the selection key on. Omitted, the row takes its place in order (captions, rules and the search don't count). */
  index?: number
  /** A boolean makes the row a radio option (a checkbox one in multiple selection); leave it out for a plain action, unless the panel owns the selection. */
  checked?: boolean
  /** Called when the row is activated. */
  onSelect?: () => void
  /** Dims the row and takes it out of the hover and keyboard order. */
  disabled?: boolean
  /** Popup only: whether activating the row closes the menu. Defaults to `true`, `false` in multiple selection. */
  closeOnClick?: boolean
  /** Keyboard shortcut shown at the row's end, e.g. `⌘C`. Display only. */
  shortcut?: string
  /** Internal: the authored index, stamped by a filtering panel that re-indexed the rows. */
  sourceIndex?: number
}

function Shortcut({ children }: { children: string }) {
  const compact = useSize().variant === 'compact'
  return (
    <kbd
      className={cn('shrink-0 pl-4 font-sans text-muted-foreground', compact ? 'text-caption-compact' : 'text-caption')}
    >
      {children}
    </kbd>
  )
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (
    {
      icon: Icon,
      label,
      index: indexProp,
      checked,
      onSelect,
      disabled,
      closeOnClick,
      shortcut,
      sourceIndex,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const index = useRowIndex(indexProp)
    const internalRef = useRef<HTMLDivElement>(null)
    const mergedRef = useMergeRefs(internalRef, ref)
    const size = useSize()
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

    const panelChecked = multiple ? (checkedIndices?.includes(index) ?? false) : checkedIndex === index
    const isChecked = checked ?? (selfManaged ? panelChecked : undefined)
    const isCheckbox = !!multiple && typeof isChecked === 'boolean'
    const isRadio = !isCheckbox && typeof isChecked === 'boolean'
    const lit = activeIndex === index || !!isChecked

    useRegisterFluidHoverItem(registerItem, index, internalRef)

    // Selection is keyed on the authored index, which survives a filter's re-indexing.
    const activate = () => {
      onSelect?.()
      if (selfManaged) toggleIndex?.(sourceIndex ?? index)
    }

    const handleActivate = disabled
      ? undefined
      : (e: MouseEvent<HTMLDivElement>) => {
          onClick?.(e)
          activate()
        }

    const itemClassName = cn(rowClasses({ size, shape: POPUP_SHAPE, lit, disabled }), className)

    const content = (
      <>
        {Icon && <RowIcon icon={Icon} lit={lit} />}
        <WeightLabel emphasized={!!isChecked} trim className="flex-1">
          {label}
        </WeightLabel>
        {shortcut && <Shortcut>{shortcut}</Shortcut>}
        <CheckMark checked={!!isChecked} />
      </>
    )

    if (renderMenuItem) {
      return renderMenuItem({
        radio: isRadio,
        checkbox: isCheckbox,
        checked: isChecked,
        value: index,
        disabled,
        label,
        closeOnClick: closeOnClick ?? !multiple,
        onClick: handleActivate,
        element: (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the menu primitive this renders into sets the role.
          <div ref={mergedRef} data-fluid-hover-index={index} aria-label={label} className={itemClassName} {...props} />
        ),
        children: content,
      })
    }

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the role is picked per row below.
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the role is picked per row below.
      <div
        ref={mergedRef}
        data-fluid-hover-index={index}
        // Disabled rows are never the roving tab stop.
        tabIndex={!disabled && index === (checkedIndex ?? checkedIndices?.[0] ?? 0) ? 0 : -1}
        role={isCheckbox ? 'menuitemcheckbox' : isRadio ? 'menuitemradio' : 'menuitem'}
        aria-checked={typeof isChecked === 'boolean' ? isChecked : undefined}
        aria-disabled={disabled || undefined}
        aria-label={label}
        onClick={handleActivate}
        onKeyDown={e => {
          if (disabled || (e.key !== ' ' && e.key !== 'Enter')) return
          e.preventDefault()
          activate()
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
