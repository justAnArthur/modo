/*
 * Vendored from Fluid Functionalism — `registry/default/lib/utils.ts` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - clsx + tailwind-merge's `extendTailwindMerge` replaced by `createCn` from
 *   `cn/config` (github.com/shadcn-ui/cn — a compiled drop-in with the same
 *   `{ extend: { classGroups } }` extension shape and the same output). The
 *   font-size class-group extension is kept 1:1.
 * - The local token utilities from uno.config.ts join their groups: the
 *   compact and `micro` type roles (font-size), `weight-*` (a group of its
 *   own), the motion tiers (duration, delay) and `rounded-box|glyph`.
 */

import { createCn } from 'cn/config'

const TYPE_ROLES = ['display', 'title', 'subtitle', 'body', 'caption', 'micro']
const TIERS = ['fast', 'fast-exit', 'moderate', 'moderate-exit', 'slow', 'slow-exit']

// The type-scale role utilities (see /docs/sizes) are font sizes, but
// tailwind-merge can't know that for custom classes — by default anything
// text-<word> it doesn't recognize is treated as a text *color*, so
// cn("text-body", "text-muted-foreground") would silently drop the size.
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: TYPE_ROLES.flatMap(role => [role, `${role}-compact`]) }],
      'font-variation': [{ weight: ['normal', 'medium', 'semibold', 'bold'] }],
      duration: [{ duration: TIERS }],
      delay: [{ delay: TIERS }],
      rounded: [{ rounded: ['box', 'glyph'] }],
    },
  },
})
