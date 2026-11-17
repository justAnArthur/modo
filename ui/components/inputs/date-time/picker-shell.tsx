/*
 * Local addition (not part of Fluid Functionalism): the field and panel every
 * date and time picker shares. A file in a group folder, not an item.
 *
 * With an `editor` (DatePicker's `editable`) the field is a box around that
 * text control instead of a button, and only its leading icon, an
 * `InputAction`, opens the panel; the panel still anchors to, and grows out
 * of, the whole field.
 *
 * Form wiring: `controlProps` and the `aria-*` / `onBlur` props reach the
 * field's button (an editable picker puts them on its own input through
 * `controlAttributes`). `required` on an empty field renders a visually
 * hidden required input, so a native form won't submit; the browser's report
 * hands focus to the field.
 */

'use client'

import { Popover } from '@base-ui/react/popover'
import {
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefCallback,
  type RefObject,
  useId,
  useRef,
  useState,
} from 'react'
import { focusControlOnPress, useFieldBox, useFieldState } from '../../../lib/field-box'
import { type FieldVariant, fieldIconClasses } from '../../../lib/field-classes'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import {
  type OpenChangeDetails,
  OverlayContext,
  positionerProps,
  useOverlay,
  useOverlayRoot,
} from '../../../lib/overlay'
import { PopupSurface } from '../../../lib/popup-surface'
import { dividedColumns } from '../../../lib/scroll-column'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useIsMobile } from '../../../lib/use-is-mobile'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import Button from '../../actions/button'
import Sheet from '../../overlays/sheet'
import Input, { InputAction, InputAdornment, type InputProps } from '../input'

/** Attributes for a picker's field control (its button, or an editable field's input), `ref` and `data-*` included. */
type PickerControlAttributes = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'defaultChecked'
> & {
  ref?: Ref<HTMLElement>
  /** An editable field's input: the browser's autofill hint. */
  autoComplete?: string
  [data: `data-${string}`]: string | number | boolean | undefined
}

/** What every picker hands its shell unchanged. */
interface PickerFieldOptions extends MorphProps {
  size?: SizeVariant
  variant?: FieldVariant
  invalid?: boolean
  disabled?: boolean
  /** Shows the value but never opens the panel; set by an enclosing read-only Field. */
  readOnly?: boolean
  placeholder?: string
  /** Submits the value under this name in a form. */
  name?: string
  id?: string
  /** Classes for the field. */
  className?: string
  /** A native form won't submit while the value is empty. */
  required?: boolean
  /** Called when the field's control loses focus. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  /** Marks the value invalid, as `invalid` does. */
  'aria-invalid'?: AriaAttributes['aria-invalid']
  /** Attributes (and a `ref`) for the field's control. */
  controlProps?: PickerControlAttributes
}

type PickerControlOptions = Pick<
  PickerFieldOptions,
  'controlProps' | 'onBlur' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
>

/** The control's attributes from a picker's props: `controlProps` under the named ones, its `onBlur` before the picker's. */
function controlAttributes({
  controlProps,
  onBlur,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
}: PickerControlOptions): PickerControlAttributes {
  const named = { 'aria-label': label, 'aria-labelledby': labelledBy, 'aria-describedby': describedBy }
  return {
    ...controlProps,
    ...Object.fromEntries(Object.entries(named).filter(([, value]) => value !== undefined)),
    ...(onBlur && {
      onBlur: (event: FocusEvent<HTMLElement>) => {
        controlProps?.onBlur?.(event)
        onBlur(event)
      },
    }),
  }
}

/** `invalid`, or `true` when `aria-invalid` marks the value invalid; unset stays unset, for an enclosing Field. */
const invalidOf = (invalid: boolean | undefined, ariaInvalid: AriaAttributes['aria-invalid']) =>
  ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false' ? true : invalid

