/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/badge.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The palette (`badgeColors`), the class recipe (`badgeVariants`) and the size
 *   aliases, split out of `index.tsx` so server code can call them: no JSX, hooks
 *   or contexts here. `index.tsx` re-exports them.
 * - Styling reads DS tokens (see `index.tsx`).
 * - Variant `outline` (local): the dot badge's neutral hairline frame without the dot.
 */

import { cva } from 'class-variance-authority'

const badgeColors = {
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

type BadgeColor = keyof typeof badgeColors

type BadgeVariant = 'solid' | 'dot' | 'outline'

const badgeVariants = cva('inline-flex items-center weight-medium whitespace-nowrap', {
  variants: {
    variant: {
      solid: '',
      dot: 'border border-border text-foreground',
      // The dot badge without its dot: a neutral hairline label.
      outline: 'border border-border text-foreground',
    },
    // The two-step size ladder shared by every control — see /docs/sizes.
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

type BadgeSizeCanonical = 'default' | 'compact'

/** Public size values: the canonical two-size scale plus the pre-sizes-system
 *  aliases, kept so existing call sites keep compiling. Aliases resolve onto
 *  the canonical ladder (sm → compact; md/lg → default). */
type BadgeSize = BadgeSizeCanonical | 'sm' | 'md' | 'lg'

const legacySizeAliases: Partial<Record<BadgeSize, BadgeSizeCanonical>> = {
  sm: 'compact',
  md: 'default',
  lg: 'default',
}

export type { BadgeColor, BadgeSize, BadgeSizeCanonical, BadgeVariant }
export { badgeColors, badgeVariants, legacySizeAliases }
