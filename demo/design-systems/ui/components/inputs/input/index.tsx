// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `"use client"` dropped; `@/lib/*` and `@/hooks/*` imports
 * rewritten to `../../../lib/*` (`SizeProvider` to `../../../primitives/sizes`);
 * `InputField` split into `Input` (the ringed box, usable on its own: own
 * hover when outside a group, `invalid`, `size`, ref on the `<input>`) and
 * `Label` (a plain `<label>`, rendered through `Field.Label` inside a field),
 * which `InputGroup.Field` composes; item renamed `input`, `Input` the
 * default export; uncontrolled mode added — `value` and `onChange` are
 * optional, with a `defaultValue` twin (`InputHTMLAttributes`' own
 * `defaultValue` omitted in its favour) backed by `useControllableState`;
 * the input's `onFocus` / `onBlur` compose with the focus tracking instead of
 * replacing it; modo docs — TSDoc with FF's docs/API text,
 * `InputGroup.Field` static (typed via a cast on the root).
 * Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 * `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`;
 * `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 * `spring.*`.
 */

import { Field } from '@base-ui/react/field'
import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'

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

// Set by InputGroup.Field: the group's fluid hover lights the whole field
// (label included), so the Input takes its hover from there.
const FieldStateContext = createContext<{ active: boolean } | null>(null)

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
  /** Called when the input value changes. */
  onChange?: (value: string) => void
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
 * `defaultValue`, or controlled with `value` + `onChange`, and fills the width
 * of its container. Pair it with a `Label` through `htmlFor` / `id`.
 *
 * Also exported from this item:
 * - `Label` — the field label, weight-stable and inset to line up with the
 *   input's text: `htmlFor`, `invalid`, `size`.
 * - `InputGroup` — stacks labelled fields and tracks the pointer across them,
 *   so the hover glides from field to field: `size` pins every field to one
 *   step of the ladder.
 * - `InputGroup.Field` — one labelled Input in a group, wired as a Base UI
 *   `Field` (label, control and error message linked for assistive tech):
 *   `index` (its position, for the fluid hover), `label`, `labelHidden`,
 *   `error` (a message below the input; marks it invalid), plus Input's props.
 *
 * @example {@include ./examples.mdx}
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon: Icon,
      value: valueProp,
      defaultValue = '',
      onChange: onChangeProp,
      invalid,
      disabled,
      size,
      className,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    // Local: controlled `value`, or internal state seeded from `defaultValue`.
    const [value, onChange] = useControllableState(valueProp, defaultValue, onChangeProp)

    const inputRef = useRef<HTMLInputElement | null>(null)
    const field = useContext(FieldStateContext)
    const [isHovered, setIsHovered] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const shape = useShape()
    const sizeClasses = useSize(size)
    const compact = sizeClasses.variant === 'compact'

    const isActive = field ? field.active : isHovered
    const iconActive = isActive || isFocused

    // Input container classes
    let bgClass: string
    let ringClass: string

    if (disabled) {
      bgClass = 'bg-transparent'
      ringClass = 'ring-border'
    } else if (invalid) {
      bgClass = isFocused ? 'bg-card' : isActive ? 'bg-destructive-light/60' : 'bg-transparent'
      ringClass = isFocused || isActive ? 'ring-destructive/50' : 'ring-transparent'
    } else if (isFocused) {
      bgClass = 'bg-card'
      ringClass = 'ring-border'
    } else if (isActive) {
      bgClass = 'bg-muted/50'
      ringClass = 'ring-border'
    } else {
      bgClass = 'bg-transparent'
      ringClass = 'ring-transparent'
    }

    return (
      <div
        onMouseDown={e => {
          // The old wrapper was one big <label>, so a click anywhere (icon,
          // padding) focused the input. Keep that, without disturbing the
          // input's own caret placement.
          if (e.target === inputRef.current) return
          e.preventDefault()
          inputRef.current?.focus()
        }}
        onMouseEnter={field ? undefined : () => setIsHovered(true)}
        onMouseLeave={field ? undefined : () => setIsHovered(false)}
        className={cn(
          // Fixed height (was py-2 around the line box) so the field sits
          // exactly on the ladder's control height.
          `flex items-center cursor-text ${sizeClasses.gap} ${shape.input} ${
            compact ? 'px-2' : 'px-2.5'
          } ${sizeClasses.control} ring-1 transition-all duration-fast`,
          bgClass,
          ringClass,
          // Inside a field, the field root dims label and input together.
          disabled && !field && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        {Icon && (
          <Icon
            size={sizeClasses.icon}
            strokeWidth={iconActive ? 2 : 1.5}
            className={cn(
              'shrink-0 transition-[color,stroke-width] duration-fast',
              iconActive ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
        )}
        {/* Base UI's own Input is this Field.Control: on its own it is a
            plain input, inside a Field.Root it joins the field's wiring. */}
        <Field.Control
          // Typed HTMLElement since `render` could swap the element; without
          // one it is the <input>.
          ref={(node: HTMLElement | null) => {
            const input = node as HTMLInputElement | null
            inputRef.current = input
            if (typeof ref === 'function') ref(input)
            else if (ref) ref.current = input
          }}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={e => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={e => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          disabled={disabled}
          aria-invalid={invalid || undefined}
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
  const compact = sizeClasses.variant === 'compact'

  return (
    <label
      ref={ref}
      className={cn(
        'inline-grid',
        sizeClasses.text,
        // One notch tighter than the ladder's control padding — the field
        // ring is invisible at rest, so the roomier inset reads as a gap.
        compact ? 'pl-2' : 'pl-2.5',
        className,
      )}
      {...props}
    >
      <span className="col-start-1 row-start-1 invisible weight-semibold" aria-hidden="true">
        {children}
      </span>
      <span
        className={cn(
          'col-start-1 row-start-1',
          invalid ? 'text-destructive' : 'text-muted-foreground',
          'weight-normal',
        )}
      >
        {children}
      </span>
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

  const group = (
    <InputGroupContext.Provider value={contextValue}>
      <div
        ref={node => {
          ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        onMouseEnter={handlers.onMouseEnter}
        onMouseMove={handlers.onMouseMove}
        onMouseLeave={handlers.onMouseLeave}
        // `relative` makes this div the fields' offsetParent — the fluid hover
        // hook measures items via offsetTop and compares against
        // container-relative mouse coords, so the two coordinate spaces must
        // share this origin (same as every other fluid hover consumer).
        className={cn('relative flex flex-col gap-3 w-72 max-w-full', className)}
        {...props}
      >
        {children}
      </div>
    </InputGroupContext.Provider>
  )

  // A size prop pins every field in the group to one ladder step.
  return size ? <SizeProvider size={size}>{group}</SizeProvider> : group
}) as InputGroupComponent

InputGroup.displayName = 'InputGroup'

interface InputFieldProps extends Omit<InputProps, 'invalid' | 'size' | 'className'> {
  /** Label text above the input. */
  label: string
  /** Keep the label for assistive tech but don't render it — for inline fields (a toolbar search) where the placeholder carries the meaning. Defaults to `false`. */
  labelHidden?: boolean
  /** Position index within the group (required for fluid hover). */
  index: number
  /** Error message shown below the input. */
  error?: string
  className?: string
}

const InputField = forwardRef<HTMLDivElement, InputFieldProps>(
  ({ label, labelHidden, index, error, disabled, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const { registerItem, activeIndex } = useInputGroup()
    const sizeClasses = useSize()
    const compact = sizeClasses.variant === 'compact'

    useRegisterFluidHoverItem(registerItem, index, internalRef)

    const fieldState = useMemo(() => ({ active: activeIndex === index }), [activeIndex, index])

    return (
      // Base UI Field wires the accessibility plumbing: Field.Label's htmlFor
      // targets the control, Field.Error's generated id lands in the control's
      // aria-describedby, and `invalid` drives aria-invalid / data-invalid.
      <Field.Root
        ref={node => {
          ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        invalid={!!error}
        disabled={disabled}
        className={cn('flex flex-col gap-1 cursor-text', disabled && 'opacity-50 pointer-events-none', className)}
      >
        {/* sr-only when hidden so the field keeps its accessible name and
            the htmlFor wiring. */}
        <Field.Label
          render={
            <Label invalid={!!error} className={labelHidden ? 'sr-only' : undefined}>
              {label}
            </Label>
          }
        />

        <FieldStateContext.Provider value={fieldState}>
          <Input invalid={!!error} disabled={disabled} {...props} />
        </FieldStateContext.Provider>

        {/* Error message — `match` pins it visible while our controlled
            `error` prop is standing. */}
        {error && (
          <Field.Error
            match
            className={cn(
              'text-destructive',
              compact ? 'text-caption-compact pl-2' : 'text-caption pl-2.5',
              'weight-medium',
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
