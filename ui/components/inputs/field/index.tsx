/*
 * Local addition (not part of Fluid Functionalism): a labelled form field on
 * Base UI's Field, with no form library of its own. The label, description
 * and error line up with the text inside the field box
 * (`lib/field-variants.ts`), and the field's state reaches any control built
 * on `useFieldBox` through `FieldStateContext` (`lib/field-classes.ts`), the
 * way InputGroup.Field hands it to its control.
 */

import { Field as BaseField } from '@base-ui/react/field'
import {
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useMemo,
} from 'react'
import { FIELD_TEXT_INSET, FieldStateContext, useFieldState } from '../../../lib/field-classes'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { slotId, slotRender } from '../../../lib/slot'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { Label } from '../input'

/** When native validity is checked. */
type FieldValidationMode = 'onSubmit' | 'onBlur' | 'onChange'

interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The field's parts: `Field.Label`, a control, `Field.Description`, `Field.Error`. */
  children?: ReactNode
  /** Marks the value invalid: the label and the control turn destructive and the control sets `aria-invalid`. Set it from your validation (a form library's field state). Defaults to `false`. */
  invalid?: boolean
  /** Disables the control and dims the field. Defaults to `false`. */
  disabled?: boolean
  /** Shows the value without letting it change (Input, NumberInput and FileDropzone read it). Defaults to `false`. */
  readOnly?: boolean
  /** Marks the control required and the label with an asterisk. Defaults to `false`. */
  required?: boolean
  /** Names the value when the form is submitted; wins over the control's own `name`. */
  name?: string
  /** Whether the value differs from its initial one, for a form library that tracks it (sets `data-dirty`). */
  dirty?: boolean
  /** Whether the control has been visited, for a form library that tracks it (sets `data-touched`). */
  touched?: boolean
  /** When Base UI checks the control's native validity (`required`, `pattern`, `type`): on form submit, on blur, or on every change. A failure turns the field destructive and an empty `Field.Error` shows the browser's message. Defaults to `"onSubmit"`. */
  validationMode?: FieldValidationMode
  /** Pins the field and its control to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root. */
  className?: string
}

interface FieldLabelProps {
  /** Label text. */
  children: ReactNode
  /** Keep the label for assistive tech but don't render it, for a field whose placeholder or context carries the meaning. Defaults to `false`. */
  visuallyHidden?: boolean
  /** Classes for the label. */
  className?: string
}

function FieldLabel({ children, visuallyHidden, className }: FieldLabelProps) {
  const field = useFieldState()

  return (
    <BaseField.Label
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
        size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
        FIELD_TEXT_INSET[size.variant],
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
  /** The message. While it has one, it shows; empty, it hides. */
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
        size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
        FIELD_TEXT_INSET[size.variant],
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

function FieldControl({ render, asChild, children }: FieldControlProps) {
  const el = slotRender(render, asChild, children)
  return <BaseField.Control render={el} id={slotId(el)} />
}

interface ProvideFieldStateProps {
  invalid: boolean
  disabled: boolean
  readOnly: boolean
  required: boolean
  children?: ReactNode
}

function ProvideFieldState({ invalid, disabled, readOnly, required, children }: ProvideFieldStateProps) {
  const state = useMemo(
    () => ({ active: false, invalid, disabled, readOnly, required }),
    [invalid, disabled, readOnly, required],
  )
  return <FieldStateContext.Provider value={state}>{children}</FieldStateContext.Provider>
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
 * Put an Input, Textarea, NumberInput, FileDropzone, Select or any other
 * field control inside and it joins on its own: the label targets it, the
 * description and error are read with it, and the field hands it its
 * `invalid`, `disabled`, `readOnly` and `required` state, so the box turns
 * destructive with the label. The label and messages sit inset to line up
 * with the text in the box. The field holds no validation of its own:
 * `invalid` and the error's message come from yours (a form library's field
 * state, a server response), and `Field.Error` shows while it has a message.
 * A native failure (`required`, `pattern`, `type="email"`) caught by Base UI's
 * validation turns it destructive too, and an empty `Field.Error` then shows
 * the browser's message.
 * Behavior comes from Base UI's Field.
 *
 * `size` pins the field and its control to one step of the size ladder;
 * without it they follow the surrounding SizeProvider, which is how to set a
 * form's density when a control's own props keep the native `<input size>`
 * attribute (a character width, not a height). `Field.Control` passes a
 * native `size` through to the element untouched.
 *
 * InputGroup.Field is the preset for a group of text fields: a label and an
 * error string, and the group's hover gliding from field to field. Reach for
 * Field when a field stands alone, needs a description, or holds a control
 * other than a text input.
 *
 * Statics:
 * - `Field.Label` — the label, weight-stable and muted; destructive while
 *   the field is invalid, with an asterisk while it is required:
 *   `visuallyHidden`.
 * - `Field.Description` — muted help text under the control.
 * - `Field.Error` — the destructive message; it fades in while it has
 *   children: `match` (`true`, `false`, or a native validity state).
 * - `Field.Control` — wires a control that isn't a field control (a native
 *   element, a third-party input) with the field's id, `aria-describedby`
 *   and `aria-invalid`: `render={<select/>}` or `asChild`. Field controls
 *   (Input, NumberInput, …) need no wrapper.
 *
 * @example {@include ./examples.mdx}
 */
const Field = forwardRef<HTMLDivElement, FieldProps>(
  (
    { invalid = false, disabled = false, readOnly = false, required = false, size, className, children, ...props },
    ref,
  ) => {
    const field = (
      // Base UI wires the plumbing: Field.Label's htmlFor targets the
      // control, Description and Error ids land in its aria-describedby, and
      // `invalid` drives aria-invalid / data-invalid.
      <BaseField.Root
        ref={ref}
        invalid={invalid}
        disabled={disabled}
        className={cn('flex min-w-0 flex-col gap-1', className)}
        // The render function sees Base UI's validity, so a native failure
        // (`required`, `pattern`, a type mismatch) turns the label and the box
        // destructive too, not only the `invalid` prop.
        render={(rootProps, rootState) => (
          <div {...rootProps}>
            <ProvideFieldState
              invalid={invalid || rootState.valid === false}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
            >
              {rootProps.children}
            </ProvideFieldState>
          </div>
        )}
        {...props}
      >
        {children}
      </BaseField.Root>
    )

    return size ? <SizeProvider size={size}>{field}</SizeProvider> : field
  },
) as FieldComponent

Field.displayName = 'Field'

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
