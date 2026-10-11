// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The class recipe (`buttonVariants`) and the size aliases, split out of
 *   `index.tsx` so server code can call them: no JSX, hooks or contexts here.
 *   `index.tsx` re-exports them.
 * - Styling reads DS tokens (see `index.tsx`).
 * - Variants `outline` (an alias of `tertiary`), `destructive`, `success` and
 *   `link`, and the `xs` size alias (→ `compact`), for hosts with a
 *   shadcn-style API; see `index.tsx` for the look.
 */

import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  [
    'group relative isolate inline-flex items-center justify-center outline-none cursor-pointer',
    'transition-[color,opacity] duration-fast',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-focus-ring',
  ],
  {
    variants: {
      variant: {
        primary: 'text-background',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        outline: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
        destructive: 'text-destructive-strong',
        success: 'text-success-strong',
        // The underline is always drawn and fades its color in, so hovering
        // never shifts a pixel of the label.
        link: 'text-foreground underline underline-offset-4 decoration-transparent hover:decoration-current transition-[color,opacity,text-decoration-color]',
      },
      // The two-step size ladder shared by every control — see /docs/sizes.
      // default = 36px control height, compact = 28px for dense surfaces.
      size: {
        default: 'h-9 px-4 text-body gap-1.5',
        compact: 'h-7 px-3 text-body-compact gap-1',
        icon: 'h-9 w-9 p-0 [&_svg]:h-4 [&_svg]:w-4',
        'icon-compact': 'h-7 w-7 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
      },
      iconLeft: { true: '' },
      iconRight: { true: '' },
    },
    // An icon sits 4px closer to its edge than text does: 12px default and
    // 8px compact, against the 16px / 12px base padding.
    compoundVariants: [
      { size: 'compact', iconLeft: true, className: 'pl-2' },
      { size: 'default', iconLeft: true, className: 'pl-3' },
      { size: 'compact', iconRight: true, className: 'pr-2' },
      { size: 'default', iconRight: true, className: 'pr-3' },
      // A link is text: no surface to pad, but it keeps the control height so
      // it still lines up with the buttons beside it.
      { variant: 'link', size: ['default', 'compact'], className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'link'

type ButtonSizeCanonical = 'default' | 'compact' | 'icon' | 'icon-compact'

/** Public size values: the canonical two-size scale plus aliases, kept so
 *  existing call sites keep compiling. Aliases resolve onto the canonical
 *  ladder (sm, xs → compact; md/lg → default). The ladder has two steps, so
 *  `xs` is compact rather than a third height. */
type ButtonSize = ButtonSizeCanonical | 'xs' | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-lg'

const legacySizeAliases: Partial<Record<ButtonSize, ButtonSizeCanonical>> = {
  xs: 'compact',
  sm: 'compact',
  md: 'default',
  lg: 'default',
  'icon-sm': 'icon-compact',
  'icon-lg': 'icon',
}

export type { ButtonSize, ButtonSizeCanonical, ButtonVariant }
export { buttonVariants, legacySizeAliases }
