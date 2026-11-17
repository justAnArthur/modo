/*
 * Local addition (not part of Fluid Functionalism): the multi-line twin of
 * Input, on the same field box.
 */

'use client'

import { Field } from '@base-ui/react/field'
import { forwardRef, type Ref, type TextareaHTMLAttributes, useEffect, useRef } from 'react'
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
  /** Called with the new value on every change. With neither `value` nor `onValueChange` the textarea keeps its text in the DOM, for forms that read it through a `ref`. */
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
  /** Shows the value without letting it change: it can be selected and copied, the fill never lifts. Defaults to `false`. */
  readOnly?: boolean
  /** Marks the value required: the browser's validation (and an enclosing Field's) reports it missing while empty. Defaults to `false`. */
  required?: boolean
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
 * With neither `value` nor `onValueChange` it is a plain uncontrolled
 * `<textarea>`: the DOM holds the text, `ref` is the real element, and
 * `defaultValue`, `ref.current.value = ''` and a native `form.reset()` all
 * behave as on any textarea (the box re-fits after each), which is what a
 * form library reading fields through refs (`register()`) needs. Pass it
 * `name`, `ref` and `defaultValue`.
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
      readOnly,
      required,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
    const domHeld = valueProp === undefined && onValueChange === undefined

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const box = useFieldBox({ variant, invalid, disabled, readOnly, required, size })

    const resize = useAutosizeTextarea(textareaRef, { minRows, maxRows }, [value, box.size.variant])

    // DOM-held text changes without a render: re-fit when code assigns `value` (the setter is
    // wrapped on the element, over React's own value tracker) and once a form reset has put the
    // default back.
    useEffect(() => {
      const el = textareaRef.current
      if (!domHeld || !el) return
      const own = Object.getOwnPropertyDescriptor(el, 'value')
      const base = own ?? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      const set = base?.set
      if (set) {
        Object.defineProperty(el, 'value', {
          configurable: true,
          enumerable: base.enumerable,
          get: base.get,
          set(next: string) {
            set.call(this, next)
            resize()
          },
        })
      }
      const form = el.form
      const onReset = () => setTimeout(resize)
      form?.addEventListener('reset', onReset)
      return () => {
        form?.removeEventListener('reset', onReset)
        if (own) Object.defineProperty(el, 'value', own)
        else if (set) Reflect.deleteProperty(el, 'value')
      }
    }, [domHeld, resize])

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
          {...(domHeld ? { defaultValue, onChange: resize } : { value, onChange: e => setValue(e.target.value) })}
          disabled={box.disabled}
          readOnly={box.readOnly}
          required={box.required}
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
