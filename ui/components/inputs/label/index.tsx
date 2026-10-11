/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: the label inside upstream's `InputField`, split out as
 * a plain `<label>` (first in `inputs/input`, which still re-exports it, then
 * its own item so it has a page and its docs travel with re-exports); `invalid`
 * and `size` props; `data-disabled` dims it (Base UI's `Field.Label` stamps it
 * in a disabled field). Styling reads DS tokens: `text-[Npx]` →
 * `text-<role>[-compact]`, inline `fontVariationSettings` → `weight-*`.
 */

import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
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
 * The label above or beside a field control.
 *
 * Muted body text inset to line up with the text inside a field box, so a
 * label over an Input starts where its value does. It reserves the width of
 * its semibold weight, so nothing moves if a wrapper restyles it. Pair it
 * with a control through `htmlFor` and the control's `id`; inside a Field,
 * `Field.Label` renders it for you and links it. `invalid` turns it
 * destructive with the field; a disabled Field dims it. It follows the size
 * ladder (see Sizes): `size` pins it, otherwise it reads the surrounding
 * SizeProvider. Also exported from `inputs/input`.
 *
 * @example {@include ./examples.mdx}
 */
const Label = forwardRef<HTMLLabelElement, LabelProps>(({ children, invalid, size, className, ...props }, ref) => {
  const sizeClasses = useSize(size)
  const compact = sizeClasses.variant === 'compact'

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the caller links the control (`htmlFor`, in props) or Field.Label does.
    <label
      ref={ref}
      className={cn(
        'inline-grid',
        sizeClasses.text,
        // Inside a disabled field, Field.Label stamps `data-disabled`.
        'data-[disabled]:opacity-50',
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

export type { LabelProps }
export { Label }

export default Label
