/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/menu-item.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useEffect,
  useRef,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import { POPUP_SHAPE } from '../../../lib/popup'
import { CheckMark, RowIcon, rowClasses } from '../../../lib/popup-rows'
import { useRowSlot } from '../../../lib/row-order'
import { useSize } from '../../../lib/size-context'
import { resolveSlotTemplate, slotElement } from '../../../lib/slot'
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
  /** The radio value: the row's index, or a `Dropdown.RadioItem`'s own value. */
  value: unknown
  disabled?: boolean
  /** Typeahead text. Undefined for a row of nodes: the primitive reads its text content. */
  label?: string
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
  /** A value-checked row (`Dropdown.CheckboxItem`, `Dropdown.RadioItem`) reports itself for the merged selection background. */
  reportChecked?: (index: number, on: boolean) => void
}

export const DropdownContext = createContext<DropdownContextValue | null>(null)

export function useDropdown() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('useDropdown must be used within a Dropdown')
  return ctx
}

interface MenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Leading icon. Without one the row is text only, with no reserved icon column. */
  icon?: IconComponent
  /** The row's text; also its typeahead text and what a `Dropdown.Search filter` matches. Omit it to pass the row's content as `children`. */
  label?: string
  /** The row's content when there is no `label`: text, or nodes laid out as the row's own (an svg among them takes the icon size). With a `label`, nodes after it. */
  children?: ReactNode
  /** The row's text for typeahead and a `Dropdown.Search filter` when its content is more than a string. Defaults to `label`, else the text `children`. */
  textValue?: string
  /** Position among the panel's rows, what the fluid hover and the selection key on. Omitted, the row takes its place in document order, inside groups and conditions too (captions, rules and the search don't count). */
  index?: number
  /** A boolean makes the row a radio option (a checkbox one in multiple selection); leave it out for a plain action, unless the panel owns the selection. */
  checked?: boolean
  /** Called when the row is activated, by pointer or keyboard. In a popup, `event.preventDefault()` keeps the menu open. */
  onSelect?: (event: Event) => void
  /** Dims the row and takes it out of the hover and keyboard order. */
  disabled?: boolean
  /** Popup only: whether activating the row closes the menu. Defaults to `true`, `false` in multiple selection. */
  closeOnClick?: boolean
  /** Indents the row to the label column of rows with an icon. Defaults to `false`. */
  inset?: boolean
  /** Keyboard shortcut shown at the row's end, e.g. `⌘C` (see `Dropdown.Shortcut`). Display only. */
  shortcut?: ReactNode
  /** The element that becomes the row, e.g. a link: `render={<a href="/docs" />}`. It keeps its own props and ref and takes the row's on top. */
  render?: ReactElement
  /** Compose onto the single child instead of `render`: `<Dropdown.Item asChild><a href="/docs">Docs</a></Dropdown.Item>`; its children are the row's content. Defaults to `false`. */
  asChild?: boolean
  /** Internal: the authored index, stamped by a filtering panel that re-indexed the rows. */
  sourceIndex?: number
}

/** What the row parts (`Dropdown.CheckboxItem`, `Dropdown.RadioItem`, `Dropdown.SubTrigger`) hand a row besides its public props. */
interface MenuRowProps extends MenuItemProps {
  /** The selection primitive a value-checked row forces. */
  kind?: 'checkbox' | 'radio'
  /** A `Dropdown.RadioItem`'s value. */
  value?: string
  /** Keeps the panel's highlight on the row (a `Dropdown.SubTrigger` whose submenu is open). */
  pinned?: boolean
}

interface DropdownShortcutProps extends HTMLAttributes<HTMLElement> {
  /** The keys, e.g. `⇧⌘P`. */
  children?: ReactNode
}

/** A muted caption at a row's end: its keyboard shortcut. Display only. */
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

/* `inset` starts the row at the label column of a row with an icon: the ladder's padding + icon + gap (8+16+8, 6+14+4). */
const INSET_PX = { default: 'pl-8 pr-2', compact: 'pl-6 pr-1.5' } as const

/* A row of nodes lays them out as its own flex items; a bare svg among them takes the ladder's icon size. */
const FREEFORM_SVG = {
  default: '[&>svg]:size-4 [&>svg]:shrink-0',
  compact: '[&>svg]:size-3.5 [&>svg]:shrink-0',
} as const

