/*
 * Local addition (not part of Fluid Functionalism): the field and panel every
 * date and time picker shares. Not an item (a file in a group folder): the
 * pickers import it.
 *
 * The field is a text field on the shared field box (`useFieldBox` in
 * `lib/field-classes.ts`, `bordered` unless the picker's `variant` says
 * otherwise) showing the formatted value. Pressed, it opens its panel through Base UI's
 * Popover and the morph layer, with Combobox's options: goo out of the field
 * by default, or in place over it (`effect="morph"` with `hideSource`), the
 * panel's header landing where the field was. On a phone-width screen the
 * panel is the Sheet item instead, from the bottom edge.
 *
 * With an `editor` (DatePicker's `editable`) the field is a box around that
 * text control instead of a button, and only its leading icon, an
 * `InputAction`, opens the panel; the panel still anchors to and grows out
 * of the whole field. `readOnly` shows the value and never opens.
 *
 * Form wiring: `controlRef` / `controlProps` reach the field's button (an
 * editable picker puts its own on its input), and `formValues` render
 * visually hidden inputs carrying the value for a native form; one the
 * browser reports as invalid hands focus to the field.
 */

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
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type FieldVariant, fieldIconClasses, useFieldBox, useFieldState } from '../../../lib/field-classes'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { MorphSurface } from '../../../lib/morph-layers'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useIsMobile } from '../../../lib/use-is-mobile'
import {
  inPlaceOffset,
  type MorphEffect,
  type MorphFrom,
  type MorphTier,
  opensInPlace,
  useMorph,
  useMorphOrigin,
} from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import Button from '../../button'
import Sheet from '../../overlays/sheet'
import Input, { InputAction, InputAdornment, type InputProps } from '../input'

/** Attributes for the element a picker's field renders as its control (its button, or an editable field's input), `data-*` included. */
type PickerControlAttributes = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'defaultChecked'
> & {
  /** An editable field's input: browser autofill hint. Defaults to `"off"`. */
  autoComplete?: string
  [data: `data-${string}`]: string | number | boolean | undefined
}

/** The form and accessibility props every picker forwards to its field's control. */
interface PickerControlProps {
  /** Marks the value required: a native form won't submit while it is empty (and an editable field's input carries `required`). Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** Called when the field's control (its button, or an editable field's input) loses focus, as when the panel takes it. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  /** Names the field's control for assistive tech, in place of its label. */
  'aria-label'?: string
  /** Ids of the elements naming the field's control, in place of its own label. */
  'aria-labelledby'?: string
  /** Ids of the elements describing the field's control (a hint, an error message). */
  'aria-describedby'?: string
  /** Marks the value invalid, as `invalid` does. */
  'aria-invalid'?: AriaAttributes['aria-invalid']
  /** Attributes for the field's control: the button that opens the panel, or an `editable` field's input (`data-*`, `autoFocus`, `tabIndex`, handlers, which run after the picker's own; an editable field's input also takes `autoComplete` and `inputMode`, which replace its defaults of `"off"` and `"numeric"`). */
  controlProps?: PickerControlAttributes
}

/** `invalid`, or `true` when `aria-invalid` marks the value invalid (unset stays unset, for a surrounding Field). */
const invalidOf = (invalid: boolean | undefined, ariaInvalid: AriaAttributes['aria-invalid']) =>
  ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false' ? true : invalid

/** The control's attributes from a picker's props: `controlProps`, then the named props over them, `onBlur` after its own. */
function controlAttributes({
  controlProps,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: PickerControlProps): PickerControlAttributes {
  return {
    ...controlProps,
    ...(ariaLabel !== undefined && { 'aria-label': ariaLabel }),
    ...(ariaLabelledBy !== undefined && { 'aria-labelledby': ariaLabelledBy }),
    ...(ariaDescribedBy !== undefined && { 'aria-describedby': ariaDescribedBy }),
    ...(onBlur && {
      onBlur: (event: FocusEvent<HTMLElement>) => {
        controlProps?.onBlur?.(event)
        onBlur(event)
      },
    }),
  }
}

/** Hands an element to every ref given. */
function assignRefs<T>(...refs: (Ref<T> | RefObject<unknown> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as { current: T | null }).current = node
    }
  }
}

