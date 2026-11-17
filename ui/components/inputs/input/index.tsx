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
  type ButtonHTMLAttributes,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type RefAttributes,
  type RefObject,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { FieldStateContext, focusControlOnPress, useFieldBox } from '../../../lib/field-box'
import {
  FIELD_ACTION,
  FIELD_ACTION_RADIUS,
  FIELD_ADORNMENT_ICON,
  type FieldVariant,
  fieldActionClasses,
  fieldAdornmentClasses,
  fieldIconClasses,
  fieldTextInset,
} from '../../../lib/field-classes'
import type { IconComponent } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import { Label, type LabelProps } from '../label'

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
  /** Content before the text, after `icon`: a prefix (`"https://"`), an icon element, an `InputAction`. Strings read as muted text; icons take the ladder's glyph size. */
  startAdornment?: ReactNode
  /** Content after the text: a unit (`"kg"`), a status icon, an `InputAction` such as a password reveal or a clear. */
  endAdornment?: ReactNode
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
  /** Shows the value without letting it change: it can be selected and copied, the ring answers hover and focus, the fill never lifts. Defaults to `false`. */
  readOnly?: boolean
  /** Marks the value required: the browser's validation (and an enclosing Field's) reports it missing while empty. Defaults to `false`. */
  required?: boolean
  /** The input's type. Swapping it (a password reveal) keeps the caret and the selection where they were. Defaults to `"text"`. */
  type?: string
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
 * `startAdornment` and `endAdornment` hold what sits beside the text: a
 * prefix or a unit, an icon, or an `InputAction` (a password reveal, a
 * clear). They light with the field like its leading icon, and icons in
 * them take the ladder's glyph size. Swapping `type` keeps the caret and the
 * selection where they were, so a password reveal is an `InputAction` that
 * flips `type` between `"password"` and `"text"`. `readOnly` keeps the value
 * selectable and copyable while the fill stays down.
 *
 * Also exported from this item:
 * - `InputAction` — a small icon button inside the field, 4px inside its
 *   ring: `label` (its accessible name), `icon`, `size`, plus button props.
 *   A press keeps the caret in the field.
 * - `InputAdornment` — the wrapper the adornments render in, for a field of
 *   your own built on `useFieldBox`: `size`.
 * - `Label` — the field label, inset to line up with the input's text
 *   (its own item, re-exported here): `htmlFor`, `invalid`, `size`.
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
      startAdornment,
      endAdornment,
      value: valueProp,
      defaultValue = '',
      onValueChange,
      variant = 'borderless',
      invalid,
      disabled,
      readOnly,
      required,
      type = 'text',
      onSelect,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)

    const inputRef = useRef<HTMLInputElement | null>(null)
    const box = useFieldBox({ variant, invalid, disabled, readOnly, required, size })
    const { size: sizeClasses, props: boxProps } = box
    const keepSelection = useSelectionAcrossType(inputRef, type)

    return (
      <div
        onMouseDown={focusControlOnPress(inputRef)}
        {...boxProps}
        className={cn(boxProps.className, 'flex items-center', sizeClasses.gap, sizeClasses.control, className)}
      >
        {Icon && <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />}
        <InputAdornment size={size}>{startAdornment}</InputAdornment>
        {/* On its own a plain input; inside a Field.Root it joins the field's wiring. */}
        <Field.Control
          ref={mergeRefs(inputRef, ref) as Ref<HTMLElement>}
          type={type}
          onSelect={e => {
            keepSelection(e.currentTarget)
            onSelect?.(e)
          }}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={box.disabled}
          readOnly={box.readOnly}
          required={box.required}
          aria-invalid={box.invalid || undefined}
          className={cn(
            // min-w-0: the adornments take their width first, the text the rest.
            'w-full min-w-0 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
            sizeClasses.text,
            'weight-normal',
          )}
          {...props}
        />
        <InputAdornment size={size}>{endAdornment}</InputAdornment>
      </div>
    )
  },
)

Input.displayName = 'Input'

/**
 * Browsers put the caret back at the start when an input's `type` changes.
 * Records the selection as it moves (call the returned function from
 * `onSelect`) and puts it back once a new `type` has committed, while the
 * input still has focus.
 */
function useSelectionAcrossType(input: RefObject<HTMLInputElement | null>, type: string) {
  const selection = useRef<[number | null, number | null]>([null, null])
  const lastType = useRef(type)

  useLayoutEffect(() => {
    if (lastType.current === type) return
    lastType.current = type
    const el = input.current
    const [start, end] = selection.current
    if (!el || start === null || el.ownerDocument.activeElement !== el) return
    const restore = () => {
      // Types without a selection API (email, number) throw; their caret stays where the browser put it.
      try {
        el.setSelectionRange(start, end)
      } catch {}
    }
    restore()
    // Chrome resets the selection once more after the swap, past this effect.
    const frame = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(frame)
  }, [input, type])

  return (el: HTMLInputElement) => {
    selection.current = [el.selectionStart, el.selectionEnd]
  }
}

interface InputAdornmentProps {
  /** What sits beside the text. Nothing renders when it is empty. */
  children?: ReactNode
  /** Pins the adornment, and an `InputAction` inside it, to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the wrapper. */
  className?: string
}

function InputAdornment({ children, size, className }: InputAdornmentProps) {
  const sizeClasses = useSize(size)
  if (children == null || children === false || children === '') return null

  return (
    <SizeScope size={size}>
      <span
        className={cn(
          fieldAdornmentClasses,
          FIELD_ADORNMENT_ICON[sizeClasses.variant],
          sizeClasses.gap,
          sizeClasses.text,
          className,
        )}
      >
        {children}
      </span>
    </SizeScope>
  )
}

interface InputActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Names the action for assistive tech (its `aria-label`), e.g. "Show password". */
  label: string
  /** The glyph. Pass an icon component, or an icon element as `children`. */
  icon?: IconComponent
  /** An icon element (or a short text), in place of `icon`. */
  children?: ReactNode
  /** Disables the action. Defaults to `false`. */
  disabled?: boolean
  /** Pins the action to one step of the size ladder (28px in a default field, 20px in a compact one). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the button. */
  className?: string
}

const InputAction = forwardRef<HTMLButtonElement, InputActionProps>(
  ({ label, icon: Icon, children, size, className, onMouseDown, ...props }, ref) => {
    const sizeClasses = useSize(size)
    const shape = useShape()

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        // The field keeps focus, and its caret, through a press.
        onMouseDown={e => {
          onMouseDown?.(e)
          e.preventDefault()
        }}
        className={cn(
          fieldActionClasses,
          FIELD_ACTION[sizeClasses.variant],
          FIELD_ACTION_RADIUS[shape.variant],
          className,
        )}
        {...props}
      >
        {Icon ? <Icon size={sizeClasses.icon} strokeWidth={1.5} /> : children}
      </button>
    )
  },
)

InputAction.displayName = 'InputAction'

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
      () => ({
        active: activeIndex === index,
        invalid: !!error,
        disabled: !!disabled,
        readOnly: false,
        required: false,
      }),
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

export type { InputActionProps, InputAdornmentProps, InputFieldProps, InputGroupProps, InputProps, LabelProps }
export { Input, InputAction, InputAdornment, InputGroup, Label }
export default Input
