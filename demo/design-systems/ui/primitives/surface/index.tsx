/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/elevated.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/{utils,surface-context,surface-classes}` imports rewritten to `../../lib/*`.
 * - `className` / `children` re-declared on `ElevatedProps` with descriptions (modo's parser
 *   lists only members declared in the interface body); `children` doc added.
 * - modo item: TSDoc (from the FF "Surfaces" docs page) on the component, the forwardRef
 *   result typed with its `Provider` static, `Object.assign(Elevated, { Provider: SurfaceProvider })`,
 *   `SurfaceProvider` / `useSurface` / `surfaceClasses` re-exported, and a default export.
 * - Imports `./surface.css` (the 8-level ladder tokens; modo also auto-injects it).
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`;
 *   `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 *   `spring.*`.
 */

import './surface.css'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
} from 'react'
import { surfaceClasses } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { cn } from '../../lib/utils'

interface ElevatedProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Steps above the current substrate.
   *
   * The component's own surface level becomes `min(substrate + offset, 8)`
   * and is re-provided to descendants via SurfaceProvider, so further
   * nesting walks up the ladder automatically.
   *
   * Conventional offsets:
   *   2 — dropdown / popover / select menu
   *   4 — dialog / modal
   */
  offset: number
  /**
   * Override for the shadow level. Defaults to the computed surface level.
   *
   * Pass a fixed value when the component should keep a constant shadow
   * weight regardless of how deeply it's nested — e.g. a dropdown always
   * reads `shadow-surface-3` whether it opens on the page or inside a
   * dialog, even though its background tracks the substrate.
   */
  shadowLevel?: number
  /** Merged after the surface classes; radius and padding go here. */
  className?: string
  /** Content of the surface. Everything inside reads this surface's level as its substrate. */
  children?: ReactNode
}

interface ElevatedStatics {
  /** `SurfaceProvider` — set the substrate for a subtree by hand. */
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
 * level, 1 when no provider is present) and `surfaceClasses(bgLevel,
 * shadowLevel = bgLevel)` for components that paint a level without
 * `Elevated`.
 *
 * @example {@include ./examples.mdx}
 */
const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, ...props }, ref) => {
    const substrate = useSurface()
    const level = Math.min(substrate + offset, 8)
    return (
      <SurfaceProvider value={level}>
        <div ref={ref} className={cn(surfaceClasses(level, shadowLevel ?? level), className)} {...props}>
          {children}
        </div>
      </SurfaceProvider>
    )
  },
) as ForwardRefExoticComponent<ElevatedProps & RefAttributes<HTMLDivElement>> & ElevatedStatics
Elevated.displayName = 'Elevated'

Object.assign(Elevated, { Provider: SurfaceProvider })

export type { ElevatedProps }
export { Elevated, SurfaceProvider, surfaceClasses, useSurface }

export default Elevated
