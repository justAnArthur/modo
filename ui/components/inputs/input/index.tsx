// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Field } from '@base-ui/react/field'
import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type Ref,
  type RefAttributes,
  useContext,
  useMemo,
  useRef,
} from 'react'
import {
  FieldStateContext,
  type FieldVariant,
  fieldIconClasses,
  fieldTextInset,
  focusControlOnPress,
  useFieldBox,
} from '../../../lib/field-classes'
import type { IconComponent } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'

interface InputGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
}

const InputGroupContext = createContext<InputGroupContextValue | null>(null)

function useInputGroup() {
  const ctx = useContext(InputGroupContext)
  if (!ctx) throw new Error('useInputGroup must be used within an InputGroup')
  return ctx
}

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue' | 'size'> {
  /** Placeholder text. */
  placeholder?: string
  /** Leading icon inside the input. */
  icon?: IconComponent
  /** Controlled input value. */
  value?: string
  /** Initial value when uncontrolled. Defaults to `''`. */
  defaultValue?: string
  /** Called with the new value on every change. */
  onValueChange?: (value: string) => void
  /** Framed at rest, or invisible until hovered or focused. Defaults to `"borderless"`. */
  variant?: FieldVariant
  /** Marks the value invalid: the field turns destructive and sets `aria-invalid`. Defaults to `false`. */
  invalid?: boolean
  /** Disables the input. Defaults to `false`. */
  disabled?: boolean
  /** Pins the input to one step of the size ladder (default 36px, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the ringed box around the input. */
  className?: string
}

/**
 * Text input with a fluid hover ring.
 *
 * At rest the field is bare text on the page. Hover lifts it onto a muted
 * ground with a hairline ring, focus onto the card ground, and its leading
 * icon thickens. `invalid` turns it destructive. It is uncontrolled with
 * `defaultValue`, or controlled with `value` + `onValueChange`, and fills the width
 * of its container. Pair it with a `Label` through `htmlFor` / `id`.
 *
 * Also exported from this item:
 * - `Label` — the field label, inset to line up with the input's text:
 *   `htmlFor`, `invalid`, `size`.
 * - `InputGroup` — stacks labelled fields and tracks the pointer across them,
 *   so the hover glides from field to field: `size` pins every field to one
 *   step of the ladder.
 * - `InputGroup.Field` — one labelled Input in a group, wired as a Base UI
 *   `Field` (label, control and error message linked for assistive tech):
 *   `label`, `labelHidden`, `index` (its position; the group numbers its
 *   rows, so it is optional),
 *   `error` (a message below the input; marks it invalid), plus Input's props;
 *   children replace the Input with another field control, such as a
 *   Textarea, which joins the group's hover and takes the error.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/input-group.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon: Icon,
      value: valueProp,
      defaultValue = '',
      onValueChange,
      variant = 'borderless',
      invalid,
      disabled,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)

    const inputRef = useRef<HTMLInputElement | null>(null)
    const box = useFieldBox({ variant, invalid, disabled, size })
    const { size: sizeClasses, props: boxProps } = box

    return (
      <div
        onMouseDown={focusControlOnPress(inputRef)}
        {...boxProps}
        className={cn(boxProps.className, 'flex items-center', sizeClasses.gap, sizeClasses.control, className)}
      >
        {Icon && <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />}
        {/* On its own a plain input; inside a Field.Root it joins the field's wiring. */}
        <Field.Control
          ref={mergeRefs(inputRef, ref) as Ref<HTMLElement>}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={box.disabled}
          aria-invalid={box.invalid || undefined}
          className={cn(
            'w-full rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
            sizeClasses.text,
            'weight-normal',
          )}
          {...props}
        />
      </div>
    )
  },
)

