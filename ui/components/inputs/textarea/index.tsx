/*
 * Local addition (not part of Fluid Functionalism): the multi-line twin of
 * Input, on the same field box (`useFieldBox` in `lib/field-classes.ts`); the box grows with its text from `minRows` to `maxRows`, the way
 * InputMessage's composer does.
 */

import { Field } from '@base-ui/react/field'
import { forwardRef, type TextareaHTMLAttributes, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { type FieldVariant, focusControlOnPress, useFieldBox } from '../../../lib/field-classes'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'defaultValue' | 'rows'> {
  /** Placeholder text. */
  placeholder?: string
  /** Controlled value. Pair with `onChange`. */
  value?: string
  /** Initial value when uncontrolled. Defaults to `''`. */
  defaultValue?: string
  /** Called with the new value on every change. With neither `value` nor `onChange` the textarea keeps its text in the DOM, for `register()`-style forms that read it through a `ref`; choose one mode per instance, since a `defaultValue` with a conditional `onChange` flips between the two. A form library's event handler goes in `onInput`, not here. */
  onChange?: (value: string) => void
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
  /** Keeps the value selectable but not editable, with the field's read-only look. Defaults to the surrounding Field's `readOnly`. */
  readOnly?: boolean
  /** Marks the textarea required. Defaults to the surrounding Field's `required`. */
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
 * uncontrolled with `defaultValue`, or controlled with `value` + `onChange`,
 * fills the width of its container, and joins a Base UI `Field` when placed
 * inside one. Pair it with a `Label` (see Input) through `htmlFor` / `id`,
 * or put it in an `InputGroup.Field` to label it, join the group's hover and
 * take the field's error.
 *
 * With neither `value` nor `onChange` it is a plain uncontrolled `<textarea>`:
 * the DOM holds the text, `ref` is the real element, and `defaultValue`,
 * `ref.current.value = ''` and a native `form.reset()` all behave as on any
 * textarea (the box re-fits on input and on a form reset), which is what a form
 * library reading fields through refs needs. Choose one mode per instance:
 * a `defaultValue` with an `onChange` that is sometimes passed and sometimes
 * not would flip the textarea between DOM-held and controlled text.
 *
 * `register()`'s result can't be spread whole, because its `onChange` takes an
 * event where this one takes a string, but only that key clashes. Pull it out
 * and hand it to `onInput`, which is the event handler and fires on every
 * keystroke: `const { onChange, ...rest } = register('x')` then
 * `<Textarea {...rest} onInput={onChange} />` (`rest` carries `name`, `ref`
 * and `onBlur`).
 *
 * @example {@include ./examples.mdx}
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      value: valueProp,
      defaultValue = '',
      onChange: onChangeProp,
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
    const [value, onChange] = useControllableState(valueProp, defaultValue, onChangeProp)
    const domState = valueProp === undefined && onChangeProp === undefined

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const box = useFieldBox({ variant, invalid, disabled, readOnly, required, size })

    const resize = useCallback(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = 'auto'
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight)
      const max = lineHeight * Math.max(maxRows, minRows)
      el.style.height = `${Math.min(Math.max(el.scrollHeight, lineHeight * minRows), max)}px`
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
    }, [minRows, maxRows])

    // Layout effect: the new height lands before paint, so a wrapped line
    // never flashes a scrollbar. `value` and the size step aren't read here,
    // but they change the content height `resize` measures.
    useLayoutEffect(resize, [resize, value, box.size.variant])

    // DOM-held text changes without a render: re-fit when code assigns `ref.current.value` (the
    // setter is wrapped on the element, over React's own value tracker) and once a native form
    // reset has put the default back.
    useEffect(() => {
      const el = textareaRef.current
      if (!domState || !el) return
      const own = Object.getOwnPropertyDescriptor(el, 'value')
      const inherited = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      const base = own ?? inherited
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
    }, [domState, resize])

    // The first measure can run while an ancestor is still at (near-)zero
    // width. Width-gated, so the observer never loops on its own height writes.
    useEffect(() => {
      const el = textareaRef.current
      if (!el) return
      let lastWidth = el.offsetWidth
      const observer = new ResizeObserver(() => {
        if (el.offsetWidth === lastWidth) return
        lastWidth = el.offsetWidth
        resize()
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [resize])

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the textarea is the focusable control; the box only forwards pointer focus from its padding.
      <div
        onMouseDown={focusControlOnPress(textareaRef)}
        {...box.props}
        className={cn(box.props.className, 'flex', PADDING_Y[box.size.variant], className)}
      >
        {/* Field.Control rendered as a <textarea>: on its own a plain
            textarea, inside a Field.Root it joins the field's wiring. The
            rest props ride on the render element, since Field.Control types
            its own as an <input>'s; Base UI merges the two. */}
        <Field.Control
          ref={(node: HTMLElement | null) => {
            const textarea = node as HTMLTextAreaElement | null
            textareaRef.current = textarea
            if (typeof ref === 'function') ref(textarea)
            else if (ref) ref.current = textarea
          }}
          render={<textarea rows={minRows} {...props} />}
          {...(domState ? { defaultValue, onChange: resize } : { value, onChange: e => onChange(e.target.value) })}
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
