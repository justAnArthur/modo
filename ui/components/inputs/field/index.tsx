/*
 * Local addition (not part of Fluid Functionalism): a labelled form field on
 * Base UI's Field, with no form library of its own. The label, description
 * and error line up with the text inside the field box (`fieldTextInset`),
 * and the field's state reaches every control that resolves its own through
 * `useFieldState` (`lib/field-box.ts`), the way InputGroup.Field hands it on.
 */

'use client'

import { Field as BaseField } from '@base-ui/react/field'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useId,
  useMemo,
} from 'react'
import { FieldStateContext } from '../../../lib/field-box'
import { fieldTextInset } from '../../../lib/field-classes'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { slotRender } from '../../../lib/slot'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import Label from '../label'

// Literal table: UnoCSS only generates the classes it can read whole.
const CAPTION = { default: 'text-caption', compact: 'text-caption-compact' }

type BaseFieldRootProps = Omit<
  ComponentPropsWithoutRef<typeof BaseField.Root>,
  'className' | 'render' | 'children' | 'invalid' | 'disabled'
>

/** When Base UI checks the control's native validity. */
type FieldValidationMode = 'onSubmit' | 'onBlur' | 'onChange'

interface FieldProps extends BaseFieldRootProps {
  /** The parts: `Field.Label`, a control, `Field.Description`, `Field.Error`. */
  children?: ReactNode
  /** Marks the value invalid: the label and the control turn destructive and the control sets `aria-invalid`. Set it from your validation. Defaults to `false`. */
  invalid?: boolean
  /** Disables the control and dims the field. Defaults to `false`. */
  disabled?: boolean
  /** Shows the value without letting it change: text fields stay selectable, Select, Combobox and the pickers stay shut. Defaults to `false`. */
  readOnly?: boolean
  /** Marks the control required and the label with an asterisk. Defaults to `false`. */
  required?: boolean
  /** Names the value when the form is submitted; wins over the control's own `name`. */
  name?: string
  /** When Base UI checks the control's native validity (`required`, `pattern`, `type`): on submit, on blur or on every change. A failure turns the field destructive, and an empty `Field.Error` shows the browser's message. Defaults to `"onSubmit"`. */
  validationMode?: FieldValidationMode
  /** Pins the field and its control to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root. */
  className?: string
}

interface FieldLabelProps {
  /** Label text. */
  children: ReactNode
  /** Keeps the label for assistive tech without showing it, for a field whose placeholder carries the meaning. Defaults to `false`. */
  visuallyHidden?: boolean
  /** Classes for the label. */
  className?: string
}

function FieldLabel({ children, visuallyHidden = false, className }: FieldLabelProps) {
  const field = useContext(FieldStateContext)

  return (
    <BaseField.Label
      id={field?.labelId}
      render={
        <Label invalid={field?.invalid} className={cn(visuallyHidden && 'sr-only', className)}>
          {children}
          {field?.required && <span aria-hidden="true"> *</span>}
        </Label>
      }
    />
  )
}

interface FieldDescriptionProps {
  /** Help text under the control: a format, a limit, what the value is for. */
  children: ReactNode
  /** Classes for the description. */
  className?: string
}

function FieldDescription({ children, className }: FieldDescriptionProps) {
  const size = useSize()

  return (
    <BaseField.Description
      className={cn(
        'text-muted-foreground weight-normal data-[disabled]:opacity-50',
        CAPTION[size.variant],
        fieldTextInset[size.variant],
        className,
      )}
    >
      {children}
    </BaseField.Description>
  )
}

/** Which native validity state shows the message (`"valueMissing"`, `"typeMismatch"`, …). */
type FieldErrorMatch = boolean | keyof ValidityState

interface FieldErrorProps {
  /** The message. It shows while it has one; empty, the browser's message for a native failure shows. */
  children?: ReactNode
  /** Overrides when it shows: `true` always, `false` never, or a native validity state such as `"valueMissing"`. Defaults to showing while it has a message. */
  match?: FieldErrorMatch
  /** Classes for the message. */
  className?: string
}

function FieldError({ children, match, className }: FieldErrorProps) {
  const size = useSize()
  const hasMessage = children != null && children !== false && children !== ''

  return (
    <BaseField.Error
      // Without a message and a match, Base UI shows the native validation message.
      match={match ?? (hasMessage || undefined)}
      className={cn(
        'text-destructive weight-medium',
        CAPTION[size.variant],
        fieldTextInset[size.variant],
        'transition-opacity duration-fast data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-fast-exit',
        className,
      )}
      // An explicit `children: undefined` would hide Base UI's own message.
      {...(hasMessage ? { children } : {})}
    />
  )
}