Input.displayName = 'Input'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Label text. */
  children: ReactNode
  /** Turns the label destructive, matching an invalid Input. Defaults to `false`. */
  invalid?: boolean
  /** Pins the label to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ children, invalid, size, className, ...props }, ref) => {
  const sizeClasses = useSize(size)

  return (
    <label
      ref={ref}
      className={cn(
        sizeClasses.text,
        'weight-normal',
        invalid ? 'text-destructive' : 'text-muted-foreground',
        // Inside a disabled field, Field.Label stamps `data-disabled`.
        'data-[disabled]:opacity-50',
        fieldTextInset[sizeClasses.variant],
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
})

Label.displayName = 'Label'

interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** One or more InputGroup.Field children. */
  children: ReactNode
  /** Pins the group's fields to one step of the size ladder (default 36px, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

type InputGroupComponent = ForwardRefExoticComponent<InputGroupProps & RefAttributes<HTMLDivElement>> & {
  Field: typeof InputField
}

const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(({ children, size, className, ...props }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { activeIndex, handlers, registerItem } = useFluidHover(containerRef)

  const contextValue = useMemo(() => ({ registerItem, activeIndex }), [registerItem, activeIndex])

  return (
    <SizeScope size={size}>
      <InputGroupContext.Provider value={contextValue}>
        <div
          ref={mergeRefs(containerRef, ref)}
          onMouseEnter={handlers.onMouseEnter}
          onMouseMove={handlers.onMouseMove}
          onMouseLeave={handlers.onMouseLeave}
          // The fluid hover measures fields by offsetTop: `relative` makes this their offsetParent.
          className={cn('relative flex flex-col gap-3 w-72 max-w-full', className)}
          {...props}
        >
          <IndexedRows>{children}</IndexedRows>
        </div>
      </InputGroupContext.Provider>
    </SizeScope>
  )
}) as InputGroupComponent

InputGroup.displayName = 'InputGroup'

interface InputFieldProps extends Omit<InputProps, 'invalid' | 'size' | 'className'> {
  /** Label text above the input. */
  label: string
  /** Keep the label for assistive tech but don't render it — for inline fields (a toolbar search) where the placeholder carries the meaning. Defaults to `false`. */
  labelHidden?: boolean
  /** Position within the group, for the fluid hover. Defaults to the field's position among the group's children. */
  index?: number
  /** Error message shown below the input. */
  error?: string
  /** A control in place of the built-in Input, e.g. a Textarea: it joins the group's hover and takes the field's error and disabled state. Input's props then go on it, not on the field. */
  children?: ReactNode
  className?: string
}

const InputField = forwardRef<HTMLDivElement, InputFieldProps>(
  ({ label, labelHidden, index: indexProp, error, disabled, children, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const { registerItem, activeIndex } = useInputGroup()
    const sizeClasses = useSize()
    const index = useRowIndex(indexProp)

    useRegisterFluidHoverItem(registerItem, index, internalRef)

    const fieldState = useMemo(
      () => ({ active: activeIndex === index, invalid: !!error, disabled: !!disabled }),
      [activeIndex, index, error, disabled],
    )

    return (
      <Field.Root
        ref={mergeRefs(internalRef, ref)}
        invalid={!!error}
        disabled={disabled}
        // The label and the input each dim themselves.
        className={cn('flex flex-col gap-1 cursor-text', disabled && 'pointer-events-none', className)}
      >
        {/* sr-only, not unmounted: the field keeps its accessible name. */}
        <Field.Label
          render={
            <Label invalid={!!error} className={labelHidden ? 'sr-only' : undefined}>
              {label}
            </Label>
          }
        />

        <FieldStateContext.Provider value={fieldState}>
          {children ?? <Input invalid={!!error} disabled={disabled} {...props} />}
        </FieldStateContext.Provider>

        {/* `match`: shown while the `error` prop stands, not on Base UI's own validation. */}
        {error && (
          <Field.Error
            match
            className={cn(
              'text-destructive weight-medium',
              sizeClasses.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
              fieldTextInset[sizeClasses.variant],
            )}
          >
            {error}
          </Field.Error>
        )}
      </Field.Root>
    )
  },
)

InputField.displayName = 'InputField'

Object.assign(InputGroup, { Field: InputField })

export type { InputFieldProps, InputGroupProps, InputProps, LabelProps }
export { Input, InputGroup, Label }
export default Input