interface PickerShellProps extends PickerFieldOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The field's leading icon. */
  icon: IconName
  /** The formatted value; empty shows the placeholder. */
  display: ReactNode
  /** What a form receives under `name`: one entry per string, none while empty. */
  formValue?: string | string[]
  /** A name per `formValue` entry, in place of `name` (a range's `startName` / `endName`). */
  formNames?: (string | undefined)[]
  /** The panel header's inputs; the shell adds the close button after them. */
  header: ReactNode
  /** What the panel focuses when it opens on a desktop (its header input). */
  initialFocus?: RefObject<HTMLElement | null>
  /** Accessible name of the close button. */
  closeLabel?: string
  dir?: string
  /** Classes for the panel on a desktop: its width. */
  popupClassName?: string
  /** The field's own text control: the field becomes a box around it, and its icon the button that opens the panel. */
  editor?: ReactNode
  /** That control, focused by a press in the box's padding. */
  editorRef?: RefObject<HTMLElement | null>
  /** Accessible name of the icon button that opens the panel of an `editor` field. Defaults to `"Open calendar"`. */
  triggerLabel?: string
  /** The panel body under the header. */
  children: ReactNode
}

/**
 * The field and its panel: a popover out of the field (goo by default, or in
 * place over it with `effect="morph"` + `hideSource`), or a bottom sheet on a
 * phone. Controlled: the picker owns `open`, since a pick or Enter closes it.
 */