/** The field's own classes with `controlProps`, whose `className` joins them. */
function fieldControl(className: string | undefined, controlProps: PickerControlAttributes | undefined) {
  return { ...controlProps, className: cn(className, controlProps?.className) }
}

/** One value a native form submits: `name` (when given) and the text it carries; `slot` tells the entries apart. */
interface PickerFormValue {
  slot: 'value' | 'start' | 'end'
  name?: string
  value: string
}

interface PickerShellProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  size?: SizeVariant
  variant?: FieldVariant
  invalid?: boolean
  disabled?: boolean
  /** The field's leading icon. */
  icon: IconName
  /** The formatted value; empty shows the placeholder. */
  display: ReactNode
  placeholder?: string
  /** The panel header's inputs; the shell adds the close button after them. */
  header: ReactNode
  /** What the panel focuses when it opens on a desktop (its header input). */
  initialFocus?: RefObject<HTMLElement | null>
  /** Accessible name of the close button. */
  closeLabel?: string
  id?: string
  dir?: string
  /** Classes for the field. */
  className?: string
  /** Classes for the panel on a desktop: its width. */
  popupClassName?: string
  /** The desktop panel's morph (see Morph); a phone's sheet grows from its edge. */
  from?: MorphFrom
  effect?: MorphEffect
  hideSource?: boolean
  tier?: MorphTier
  /** The field's own text control (an editable picker): the field becomes a box around it, and its icon a button that opens the panel. */
  editor?: ReactNode
  /** Accessible name of that icon button. Defaults to `"Open calendar"`. */
  triggerLabel?: string
  /** Shows the value and never opens. */
  readOnly?: boolean
  /** Receives the field's button (a plain field; an editable picker refs its own input). */
  controlRef?: Ref<HTMLButtonElement>
  /** Attributes for the field's button (a plain field; an editable picker puts its own on its input). */
  controlProps?: PickerControlAttributes
  /** What a native form submits: a visually hidden input per entry, rendered once one has a `name` or the field is `required`. */
  formValues?: PickerFormValue[]
  /** Marks the hidden inputs required. Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** The panel body under the header. */
  children: ReactNode
}

/** The field and its panel: a popover out of the field (or in place of it), or a bottom sheet on a phone. */
function PickerShell({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  size,
  formValues,
  required,
  ...props
}: PickerShellProps) {
  const [open, setOpenState] = useControllableState(openProp, defaultOpen, onOpenChange)
  const setOpen = (next: boolean) => {
    if (next && props.readOnly) return
    setOpenState(next)
  }
  const fieldRef = useRef<HTMLElement>(null)
  const mobile = useIsMobile(640)
  const shell = mobile ? (
    <PickerSheet open={open} setOpen={setOpen} fieldRef={fieldRef} {...props} />
  ) : (
    <PickerPopover open={open} setOpen={setOpen} fieldRef={fieldRef} {...props} />
  )
  const inputs = formValues && (
    <PickerFormInputs values={formValues} required={required} disabled={props.disabled} fieldRef={fieldRef} />
  )
  const content = inputs ? (
    <>
      {shell}
      {inputs}
    </>
  ) : (
    shell
  )
  // A size pins the field and the portalled panel (context crosses portals).
  return size ? <SizeProvider size={size}>{content}</SizeProvider> : content
}

/**
 * The value for a native form: visually hidden inputs, out of the tab order.
 * They are real text inputs, not `type="hidden"`, so `required` stops a
 * submit; when the browser reports one, focus goes to the field.
 */
function PickerFormInputs({
  values,
  required,
  disabled,
  fieldRef,
}: {
  values: PickerFormValue[]
  required?: boolean
  disabled?: boolean
  fieldRef: RefObject<HTMLElement>
}) {
  const field = useFieldState()
  const isRequired = required ?? field?.required ?? false
  if (!isRequired && !values.some(v => v.name)) return null
  const focusField = () => {
    const el = fieldRef.current
    ;(el instanceof HTMLButtonElement ? el : el?.querySelector('input'))?.focus()
  }
  return values.map(({ slot, name, value }) => (
    <input
      key={slot}
      aria-hidden
      tabIndex={-1}
      name={name}
      value={value}
      required={isRequired}
      disabled={disabled ?? field?.disabled}
      onChange={() => {}}
      onFocus={focusField}
      className="sr-only"
    />
  ))
}

