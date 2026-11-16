/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/elevated.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
} from 'react'
import { surfaceClasses } from '../../../lib/surface-classes'
import { SurfaceProvider, useLift, useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'

interface ElevatedProps extends ComponentPropsWithoutRef<'div'> {
  /** Steps above the current substrate: the level becomes `min(substrate + offset, 8)` and is re-provided to descendants. Conventionally 2 for a dropdown, popover or select menu, 4 for a dialog. */
  offset: number
  /** A fixed shadow level, for a surface whose shadow should not deepen with nesting (a dropdown reads `shadow-surface-3` on the page and in a dialog). Defaults to the surface level. */
  shadowLevel?: number
  /** Merged after the surface classes; radius and padding go here. */
  className?: string
  /** Content of the surface. Everything inside reads this surface's level as its substrate. */
  children?: ReactNode
}

type ElevatedComponent = ForwardRefExoticComponent<ElevatedProps & RefAttributes<HTMLDivElement>> & {
  Provider: typeof SurfaceProvider
}

/**
 * Eight surface levels that nest. Components read their substrate from
 * context and lift relative to it, so popovers, dropdowns, and dialogs stay
 * visible at any depth — in both light and dark mode.
 *
 * Three pieces: tokens, substrate context, and the primitive. The tokens are
 * eight `bg-surface-N` / `shadow-surface-N` pairs. The substrate is a React
 * context holding the level of the container you are in (1, the page, when
 * nothing provides one). `Elevated` reads that substrate, settles at
 * `min(substrate + offset, 8)`, paints the matching background and shadow,
 * and re-provides its own level, so nested surfaces keep climbing the ladder
 * without anything passed between them. Conventional offsets: 2 for a
 * dropdown, popover or select menu; 4 for a dialog or modal. All other props
 * (ref included) go to the `div`.
 *
 * Statics:
 * - `Elevated.Provider` — `SurfaceProvider`: set the substrate for a subtree
 *   by hand (1 page, 3 popover, 5 dialog).
 *
 * Also exported: `SurfaceProvider`, `useSurface()` (the current substrate
 * level, 1 when no provider is present), `useLift(offset)` (the level
 * `offset` above it, capped at 8) and `surfaceClasses(bgLevel,
 * shadowLevel = bgLevel)` for components that paint a level without
 * `Elevated`.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/lib/elevated.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, ...props }, ref) => {
    const level = useLift(offset)
    return (
      <SurfaceProvider value={level}>
        <div ref={ref} className={cn(surfaceClasses(level, shadowLevel ?? level), className)} {...props}>
          {children}
        </div>
      </SurfaceProvider>
    )
  },
) as ElevatedComponent
Elevated.displayName = 'Elevated'

Object.assign(Elevated, { Provider: SurfaceProvider })

export type { ElevatedProps }
export { Elevated, SurfaceProvider, surfaceClasses, useLift, useSurface }

export default Elevated