interface FieldControlProps {
  /** The element that becomes the control, e.g. a native `<select>` or a third-party input. */
  render?: ReactElement
  /** Compose onto the single child instead. Defaults to `false`. */
  asChild?: boolean
  /** The control, with `asChild`. */
  children?: ReactNode
}

function FieldControl({ render, asChild = false, children }: FieldControlProps) {
  const el = slotRender(render, asChild, children)
  // The element's own id stays its id, and the label follows it.
  const id = isValidElement<{ id?: string }>(el) ? el.props.id : undefined
  return <BaseField.Control render={el} id={id} />
}

type FieldComponent = ForwardRefExoticComponent<FieldProps & RefAttributes<HTMLDivElement>> & {
  Label: typeof FieldLabel
  Description: typeof FieldDescription
  Error: typeof FieldError
  Control: typeof FieldControl
}

/**
 * A labelled form field: a label above the control, help text and an error
 * message below it, all linked for assistive tech.
 *
 * Put a control inside and it joins on its own. The label targets it and the
 * description and error are read with it (Base UI's Field). The field hands
 * it `invalid`, `disabled`, `readOnly` and `required`: Input and Textarea,
 * Select, Combobox and the date and time pickers take each one they don't set
 * themselves, so a control's own prop always wins. An invalid field turns
 * the label and the box destructive together; a required one marks the
 * label with an asterisk and the control `required`; a read-only one keeps
 * text selectable and popups shut. The label and messages sit inset to line
 * up with the text in the box.
 *
 * The field holds no validation of its own: `invalid` and the error's
 * message come from yours (a form library's field state, a server
 * response), and `Field.Error` shows while it has a message. A native
 * failure (`required`, `pattern`, `type="email"`) caught by Base UI's
 * validation turns it destructive too, and an empty `Field.Error` then shows
 * the browser's message. `size` pins the field and its control to one step
 * of the size ladder; without it they follow the surrounding SizeProvider.
 *
 * InputGroup.Field (see Input) is the preset for a stack of text fields: a
 * label and an error string, and the group's hover gliding from field to
 * field. Reach for Field when a field stands alone, needs a description, or
 * holds a control other than a text input.
 *
 * Statics:
 * - `Field.Label` — the label (see Label), linked to the control: muted,
 *   destructive while the field is invalid, with an asterisk while it is
 *   required: `visuallyHidden`.
 * - `Field.Description` — muted help text under the control.
 * - `Field.Error` — the destructive message; it fades in while it has
 *   children: `match` (`true`, `false`, or a native validity state).
 * - `Field.Control` — wires an element that isn't one of the field controls
 *   (a native `<select>`, a third-party input) with the field's id,
 *   `aria-describedby` and `aria-invalid`: `render` or `asChild`.
 *
 * @example {@include ./examples.mdx}
 */
const Field = forwardRef<HTMLDivElement, FieldProps>(
  (
    { invalid = false, disabled = false, readOnly = false, required = false, size, className, children, ...props },
    ref,
  ) => {
    const labelId = useId()

    return (
      <SizeScope size={size}>
        <BaseField.Root
          ref={ref}
          invalid={invalid}
          disabled={disabled}
          className={cn('flex min-w-0 flex-col gap-1', className)}
          // The render function sees Base UI's validity, so a native failure
          // turns the label and the box destructive too, not only `invalid`.
          render={(rootProps, rootState) => (
            <div {...rootProps}>
              <ProvideFieldState
                invalid={invalid || rootState.valid === false}
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                labelId={labelId}
              >
                {rootProps.children}
              </ProvideFieldState>
            </div>
          )}
          {...props}
        >
          {children}
        </BaseField.Root>
      </SizeScope>
    )
  },
) as FieldComponent

Field.displayName = 'Field'

interface ProvideFieldStateProps {
  invalid: boolean
  disabled: boolean
  readOnly: boolean
  required: boolean
  labelId: string
  children?: ReactNode
}

function ProvideFieldState({ invalid, disabled, readOnly, required, labelId, children }: ProvideFieldStateProps) {
  const state = useMemo(
    () => ({ active: false, invalid, disabled, readOnly, required, labelId }),
    [invalid, disabled, readOnly, required, labelId],
  )
  return <FieldStateContext.Provider value={state}>{children}</FieldStateContext.Provider>
}

Object.assign(Field, { Label: FieldLabel, Description: FieldDescription, Error: FieldError, Control: FieldControl })

export type {
  FieldControlProps,
  FieldDescriptionProps,
  FieldErrorMatch,
  FieldErrorProps,
  FieldLabelProps,
  FieldProps,
  FieldValidationMode,
}
export { Field, FieldControl, FieldDescription, FieldError, FieldLabel }
export default Field
