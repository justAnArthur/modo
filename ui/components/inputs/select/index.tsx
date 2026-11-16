/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/select.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import {
  Children,
  createContext,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useFieldBox, useFieldState } from '../../../lib/field-box'
import { type FieldVariant, fieldIconClasses } from '../../../lib/field-classes'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import type { IconComponent } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import {
  type AnchorProps,
  type OpenChangeDetails,
  OverlayContext,
  positionerProps,
  useOverlay,
  useOverlayRoot,
  usePortalContainer,
} from '../../../lib/overlay'
import { isDisabledRow, POPUP_SHAPE, popupScrollAreaClass, popupViewportClass } from '../../../lib/popup'
import {
  CheckMark,
  isTextLabel,
  PopupLabel,
  PopupSeparator,
  RowIcon,
  rowClasses,
  rowLabelBoxClass,
  rowLabelClass,
} from '../../../lib/popup-rows'
import { PopupSurface } from '../../../lib/popup-surface'
import { useRowFocus } from '../../../lib/row-group'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { useKeyboardNavGate } from '../../../lib/use-keyboard-nav-gate'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { ScrollArea } from '../../../primitives/scroll-area'
import { SizeScope } from '../../../primitives/sizes'

// A pick holds the popup open this long, so the check drawing in and the
// selected background springing to the row are seen before the close.
const selectionAckMs = 300

interface SelectContextValue {
  value: string
  disabled: boolean
  readOnly: boolean
  /** Each `Select.Item`'s place in document order, by value: a row's index when it sets none. */
  indexByValue: Map<string, number>
  /** Whether the picked row's label is plain text (trimmed and truncated in the trigger) or a node (laid out as is). */
  textLabel: boolean
}

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error('Select compound components must be inside <Select>')
  return ctx
}

interface SelectContentContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  /** A checked row reports its index, so the content can place the selected background. */
  setCheckedIndex: (update: (index: number | undefined) => number | undefined) => void
}

const SelectContentContext = createContext<SelectContentContextValue | null>(null)

/**
 * The `{ value, label }` pairs of the `Select.Item` children in document
 * order, through groups, maps and conditionals. Base UI's `items` takes them,
 * so the trigger shows an initial value's label, whatever node it is, before
 * the popup has ever mounted; their order numbers the rows.
 */
function collectSelectItems(node: ReactNode, out: { value: string; label: ReactNode }[] = []) {
  Children.forEach(node, child => {
    if (!isValidElement(child)) return
    const props = child.props as { value?: unknown; children?: ReactNode }
    if (typeof props.value === 'string') {
      out.push({ value: props.value, label: props.children ?? props.value })
    } else if (props.children) {
      collectSelectItems(props.children, out)
    }
  })
  return out
}

interface SelectProps {
  /** `Select.Trigger` and `Select.Content`. */
  children: ReactNode
  /** Controlled selected value. Pair with `onValueChange`. */
  value?: string
  /** Uncontrolled default value — the select then keeps the selection itself. */
  defaultValue?: string
  /** Called when the selected value changes. */
  onValueChange?: (value: string) => void
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled select. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the popup opens or closes; after a pick, once the 300ms acknowledgment has run. */
  onOpenChange?: (open: boolean) => void
  /** Disables the entire select. Defaults to `false`. */
  disabled?: boolean
  /** Shows the value but takes no pick: the popup stays shut. Defaults to `false`. */
  readOnly?: boolean
  /** Name for form submission (renders a hidden native input). */
  name?: string
  /** Marks the select as required in forms. Defaults to `false`. */
  required?: boolean
  /** Pins trigger and popup to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, both follow the surrounding SizeProvider. */
  size?: SizeVariant
}

interface SelectValueProps {
  /** Shown, muted, while nothing is selected. Defaults to `"Select…"`. */
  placeholder?: ReactNode
  /** Extra classes for the value slot. */
  className?: string
}

/** The trigger's value slot: the picked row's label, else the muted placeholder. */
function SelectValue({ placeholder = 'Select…', className }: SelectValueProps) {
  const { textLabel } = useSelectContext()
  return (
    <SelectPrimitive.Value
      placeholder={placeholder}
      className={cn(
        textLabel ? rowLabelClass : 'flex min-w-0 flex-1 items-center',
        'text-left text-foreground data-[placeholder]:text-muted-foreground',
        className,
      )}
    />
  )
}

