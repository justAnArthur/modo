/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/badge.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

import { cva } from 'class-variance-authority'

export const badgeColors = {
  gray: 'var(--badge-gray)',
  red: 'var(--badge-red)',
  orange: 'var(--badge-orange)',
  amber: 'var(--badge-amber)',
  yellow: 'var(--badge-yellow)',
  lime: 'var(--badge-lime)',
  green: 'var(--badge-green)',
  emerald: 'var(--badge-emerald)',
  teal: 'var(--badge-teal)',
  cyan: 'var(--badge-cyan)',
  blue: 'var(--badge-blue)',
  indigo: 'var(--badge-indigo)',
  violet: 'var(--badge-violet)',
  purple: 'var(--badge-purple)',
  fuchsia: 'var(--badge-fuchsia)',
  pink: 'var(--badge-pink)',
  rose: 'var(--badge-rose)',
} as const

export type BadgeColor = keyof typeof badgeColors

export const badgeVariants = cva('inline-flex items-center weight-medium whitespace-nowrap', {
  variants: {
    variant: {
      solid: '',
      dot: 'border border-border text-foreground',
      outline: 'border border-border text-foreground',
    },
    size: {
      default: 'h-6 px-2.5 text-caption gap-1.5',
      compact: 'h-5 px-2 text-caption-compact gap-1',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'default',
  },
})
