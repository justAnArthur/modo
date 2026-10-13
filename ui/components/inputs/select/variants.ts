// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/select.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `triggerVariants`, split out of `index.tsx` unchanged
 * into a module with no JSX, hooks or contexts, so server code can build the
 * trigger's classes; `index.tsx` re-exports it. Styling reads DS tokens (see
 * `index.tsx`).
 */

import { cva } from 'class-variance-authority'

export const triggerVariants = cva(
  [
    'group inline-flex items-center justify-between outline-none cursor-pointer',
    'transition-all duration-fast',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-focus-ring',
  ],
  {
    variants: {
      variant: {
        bordered: 'border border-border bg-transparent text-foreground hover:bg-hover',
        borderless: 'border border-transparent bg-transparent text-foreground hover:bg-hover',
      },
    },
    defaultVariants: {
      variant: 'bordered',
    },
  },
)
