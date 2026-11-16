/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react'
import { fieldTextInset } from '../../../lib/field-classes'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'

interface LabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children' | 'className'> {
  /** Label text. */
  children: ReactNode
  /** The id of the control it names; a click on the label focuses or toggles that control. */
  htmlFor?: string
  /** Turns the label destructive, matching an invalid Input. Defaults to `false`. */
  invalid?: boolean
  /** Pins the label to one step of the size ladder (body text at default, compact body at compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `<label>`. */
  className?: string
}

/**
 * The label above a field control.
 *
 * Muted body text, inset to line up with the text inside a field box
 * (`fieldTextInset`), so a label over an Input starts where its value does.
 * Pair it with a control through `htmlFor` and the control's `id`; inside
 * `InputGroup.Field` (or a Base UI `Field.Label` rendering it) the field
 * links it for you, and a disabled field dims it. `invalid` turns it
 * destructive with the field. It follows the size ladder (see Sizes): `size`
 * pins it, otherwise it reads the surrounding SizeProvider. Also exported
 * from `inputs/input`.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/input-group.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Label = forwardRef<HTMLLabelElement, LabelProps>(({ children, invalid, size, className, ...props }, ref) => {
  const sizeClasses = useSize(size)

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the caller links the control (`htmlFor`, in props) or Field.Label does.
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

export type { LabelProps }
export { Label }

export default Label