const MenuRow = forwardRef<HTMLDivElement, MenuRowProps>(
  (
    {
      icon: Icon,
      label,
      children: childrenProp,
      textValue,
      index: indexProp,
      checked,
      onSelect,
      disabled,
      closeOnClick,
      inset = false,
      shortcut,
      render,
      asChild,
      sourceIndex,
      kind,
      value,
      pinned = false,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
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
      pin,
      reportChecked,
    } = useDropdown()
    const { index, firstRow } = useRowSlot(internalRef, indexProp)
    const { template, content: children } = resolveSlotTemplate(render, asChild, childrenProp)

    const panelChecked =
      index !== undefined && (multiple ? (checkedIndices?.includes(index) ?? false) : checkedIndex === index)
    const isChecked = checked ?? (selfManaged ? panelChecked : undefined)
    const isCheckbox = kind ? kind === 'checkbox' : !!multiple && typeof isChecked === 'boolean'
    const isRadio = kind ? kind === 'radio' : !isCheckbox && typeof isChecked === 'boolean'
    const lit = (index !== undefined && activeIndex === index) || !!isChecked
    const text = label ?? (typeof children === 'string' ? children : undefined)
    const freeform = text === undefined

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

    // Selection is keyed on the authored index, which survives a filter's re-indexing. True when the menu should stay open.
    const activate = () => {
      const event = new Event('select', { cancelable: true })
      onSelect?.(event)
      const source = sourceIndex ?? index
      if (selfManaged && !kind && source !== undefined) toggleIndex?.(source)
      return event.defaultPrevented
    }

    const handleActivate = disabled
      ? undefined
      : (e: MouseEvent<HTMLDivElement>) => {
          onClick?.(e)
          // Base UI's own close runs after this handler unless it is prevented.
          if (activate()) (e as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.()
        }

    const itemClassName = cn(
      rowClasses({ size, shape: POPUP_SHAPE, lit, disabled }),
      inset && INSET_PX[size.variant],
      freeform && ['min-w-0', FREEFORM_SVG[size.variant], isChecked ? 'weight-semibold' : 'weight-normal'],
      className,
    )

    const check = <CheckMark checked={!!isChecked} />
    const content = (
      <>
        {Icon && <RowIcon icon={Icon} lit={lit} />}
        {text !== undefined && (
          <WeightLabel emphasized={!!isChecked} trim className="flex-1">
            {text}
          </WeightLabel>
        )}
        {label !== undefined || freeform ? children : null}
        {shortcut != null && <DropdownShortcut>{shortcut}</DropdownShortcut>}
        {freeform && shortcut == null ? <span className="ml-auto flex shrink-0">{check}</span> : check}
      </>
    )

    // The row: a div, or the slot element with the row's props merged onto its own.
    const rowElement = (extra: Record<string, unknown>, inner?: ReactNode) =>
      slotElement(
        template,
        'div',
        {
          ref: mergedRef,
          'data-fluid-hover-index': index,
          ...(label !== undefined && { 'aria-label': label }),
          ...extra,
          ...props,
          className: itemClassName,
        },
        inner,
      )

    if (renderMenuItem) {
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
        element: rowElement({}),
        children: content,
      })
    }

    // The roving tab stop: the checked row, else the first one. Disabled rows never are.
    const tabStop = checkedIndex ?? checkedIndices?.[0] ?? firstRow ?? 0
    return rowElement(
      {
        tabIndex: !disabled && index === tabStop ? 0 : -1,
        role: isCheckbox ? 'menuitemcheckbox' : isRadio ? 'menuitemradio' : 'menuitem',
        'aria-checked': typeof isChecked === 'boolean' ? isChecked : undefined,
        'aria-disabled': disabled || undefined,
        onClick: handleActivate,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (disabled || (e.key !== ' ' && e.key !== 'Enter')) return
          e.preventDefault()
          // A slot element is clicked once: a link navigates, its own handlers run.
          if (template) e.currentTarget.click()
          else activate()
        },
      },
      content,
    )
  },
)

MenuRow.displayName = 'MenuItem'

/** A menu row: `label` or `children`, an optional `index`, `icon`, `inset`, `shortcut`, `checked`, `onSelect`. */
const MenuItem = MenuRow as ForwardRefExoticComponent<MenuItemProps & RefAttributes<HTMLDivElement>>

export type { DropdownShortcutProps, MenuItemProps, MenuRowProps }
export { DropdownShortcut, MenuItem, MenuRow }
export default MenuItem
