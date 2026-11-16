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
    'duration-fast',
    'disabled:opacity-50 disabled:pointer-events-none',
    // A loading Button disables through aria-disabled (it keeps focus).
    'aria-disabled:opacity-50 aria-disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-focus-ring',
  ],
  {
    variants: {
      variant: {
        primary: 'text-primary-foreground',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
        outline: 'text-foreground',
        destructive: 'text-destructive-strong',
        success: 'text-success-strong',
        // The underline is always drawn and fades its color in, so a hover
        // never shifts a pixel of the label.
        link: 'text-foreground underline underline-offset-4 decoration-transparent hover:decoration-current',
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
      // A link is text: no surface to pad, but it keeps the control height so
      // it lines up with the buttons beside it.
      { variant: 'link', size: ['default', 'compact'], className: 'px-0' },
      { variant: 'link', className: 'transition-[color,opacity,text-decoration-color]' },
      {
        variant: ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'destructive', 'success'],
        className: 'transition-[color,opacity]',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)
