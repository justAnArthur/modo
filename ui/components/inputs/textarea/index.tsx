/*
 * Local addition (not part of Fluid Functionalism): the multi-line twin of
 * Input, on the same field box.
 */

'use client'

import { Field } from '@base-ui/react/field'
import { forwardRef, type Ref, type TextareaHTMLAttributes, useRef } from 'react'
import { focusControlOnPress, useFieldBox } from '../../../lib/field-box'
import type { FieldVariant } from '../../../lib/field-classes'
import { mergeRefs } from '../../../lib/merge-refs'
import type { SizeVariant } from '../../../lib/size-context'
import { useAutosizeTextarea } from '../../../lib/use-autosize-textarea'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'defaultValue' | 'rows'> {
  /** Placeholder text. */
  placeholder?: string
  /** Controlled value. Pair with `onValueChange`. */
  value?: string
  /** Initial value when uncontrolled. Defaults to `''`. */
  defaultValue?: string
  /** Called with the new value on every change. */
  onValueChange?: (value: string) => void
  /** Rows shown when empty; the box never gets shorter. Defaults to `3`. */
  minRows?: number
  /** Rows the box grows to before it scrolls. Set it to `minRows` for a fixed height. Defaults to `8`. */
  maxRows?: number
  /** Framed at rest, or invisible until hovered or focused. Defaults to `"borderless"`. */
  variant?: FieldVariant
  /** Marks the value invalid: the field turns destructive and sets `aria-invalid`. Defaults to `false`. */
  invalid?: boolean
  /** Disables the textarea. Defaults to `false`. */
  disabled?: boolean
  /** Pins the textarea to one step of the size ladder (36px default, 28px compact): its text and padding follow, so one row matches an Input. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the ringed box around the textarea. */
  className?: string
}

// Literal table: one row plus this padding lands on the ladder's control
// height (20px leading + 8px × 2 = 36px, + 4px × 2 = 28px).
const PADDING_Y: Record<SizeVariant, string> = {
  default: 'py-2',
  compact: 'py-1',
}

/**
 * Multi-line text field that grows with what you type.
 *
 * It sits on the same ground as Input: bare text at rest (or framed, with
 * `variant="bordered"`), a muted fill with a hairline ring on hover, the
 * card ground on focus, a destructive ring when `invalid`. The box starts at `minRows`, grows line by line as text wraps,
 * and scrolls once it reaches `maxRows`. One row lines up with an Input of
 * the same size, so the two stack in a form without a seam. It is
 * uncontrolled with `defaultValue`, or controlled with `value` + `onValueChange`,
 * fills the width of its container, and joins a Base UI `Field` when placed
 * inside one. Pair it with a `Label` (see Input) through `htmlFor` / `id`,
 * or put it in an `InputGroup.Field` to label it, join the group's hover and
 * take the field's error.
 *
 * @example {@include ./examples.mdx}
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      value: valueProp,
      defaultValue = '',
      onValueChange,
      minRows = 3,
      maxRows = 8,
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

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const box = useFieldBox({ variant, invalid, disabled, size })

    useAutosizeTextarea(textareaRef, { minRows, maxRows }, [value, box.size.variant])

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the textarea is the focusable control; the box only forwards pointer focus from its padding.
      <div
        onMouseDown={focusControlOnPress(textareaRef)}
        {...box.props}
        className={cn(box.props.className, 'flex', PADDING_Y[box.size.variant], className)}
      >
        {/* The rest props ride on the render element: Field.Control types its own as an <input>'s. */}
        <Field.Control
          ref={mergeRefs(textareaRef, ref) as Ref<HTMLElement>}
          render={<textarea rows={minRows} {...props} />}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={box.disabled}
          aria-invalid={box.invalid || undefined}
          className={cn(
            'block w-full resize-none rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
            box.size.text,
            'weight-normal',
          )}
        />
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

export type { TextareaProps }
export { Textarea }
export default Textarea
