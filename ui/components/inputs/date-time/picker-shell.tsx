/*
 * Local addition (not part of Fluid Functionalism): the field and panel every
 * date and time picker shares. A file in a group folder, not an item.
 */

'use client'

import { Popover } from '@base-ui/react/popover'
import { type ButtonHTMLAttributes, forwardRef, type ReactNode, type RefObject, useContext, useState } from 'react'
import { FieldStateContext, type FieldVariant, fieldIconClasses, useFieldBox } from '../../../lib/field-classes'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { OverlayContext, positionerProps, useOverlay, useOverlayRoot } from '../../../lib/overlay'
import { PopupSurface } from '../../../lib/popup-surface'
import { dividedColumns } from '../../../lib/scroll-column'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useIsMobile } from '../../../lib/use-is-mobile'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import Button from '../../button'
import Sheet from '../../overlays/sheet'
import Input, { type InputProps } from '../input'

/** What every picker hands its shell unchanged. */
interface PickerFieldOptions extends MorphProps {
  size?: SizeVariant
  variant?: FieldVariant
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  /** Submits the value under this name in a form. */
  name?: string
  id?: string
  /** Classes for the field. */
  className?: string
}

interface PickerShellProps extends PickerFieldOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The field's leading icon. */
  icon: IconName
  /** The formatted value; empty shows the placeholder. */
  display: string
  /** What a form receives under `name`: one entry per string, none while empty. */
  formValue?: string | string[]
  /** The panel header's inputs; the shell adds the close button after them. */
  header: ReactNode
  /** What the panel focuses when it opens on a desktop (its header input). */
  initialFocus?: RefObject<HTMLElement | null>
  /** Accessible name of the close button. */
  closeLabel?: string
  dir?: string
  /** Classes for the panel on a desktop: its width. */
  popupClassName?: string
  /** The panel body under the header. */
  children: ReactNode
}

/**
 * The field and its panel: a popover out of the field (goo by default, or in
 * place over it with `effect="morph"` + `hideSource`), or a bottom sheet on a
 * phone. Controlled: the picker owns `open`, since a pick or Enter closes it.
 */
function PickerShell({ size, name, formValue, disabled: disabledProp, ...props }: PickerShellProps) {
  const mobile = useIsMobile(640)
  const fieldState = useContext(FieldStateContext)
  // Resolved here as well as in the box: the trigger, not only the field, must turn off.
  const disabled = disabledProp ?? fieldState?.disabled ?? false
  const values = formValue === undefined ? [] : [formValue].flat()

  return (
    <SizeScope size={size}>
      {mobile ? <PickerSheet {...props} disabled={disabled} /> : <PickerPopover {...props} disabled={disabled} />}
      {name && values.map((value, i) => <input key={i} type="hidden" name={name} value={value} disabled={disabled} />)}
    </SizeScope>
  )
}

type PanelProps = Omit<PickerShellProps, 'size' | 'name' | 'formValue'>

type PickerFieldProps = Pick<
  PanelProps,
  'icon' | 'display' | 'placeholder' | 'variant' | 'invalid' | 'disabled' | 'id' | 'className'
> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

// Forwards its ref: Base UI anchors the panel to the field through it.
const PickerField = forwardRef<HTMLButtonElement, PickerFieldProps>(
  ({ icon, display, placeholder, variant = 'bordered', invalid, disabled, id, className, ...props }, ref) => {
    const Icon = useIcon(icon)
    const box = useFieldBox({ variant, invalid, disabled })

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        {...box.props}
        // Base UI's trigger props (open state, handlers, aria) arrive here.
        {...props}
        disabled={box.disabled}
        aria-invalid={box.invalid || undefined}
        className={cn(
          box.props.className,
          // A button field has no caret: keyboard focus rings it.
          'flex w-full min-w-0 items-center text-left cursor-pointer outline-none focus-visible:ring-focus-ring',
          box.size.gap,
          box.size.control,
          className,
        )}
      >
        <Icon size={box.size.icon} strokeWidth={1.5} className={fieldIconClasses} />
        <span className={cn('flex-1 truncate', box.size.text, display ? 'text-foreground' : 'text-muted-foreground')}>
          {display || placeholder}
        </span>
      </button>
    )
  },
)
PickerField.displayName = 'PickerField'

function PanelHeader({
  header,
  closeLabel = 'Close',
  close,
}: {
  header: ReactNode
  closeLabel?: string
  close: () => void
}) {
  const X = useIcon('x')
  const sizeClasses = useSize()
  return (
    <div className="flex items-center gap-1 border-b border-border pb-1">
      <div className="flex min-w-0 flex-1 items-center gap-1">{header}</div>
      <Button variant="ghost" size="icon-compact" aria-label={closeLabel} onClick={close}>
        <X size={sizeClasses.icon} strokeWidth={1.5} />
      </Button>
    </div>
  )
}