type PanelProps = Omit<
  PickerShellProps,
  'open' | 'defaultOpen' | 'onOpenChange' | 'size' | 'formValues' | 'required'
> & {
  open: boolean
  setOpen: (open: boolean) => void
  /** The field's element: its button, or an editable field's box. */
  fieldRef: RefObject<HTMLElement>
}

type PickerFieldProps = Pick<
  PanelProps,
  'icon' | 'display' | 'placeholder' | 'variant' | 'invalid' | 'disabled' | 'readOnly' | 'id' | 'className'
> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

// Forwards its ref: Base UI anchors the panel to the field through it.
const PickerField = forwardRef<HTMLButtonElement, PickerFieldProps>(
  ({ icon, display, placeholder, variant = 'bordered', invalid, disabled, readOnly, id, className, ...props }, ref) => {
    const Icon = useIcon(icon)
    const { size: sizeClasses, props: boxProps } = useFieldBox({ variant, invalid, disabled, readOnly })

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...boxProps}
        // Base UI's trigger props (open state, handlers, aria) arrive here.
        {...props}
        className={cn(
          boxProps.className,
          'flex w-full min-w-0 items-center text-left outline-none focus-visible:ring-focus-ring',
          // A read-only field never opens, and doesn't look like it would.
          readOnly ? 'cursor-default' : 'cursor-pointer',
          sizeClasses.gap,
          sizeClasses.control,
          className,
        )}
      >
        <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />
        <span
          className={cn('flex-1 truncate', sizeClasses.text, display ? 'text-foreground' : 'text-muted-foreground')}
        >
          {display || placeholder}
        </span>
      </button>
    )
  },
)
PickerField.displayName = 'PickerField'

type EditableFieldProps = Pick<
  PanelProps,
  'icon' | 'variant' | 'invalid' | 'disabled' | 'readOnly' | 'className' | 'editor' | 'triggerLabel'
> & {
  /** Wraps the icon button in the panel's trigger. */
  trigger: (button: ReactNode) => ReactNode
}

/** An editable picker's field: its text control, led by the icon button that opens the panel. */
const EditableField = forwardRef<HTMLElement, EditableFieldProps>(
  (
    {
      icon,
      variant = 'bordered',
      invalid,
      disabled,
      readOnly,
      className,
      editor,
      triggerLabel = 'Open calendar',
      trigger,
    },
    ref,
  ) => {
    const Icon = useIcon(icon)
    const { size: sizeClasses, props: boxProps } = useFieldBox({ variant, invalid, disabled, readOnly })
    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        {...boxProps}
        className={cn(
          boxProps.className,
          'flex w-full min-w-0 items-center',
          sizeClasses.gap,
          sizeClasses.control,
          className,
        )}
      >
        <InputAdornment>
          {trigger(<InputAction label={triggerLabel} icon={Icon} disabled={disabled || readOnly} />)}
        </InputAdornment>
        {editor}
      </div>
    )
  },
)
EditableField.displayName = 'EditableField'

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
      <div className="flex min-w-0 flex-1 items-center">{header}</div>
      <Button variant="ghost" size="icon-sm" aria-label={closeLabel} onClick={close}>
        <X size={sizeClasses.icon} strokeWidth={1.5} />
      </Button>
    </div>
  )
}

