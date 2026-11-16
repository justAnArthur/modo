/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
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
        ghost: 'text-muted-foreground hover:text-foreground',
      },
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
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)