SelectValue.displayName = 'SelectValue'

interface SelectTriggerProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Replaces the built-in value slot, typically with a `Select.Value`. The icon and chevron stay. */
  children?: ReactNode
  /** Framed at rest, or invisible until hovered or focused. Defaults to `"bordered"`. */
  variant?: FieldVariant
  /** Optional icon displayed before the value. */
  icon?: IconComponent
  /** Text shown when no value is selected. Defaults to `"Select…"`. */
  placeholder?: string
  /** Error message shown below the trigger; also turns the field destructive and sets `aria-invalid`. */
  error?: string
  /** Size override for the trigger alone. Prefer the `size` prop on `<Select>` (or a surrounding SizeProvider) so the popup matches. */
  size?: SizeVariant
  /** Extra classes for the trigger button. */
  className?: string
}

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, variant = 'bordered', icon: Icon, placeholder = 'Select…', error, size, children, ...props }, ref) => {
    const { disabled, readOnly } = useSelectContext()
    const field = useFieldBox({ variant, invalid: error ? true : undefined, disabled, readOnly, size })
    const sizeClasses = field.size
    const compact = sizeClasses.variant === 'compact'

    return (
      <div className="flex flex-col gap-1">
        <SelectPrimitive.Trigger
          ref={ref}
          aria-invalid={field.invalid || undefined}
          {...field.props}
          className={cn(
            field.props.className,
            'flex items-center justify-between cursor-pointer outline-none focus-visible:ring-focus-ring',
            sizeClasses.control,
            sizeClasses.text,
            sizeClasses.gap,
            compact ? 'min-w-[128px]' : 'min-w-[160px]',
            className,
          )}
          {...props}
        >
          <span className={cn('flex min-w-0 flex-1 items-center', sizeClasses.gap)}>
            {Icon && <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />}
            {children ?? <SelectValue placeholder={placeholder} />}
          </span>
          <svg
            aria-hidden
            width={sizeClasses.icon}
            height={sizeClasses.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted-foreground transition-colors duration-fast group-hover/field:text-foreground"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </SelectPrimitive.Trigger>
        {error && <span className="text-caption text-destructive pl-3">{error}</span>}
      </div>
    )
  },
)

SelectTrigger.displayName = 'SelectTrigger'

interface SelectContentProps extends AnchorProps, MorphProps, Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Additional classes for the menu container. */
  className?: string
  /** `Select.Item`, `Select.Group`, `Select.Label`, `Select.Separator`. */
  children: ReactNode
}

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  (
    { side, align, sideOffset, container, from, effect, hideSource, tier = 'moderate', className, children, ...props },
    ref,
  ) => {
    const { open, origin } = useOverlay('Select.Content')
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)
    const containerRef = useRef<HTMLDivElement>(null)
    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, setActiveIndex, itemRects, isMeasured, handlers, registerItem, remeasure } = hover
    const [checkedIndex, setCheckedIndex] = useState<number | undefined>(undefined)

    // Seeded from the trigger's :focus-visible at open, earned by navigation keys inside.
    const { keyboardNavRef, trackKeyboardNav } = useKeyboardNavGate(open)
    const focus = useRowFocus(hover, keyboardNavRef)
    const { setFocusedIndex } = focus

    // See lib/overlay.tsx. Base UI force-mounts a Select's popup after its first
    // value change, so this one really is mounted while closed.
    useEffect(() => {
      if (open) {
        remeasure()
        return
      }
      setActiveIndex(null)
      setFocusedIndex(null)
    }, [open, remeasure, setActiveIndex, setFocusedIndex])

    const checkedRect = isMeasured && checkedIndex !== undefined ? (itemRects[checkedIndex] ?? null) : null
    const focusRect = isMeasured && open ? focus.focusRect : null
    const contentCtx = useMemo(() => ({ registerItem, activeIndex, setCheckedIndex }), [registerItem, activeIndex])

    return (
      <SelectPrimitive.Portal container={usePortalContainer(container)}>
        <SelectPrimitive.Positioner
          {...positionerProps(
            { side, align, sideOffset, effect, hideSource },
            { side: 'bottom', align: 'start', sideOffset: 6 },
          )}
          alignItemWithTrigger={false}
        >
          <SelectContentContext.Provider value={contentCtx}>
            <SelectPrimitive.Popup
              ref={popupRef}
              // Capture: the primitive moves focus during its own keydown.
              onKeyDownCapture={trackKeyboardNav}
              onMouseEnter={() => {
                handlers.onMouseEnter()
                setFocusedIndex(null)
              }}
              onMouseMove={handlers.onMouseMove}
              onMouseLeave={handlers.onMouseLeave}
              onClick={handlers.onClick}
              {...focus.handlers}
              className="relative select-none outline-none"
              {...props}
            >
              <PopupSurface
                morph={morph}
                radius={POPUP_SHAPE.container}
                className={cn(
                  'flex min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] flex-col overflow-hidden',
                  POPUP_SHAPE.container,
                  className,
                )}
              >
                <ScrollArea className={popupScrollAreaClass} viewportClassName={cn(popupViewportClass, 'scroll-fade')}>
                  <div ref={containerRef} className="relative flex flex-col p-1">
                    {checkedRect && (
                      <GooIndicator
                        rect={checkedRect}
                        opacity={open ? 1 : 0}
                        className={cn('bg-active', POPUP_SHAPE.bg)}
                      />
                    )}
                    <FluidHoverHighlight hover={hover} hidden={!open} className={POPUP_SHAPE.bg} />
                    <FocusRing rect={focusRect} className={POPUP_SHAPE.focusRing} />
                    {children}
                  </div>
                </ScrollArea>
              </PopupSurface>
            </SelectPrimitive.Popup>
          </SelectContentContext.Provider>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    )
  },
)

SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional icon displayed before the label. */
  icon?: IconComponent
  /** Position among the menu's rows — what fluid hover measures rows by. Defaults to the row's place in document order; set it only for rows rendered by a component of your own, which the walk can't see into. */
  index?: number
  /** Unique value for this option. */
  value: string
  /** The row as text, for typeahead, when its label is not plain text. */
  textValue?: string
  /** Disables this individual item. Defaults to `false`. */
  disabled?: boolean
  /** The row label, text or any node; the trigger shows it for this value. */
  children?: ReactNode
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, icon: Icon, value, index: indexProp, textValue, disabled = false, ...props }, ref) => {
    const selectCtx = useSelectContext()
    const index = indexProp ?? selectCtx.indexByValue.get(value) ?? 0
    const contentCtx = useContext(SelectContentContext)
    const internalRef = useRef<HTMLDivElement>(null)
    const mergedRef = useMergeRefs(internalRef, ref)
    const sizeClasses = useSize()

    useRegisterFluidHoverItem(contentCtx?.registerItem, index, internalRef)

    const isChecked = selectCtx.value === value
    const lit = contentCtx?.activeIndex === index || isChecked

    const setCheckedIndex = contentCtx?.setCheckedIndex
    useEffect(() => {
      if (!isChecked || !setCheckedIndex) return
      setCheckedIndex(() => index)
      return () => setCheckedIndex(current => (current === index ? undefined : current))
    }, [isChecked, index, setCheckedIndex])

    return (
      <SelectPrimitive.Item
        value={value}
        disabled={disabled}
        label={textValue ?? (isTextLabel(children) ? Children.toArray(children).join('') : undefined)}
        render={
          <div
            ref={mergedRef}
            data-fluid-hover-index={index}
            className={cn(rowClasses({ size: sizeClasses, shape: POPUP_SHAPE, lit, disabled }), className)}
            {...props}
          />
        }
      >
        {Icon && <RowIcon icon={Icon} lit={lit} />}
        <SelectPrimitive.ItemText render={<span className={rowLabelBoxClass(children)} />}>
          {children}
        </SelectPrimitive.ItemText>
        <CheckMark checked={isChecked} reserve />
      </SelectPrimitive.Item>
    )
  },
)

SelectItem.displayName = 'SelectItem'

function SelectGroup(props: HTMLAttributes<HTMLDivElement>) {
  return <SelectPrimitive.Group {...props} />
}

SelectGroup.displayName = 'SelectGroup'

const SelectLabel = PopupLabel
const SelectSeparator = PopupSeparator

