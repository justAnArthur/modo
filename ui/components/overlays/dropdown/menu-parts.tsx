/*
 * Local addition (not part of Fluid Functionalism): the children-based menu
 * parts shadcn's DropdownMenu has, on Base UI's Menu (`Menu.Group`,
 * `Menu.GroupLabel`, `Menu.RadioGroup`). The rows are `MenuRow`s keyed on
 * their own state or value instead of the panel's index; checked ones report
 * to the panel for the merged selection background.
 */

'use client'

import { Menu } from '@base-ui/react/menu'
import { createContext, forwardRef, type HTMLAttributes, type ReactNode, useContext, useMemo } from 'react'
import { PopupLabel } from '../../../lib/popup-rows'
import { useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { type MenuItemProps, MenuRow } from './menu-item'

/** True inside a `Dropdown.Group`, where `Dropdown.Label` names the group. */
const DropdownGroupContext = createContext(false)

interface DropdownGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Rows, with an optional `Dropdown.Label` first: it becomes the group's accessible name. */
  children?: ReactNode
}

/** A run of related rows (`role="group"`), named by the `Dropdown.Label` inside it. */
const DropdownGroup = forwardRef<HTMLDivElement, DropdownGroupProps>(({ className, ...props }, ref) => (
  <DropdownGroupContext.Provider value={true}>
    <Menu.Group ref={ref} className={cn('flex flex-col', className)} {...props} />
  </DropdownGroupContext.Provider>
))

DropdownGroup.displayName = 'DropdownGroup'

interface DropdownLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** Indents the caption to the label column of rows with an icon. Defaults to `false`. */
  inset?: boolean
}

/** A caption over a run of rows; inside a `Dropdown.Group` it names the group. */
const DropdownLabel = forwardRef<HTMLDivElement, DropdownLabelProps>(({ inset = false, className, ...props }, ref) => {
  const inGroup = useContext(DropdownGroupContext)
  const compact = useSize().variant === 'compact'
  // Starts where a row's label does: the ladder's padding + icon + gap.
  const classes = cn(inset && (compact ? 'pl-6' : 'pl-8'), className)
  if (inGroup) return <Menu.GroupLabel ref={ref} render={<PopupLabel className={classes} />} {...props} />
  return <PopupLabel ref={ref} className={classes} {...props} />
})

DropdownLabel.displayName = 'DropdownLabel'

/** The row props the value-keyed rows share with `Dropdown.Item`. */
type ValueRowProps = Omit<MenuItemProps, 'checked' | 'defaultChecked' | 'sourceIndex'>

interface DropdownCheckboxItemProps extends ValueRowProps {
  /** Whether the row is checked. Pair with `onCheckedChange`. */
  checked?: boolean
  /** Initial checked state, for an uncontrolled row. Defaults to `false`. */
  defaultChecked?: boolean
  /** Called with the new state when the row is toggled. */
  onCheckedChange?: (checked: boolean) => void
  /** Popup only: whether toggling closes the menu. Defaults to `false`. */
  closeOnClick?: boolean
}

/** A row that toggles itself on and off (`role="menuitemcheckbox"`), keyed on its own state rather than an index. */
const DropdownCheckboxItem = forwardRef<HTMLDivElement, DropdownCheckboxItemProps>(
  ({ checked, defaultChecked = false, onCheckedChange, onSelect, closeOnClick = false, ...props }, ref) => {
    const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange)
    return (
      <MenuRow
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
}

/** One choice among its `Dropdown.RadioItem` rows, keyed on their `value`. */
const DropdownRadioGroup = forwardRef<HTMLDivElement, DropdownRadioGroupProps>(
  ({ value, defaultValue, onValueChange, className, ...props }, ref) => {
    const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange)
    const ctx = useMemo(() => ({ value: current, select: setCurrent }), [current, setCurrent])
    return (
      <RadioValueContext.Provider value={ctx}>
        <DropdownGroupContext.Provider value={false}>
          <Menu.RadioGroup ref={ref} value={current ?? null} className={cn('flex flex-col', className)} {...props} />
        </DropdownGroupContext.Provider>
      </RadioValueContext.Provider>
    )
  },
)

DropdownRadioGroup.displayName = 'DropdownRadioGroup'

interface DropdownRadioItemProps extends ValueRowProps {
  /** The value this row stands for in its `Dropdown.RadioGroup`. */
  value: string
  /** Popup only: whether picking the row closes the menu. Defaults to `true`. */
  closeOnClick?: boolean
}

/** A row of a `Dropdown.RadioGroup` (`role="menuitemradio"`), checked while the group's value is its `value`. */
const DropdownRadioItem = forwardRef<HTMLDivElement, DropdownRadioItemProps>(({ value, onSelect, ...props }, ref) => {
  const group = useContext(RadioValueContext)
  return (
    <MenuRow
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

export type {
  DropdownCheckboxItemProps,
  DropdownGroupProps,
  DropdownLabelProps,
  DropdownRadioGroupProps,
  DropdownRadioItemProps,
}
export { DropdownCheckboxItem, DropdownGroup, DropdownLabel, DropdownRadioGroup, DropdownRadioItem }