function PickerPopover({
  open,
  onOpenChange,
  header,
  initialFocus,
  closeLabel,
  dir,
  popupClassName,
  from,
  effect,
  hideSource,
  tier = 'moderate',
  children,
  ...field
}: PanelProps) {
  const root = useOverlayRoot({ open, onOpenChange })

  return (
    <OverlayContext.Provider value={root.state}>
      {/* Non-modal: the page keeps scrolling and the panel follows its field. */}
      <Popover.Root open={root.open} onOpenChange={root.onOpenChange} modal={false}>
        <Popover.Trigger disabled={field.disabled} render={<PickerField {...field} />} />
        <PickerPanel
          morphProps={{ from, effect, hideSource, tier }}
          initialFocus={initialFocus}
          popupClassName={popupClassName}
        >
          <div dir={dir} className="flex min-h-0 flex-col gap-1">
            <PanelHeader header={header} closeLabel={closeLabel} close={() => root.setOpen(false)} />
            {children}
          </div>
        </PickerPanel>
      </Popover.Root>
    </OverlayContext.Provider>
  )
}

function PickerPanel({
  morphProps,
  initialFocus,
  popupClassName,
  children,
}: {
  morphProps: MorphProps
  initialFocus?: RefObject<HTMLElement | null>
  popupClassName?: string
  children: ReactNode
}) {
  const { open, origin } = useOverlay('PickerShell')
  const morph = useMorph(open, origin, morphProps)

  return (
    <Popover.Portal>
      <Popover.Positioner {...positionerProps(morphProps, { side: 'bottom', align: 'start', sideOffset: 6 })}>
        <Popover.Popup ref={morph.popupRef} initialFocus={initialFocus} className="relative outline-none">
          <PopupSurface
            morph={morph}
            className={cn('flex max-w-[calc(100vw-1rem)] flex-col gap-1 p-1', popupClassName)}
          >
            {children}
          </PopupSurface>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}

function PickerSheet({
  open,
  onOpenChange,
  header,
  closeLabel,
  dir,
  initialFocus: _focus,
  popupClassName: _width,
  from: _from,
  effect: _effect,
  hideSource: _hide,
  tier: _tier,
  children,
  ...field
}: PanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Sheet.Trigger disabled={field.disabled} render={<PickerField {...field} />} />
      <Sheet.Content className="gap-2 p-3 pt-3">
        <div dir={dir} className="flex min-h-0 flex-col gap-2">
          <PanelHeader header={header} closeLabel={closeLabel} close={() => onOpenChange(false)} />
          {children}
        </div>
      </Sheet.Content>
    </Sheet>
  )
}

/** The desktop panel's width for a picker of columns: the field's, at least 14rem. */
const columnsPopupClass = 'w-[max(var(--anchor-width,0px),14rem)]'

/** Scroll columns side by side, divided, at the panel's fixed height. */
function ColumnsPanel({ children }: { children: ReactNode }) {
  return <div className={cn(dividedColumns, 'h-56')}>{children}</div>
}

interface PickerInputProps extends Omit<InputProps, 'value' | 'defaultValue' | 'onValueChange'> {
  /** The value as the field shows it, while nothing is being typed. */
  formatted: string
  /** Reads typed text and commits it; returns whether it could. Blank text goes to `onClear` instead. */
  onText: (text: string) => boolean
  /** Blank text: the picker clears its value. */
  onClear: () => void
  /** Enter, after a valid entry: the pickers close. */
  onEnter?: () => void
}

/**
 * A header input: shows the formatted value, selects it all on focus, and
 * commits what is typed as soon as it reads as a value (marking it invalid
 * until then). Leaving it restores the formatted value. Hover and focus fill
 * it without the field ring.
 */
const PickerInput = forwardRef<HTMLInputElement, PickerInputProps>(
  ({ formatted, onText, onClear, onEnter, onFocus, onBlur, onKeyDown, className, ...props }, ref) => {
    const [draft, setDraft] = useState<string | null>(null)
    const [invalid, setInvalid] = useState(false)
    return (
      <Input
        ref={ref}
        {...props}
        // The panel already frames the header: hover and focus change the fill only.
        className={cn('hover:ring-transparent focus-within:ring-transparent data-[active]:ring-transparent', className)}
        value={draft ?? formatted}
        invalid={invalid}
        onValueChange={text => {
          setDraft(text)
          if (text.trim()) return setInvalid(!onText(text))
          onClear()
          setInvalid(false)
        }}
        onFocus={e => {
          e.currentTarget.select()
          onFocus?.(e)
        }}
        onBlur={e => {
          setDraft(null)
          setInvalid(false)
          onBlur?.(e)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !invalid) onEnter?.()
          onKeyDown?.(e)
        }}
      />
    )
  },
)
PickerInput.displayName = 'PickerInput'

export type { PickerFieldOptions }
export { ColumnsPanel, columnsPopupClass, PickerInput, PickerShell }