/**
 * An animated select menu: fluid hover on the rows, a popup that oozes out of
 * its trigger, and a checkmark that draws itself as the selection lands.
 *
 * Built on Base UI's Select — positioning and collision flipping, dismissal,
 * typeahead, combobox ARIA and the hidden form input all come from the
 * primitive. This layer adds the magnetic hover background, the selected
 * background that melts from the old row to the picked one, a keyboard
 * focus ring that only appears once you actually use the keyboard, and the
 * popup's open and close through the shared morph (see Morph), goo by
 * default. A pick holds the popup open for 300ms so that acknowledgment is
 * seen; Escape and outside presses close at once. The trigger sits on the
 * field box, like Combobox's field. Uncontrolled through `defaultValue` and
 * `defaultOpen`, controlled through `value` + `onValueChange` and `open` +
 * `onOpenChange`.
 *
 * Rows need no `index`: they take their place in document order, inside a
 * `Select.Group` or out of a `map`. A row's label may be any node (an icon
 * and text, a badge): it keeps its own box in the row and in the trigger,
 * where text is trimmed and truncated, and its `textValue` is what typeahead
 * matches.
 *
 * Statics:
 * - `Select.Trigger` — the field: `variant`, `icon`, `placeholder`, `error`;
 *   children replace its value slot (a `Select.Value`).
 * - `Select.Value` — the value slot: the picked row's label, else the muted `placeholder`.
 * - `Select.Content` — the popup: `side`, `align`, `sideOffset`, `container` and the
 *   morph options `from`, `effect`, `hideSource`, `tier`.
 * - `Select.Item` — one row: `value`, optional `index`, `textValue`, `icon`, `disabled`;
 *   its children are the label.
 * - `Select.Group`, `Select.Label`, `Select.Separator` — sections, their captions and
 *   the hairlines between them.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/select.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Select = Object.assign(
  function Select({
    children,
    value: valueProp,
    defaultValue = '',
    onValueChange,
    open,
    defaultOpen,
    onOpenChange,
    disabled: disabledProp,
    readOnly: readOnlyProp,
    name,
    required: requiredProp,
    size,
  }: SelectProps) {
    const { disabled, readOnly, required } = useFieldState({
      disabled: disabledProp,
      readOnly: readOnlyProp,
      required: requiredProp,
    })
    const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
    const root = useOverlayRoot({ open, defaultOpen, onOpenChange })
    const items = useMemo(() => collectSelectItems(children), [children])

    const ack = useRef<number | undefined>(undefined)
    useEffect(() => () => clearTimeout(ack.current), [])

    // Any other close (Escape, outside press, the trigger) is at once and cancels a pending ack.
    const handleOpenChange = (next: boolean, details: OpenChangeDetails & { reason: string }) => {
      clearTimeout(ack.current)
      if (!next && details.reason === 'item-press') {
        ack.current = window.setTimeout(() => root.setOpen(false), selectionAckMs)
        return
      }
      root.onOpenChange(next, details)
    }

    const indexByValue = useMemo(() => new Map(items.map((item, index) => [item.value, index])), [items])
    const picked = items.find(item => item.value === value)
    const textLabel = picked === undefined || isTextLabel(picked.label)
    const ctx = useMemo(
      () => ({ value, disabled, readOnly, indexByValue, textLabel }),
      [value, disabled, readOnly, indexByValue, textLabel],
    )

    return (
      <SizeScope size={size}>
        <SelectContext.Provider value={ctx}>
          <OverlayContext.Provider value={root.state}>
            {/* Non-modal: the page keeps scrolling and the popup follows its trigger. */}
            <SelectPrimitive.Root
              value={value === '' ? null : value}
              onValueChange={next => setValue(next ?? '')}
              open={root.open}
              onOpenChange={handleOpenChange}
              items={items}
              disabled={disabled}
              readOnly={readOnly}
              name={name}
              required={required}
              modal={false}
            >
              {children}
            </SelectPrimitive.Root>
          </OverlayContext.Provider>
        </SelectContext.Provider>
      </SizeScope>
    )
  },
  {
    Trigger: SelectTrigger,
    Value: SelectValue,
    Content: SelectContent,
    Item: SelectItem,
    Group: SelectGroup,
    Label: SelectLabel,
    Separator: SelectSeparator,
  },
)

export type { SelectContentProps, SelectItemProps, SelectProps, SelectTriggerProps, SelectValueProps }
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue }

export default Select