function PickerPopover({
  open,
  setOpen,
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
  triggerLabel,
  fieldRef,
  controlRef,
  controlProps,
  ...field
}: PanelProps) {
  const triggerRef = useMemo(() => assignRefs<HTMLButtonElement>(fieldRef, controlRef), [fieldRef, controlRef])
  const { origin, capture } = useMorphOrigin()
  const morph = useMorph(open, origin, { from, effect, hideSource, tier })
  const shape = useShape()
  const level = Math.min(useSurface() + 2, 8)

  const handleOpenChange = useCallback(
    (next: boolean, details: { reason?: string; trigger?: Element; event?: Event }) => {
      // Pressing or focusing the editable field's own text is no reason to
      // close: the panel belongs to that field.
      if (!next && editor && (details.reason === 'outside-press' || details.reason === 'focus-out')) {
        const event = details.event as (Event & { relatedTarget?: EventTarget | null }) | undefined
        const target = (event?.relatedTarget ?? event?.target) as Node | null | undefined
        if (target && fieldRef.current?.contains(target)) return
      }
      // An editable field's panel grows out of the whole field, not its icon.
      if (next) capture(editor ? { event: details.event, trigger: fieldRef.current ?? undefined } : details)
      setOpen(next)
    },
    [capture, setOpen, editor],
  )

  return (
    // Non-modal: the page keeps scrolling and the panel follows its field.
    <Popover.Root open={open} onOpenChange={handleOpenChange} modal={false}>
      {editor ? (
        <EditableField
          ref={fieldRef}
          {...field}
          editor={editor}
          triggerLabel={triggerLabel}
          trigger={button => <Popover.Trigger disabled={field.disabled} render={button as ReactElement} />}
        />
      ) : (
        <Popover.Trigger
          ref={triggerRef}
          disabled={field.disabled}
          render={<PickerField {...field} {...fieldControl(field.className, controlProps)} />}
        />
      )}
      <Popover.Portal>
        <Popover.Positioner
          anchor={editor ? fieldRef : undefined}
          side="bottom"
          align="start"
          sideOffset={opensInPlace({ effect, hideSource }) ? inPlaceOffset : 6}
          className="z-50 outline-none"
        >
          <Popover.Popup ref={morph.popupRef} initialFocus={initialFocus} className="relative outline-none">
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shape.container}
                className={cn('flex max-w-[calc(100vw-1rem)] flex-col gap-1 p-1', popupClassName)}
              >
                <div dir={dir} className="flex min-h-0 flex-col gap-1">
                  <PanelHeader header={header} closeLabel={closeLabel} close={() => setOpen(false)} />
                  {children}
                </div>
              </MorphSurface>
            </SurfaceProvider>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function PickerSheet({
  open,
  setOpen,
  header,
  closeLabel,
  dir,
  children,
  editor,
  triggerLabel,
  fieldRef,
  controlRef,
  controlProps,
  ...field
}: PanelProps) {
  const triggerRef = useMemo(() => assignRefs<HTMLButtonElement>(fieldRef, controlRef), [fieldRef, controlRef])
  const {
    initialFocus: _focus,
    popupClassName: _width,
    from: _from,
    effect: _effect,
    hideSource: _hide,
    tier: _tier,
    ...fieldProps
  } = field
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {editor ? (
        <EditableField
          ref={fieldRef}
          {...fieldProps}
          editor={editor}
          triggerLabel={triggerLabel}
          trigger={button => <Sheet.Trigger disabled={field.disabled} render={button as ReactElement} />}
        />
      ) : (
        <Sheet.Trigger
          ref={triggerRef}
          disabled={field.disabled}
          render={<PickerField {...fieldProps} {...fieldControl(fieldProps.className, controlProps)} />}
        />
      )}
      <Sheet.Content className="gap-2 p-3 pt-3">
        <div dir={dir} className="flex min-h-0 flex-col gap-2">
          <PanelHeader header={header} closeLabel={closeLabel} close={() => setOpen(false)} />
          {children}
        </div>
      </Sheet.Content>
    </Sheet>
  )
}

interface PickerInputProps extends Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> {
  /** The value as the field shows it, while nothing is being typed. */
  formatted: string
  /** Reads typed text and commits it; returns whether it could. */
  onText: (text: string) => boolean
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
  ({ formatted, onText, onEnter, onFocus, onBlur, onKeyDown, className, ...props }, ref) => {
    const [draft, setDraft] = useState<string | null>(null)
    const [invalid, setInvalid] = useState(false)
    return (
      <Input
        ref={ref}
        {...props}
        // The header is already framed by the panel: hover and focus change
        // the fill only (an invalid entry keeps its destructive ring).
        className={cn('hover:ring-transparent focus-within:ring-transparent data-[active]:ring-transparent', className)}
        value={draft ?? formatted}
        invalid={invalid}
        onChange={text => {
          setDraft(text)
          setInvalid(!onText(text))
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

export type { PickerControlAttributes, PickerControlProps, PickerFormValue, PickerShellProps }
export { assignRefs, controlAttributes, invalidOf, PickerInput, PickerShell }
