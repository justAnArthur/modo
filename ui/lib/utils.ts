/*!
 * Ported from Fluid Functionalism — `registry/default/lib/utils.ts` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

import type { CnFunction } from 'cn'
import { createCn } from 'cn/config'

const TYPE_ROLES = ['display', 'title', 'subtitle', 'body', 'caption', 'micro']
const TIERS = ['fast', 'fast-exit', 'moderate', 'moderate-exit', 'slow', 'slow-exit']

// The type-scale role utilities (see /docs/sizes) are font sizes, but
// tailwind-merge can't know that for custom classes — by default anything
// text-<word> it doesn't recognize is treated as a text *color*, so
// cn("text-body", "text-muted-foreground") would silently drop the size.
export const cn: CnFunction = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: TYPE_ROLES.flatMap(role => [role, `${role}-compact`]) }],
      'font-variation': [{ weight: ['normal', 'medium', 'semibold', 'bold'] }],
      duration: [{ duration: TIERS }],
      delay: [{ delay: TIERS }],
      rounded: [{ rounded: ['box', 'glyph'] }],
      'text-box': ['text-trim'],
    },
  },
})