function PickerShell({
  size,
  name,
  formValue,
  formNames,
  disabled: disabledProp,
  readOnly: readOnlyProp,
  required: requiredProp,
  invalid,
  onOpenChange,
  controlProps,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: PickerShellProps) {
  const mobile = useIsMobile(640)
  // Resolved here as well as in the box: the trigger, not only the field, must turn off.
  const { disabled, readOnly, required } = useFieldState({
    disabled: disabledProp,
    readOnly: readOnlyProp,
    required: requiredProp,
  })
  const values = formValue === undefined ? [] : [formValue].flat()
  const button = useRef<HTMLElement>(null)
  const attributes = controlAttributes({
    controlProps,
    onBlur,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
  })
  const ref = useMergeRefs(button, attributes.ref)
  const panelProps = {
    ...props,
    disabled,
    readOnly,
    invalid: invalidOf(invalid, ariaInvalid),
    // An editable picker puts the attributes on its own input.
    control: props.editor ? undefined : { ...attributes, ref },
    onOpenChange: (next: boolean) => (next && readOnly ? undefined : onOpenChange(next)),
  }

  return (
    <SizeScope size={size}>
      {mobile ? <PickerSheet {...panelProps} /> : <PickerPopover {...panelProps} />}
      {values.map((value, i) => {
        const entry = formNames?.[i] ?? name
        return entry && <input key={i} type="hidden" name={entry} value={value} disabled={disabled} />
      })}
      {required && !values.length && !props.editor && (
        // A hidden input can't be required: this one is a text input out of sight, handing focus to the field.
        <input
          aria-hidden
          tabIndex={-1}
          required
          value=""
          onChange={() => {}}
          onFocus={() => button.current?.focus()}
          disabled={disabled}
          className="sr-only"
        />
      )}
    </SizeScope>
  )
}

type PanelProps = Omit<
  PickerShellProps,
  | 'size'
  | 'name'
  | 'formValue'
  | 'formNames'
  | 'required'
  | 'controlProps'
  | 'onBlur'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
> & {
  /** The field button's attributes, from `controlAttributes`; unset for an editable field. */
  control?: Omit<PickerControlAttributes, 'ref'> & { ref?: RefCallback<HTMLElement> }
}

type PickerFieldProps = Pick<
  PanelProps,
  'icon' | 'display' | 'placeholder' | 'variant' | 'invalid' | 'disabled' | 'readOnly' | 'id' | 'className'
> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

// Forwards its ref: Base UI anchors the panel to the field through it.
const PickerField = forwardRef<HTMLButtonElement, PickerFieldProps>(
  (
    { icon, display, placeholder, variant = 'bordered', invalid, disabled, readOnly, id: idProp, className, ...props },
    ref,
  ) => {
    const Icon = useIcon(icon)
    const box = useFieldBox({ variant, invalid, disabled, readOnly })
    const ownId = useId()
    const id = idProp ?? ownId

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        // Inside a Field, its label names the button, followed by the value it shows.
        aria-labelledby={box.labelId && !props['aria-label'] ? `${box.labelId} ${id}` : undefined}
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

type EditableFieldProps = Pick<
  PanelProps,
  'icon' | 'variant' | 'invalid' | 'disabled' | 'className' | 'editor' | 'editorRef' | 'triggerLabel'
> & {
  /** Wraps the icon button in the panel's trigger. */
  trigger: (button: ReactElement) => ReactNode
}

/** An editable picker's field: its text control, led by the icon button that opens the panel. */
const EditableField = forwardRef<HTMLDivElement, EditableFieldProps>(
  (
    {
      icon,
      variant = 'bordered',
      invalid,
      disabled,
      className,
      editor,
      editorRef,
      triggerLabel = 'Open calendar',
      trigger,
    },
    ref,
  ) => {
    const Icon = useIcon(icon)
    const box = useFieldBox({ variant, invalid, disabled })

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the text input is the focusable control; the box only forwards pointer focus from its padding.
      <div
        ref={ref}
        onMouseDown={editorRef && focusControlOnPress(editorRef)}
        {...box.props}
        className={cn(
          box.props.className,
          'flex w-full min-w-0 items-center cursor-text',
          box.size.gap,
          box.size.control,
          className,
        )}
      >
        <InputAdornment>
          {trigger(<InputAction label={triggerLabel} icon={Icon} disabled={box.disabled} />)}
        </InputAdornment>
        {editor}
      </div>
    )
  },
)
EditableField.displayName = 'EditableField'

/**
 * Base UI's open change for an editable field: a press or focus on the
 * field's own text is no reason to close (the panel belongs to it), and the
 * panel grows out of the whole field rather than its icon.
 */
function editableOpenChange(
  field: RefObject<HTMLElement | null>,
  onOpenChange: (open: boolean, details: OpenChangeDetails) => void,
) {
  return (next: boolean, details: OpenChangeDetails & { reason?: string }) => {
    if (!next && (details.reason === 'outside-press' || details.reason === 'focus-out')) {
      const event = details.event as (Event & { relatedTarget?: EventTarget | null }) | undefined
      const target = (event?.relatedTarget ?? event?.target) as Node | null | undefined
      if (target && field.current?.contains(target)) return
    }
    onOpenChange(next, { event: details.event, trigger: field.current ?? undefined })
  }
}

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
  editor,
  editorRef,
  triggerLabel,
  control,
  ...field
}: PanelProps) {
  const root = useOverlayRoot({ open, onOpenChange })
  const fieldRef = useRef<HTMLDivElement>(null)

  return (
    <OverlayContext.Provider value={root.state}>
      {/* Non-modal: the page keeps scrolling and the panel follows its field. */}
      <Popover.Root
        open={root.open}
        onOpenChange={editor ? editableOpenChange(fieldRef, root.onOpenChange) : root.onOpenChange}
        modal={false}
      >
        {editor ? (
          <EditableField
            ref={fieldRef}
            {...field}
            editor={editor}
            editorRef={editorRef}
            triggerLabel={triggerLabel}
            trigger={button => <Popover.Trigger disabled={field.disabled} render={button} />}
          />
        ) : (
          <Popover.Trigger
            disabled={field.disabled}
            render={<PickerField {...field} {...control} className={cn(field.className, control?.className)} />}
          />
        )}
        <PickerPanel
          anchor={editor ? fieldRef : undefined}
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
  anchor,
  morphProps,
  initialFocus,
  popupClassName,
  children,
}: {
  /** What the panel anchors to, when not its trigger. */
  anchor?: RefObject<HTMLElement | null>
  morphProps: MorphProps
  initialFocus?: RefObject<HTMLElement | null>
  popupClassName?: string
  children: ReactNode
}) {
  const { open, origin } = useOverlay('PickerShell')
  const morph = useMorph(open, origin, morphProps)

  return (
    <Popover.Portal>
      <Popover.Positioner
        anchor={anchor}
        {...positionerProps(morphProps, { side: 'bottom', align: 'start', sideOffset: 6 })}
      >
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
  editor,
  editorRef,
  triggerLabel,
  control,
  ...field
}: PanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {editor ? (
        <EditableField
          {...field}
          editor={editor}
          editorRef={editorRef}
          triggerLabel={triggerLabel}
          trigger={button => <Sheet.Trigger disabled={field.disabled} render={button} />}
        />
      ) : (
        <Sheet.Trigger
          disabled={field.disabled}
          render={<PickerField {...field} {...control} className={cn(field.className, control?.className)} />}
        />
      )}
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

export type { PickerControlAttributes, PickerFieldOptions }
export { ColumnsPanel, columnsPopupClass, controlAttributes, invalidOf, PickerInput, PickerShell }
