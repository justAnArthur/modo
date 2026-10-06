/*
 * Local addition (not part of Fluid Functionalism): the one renderer behind
 * every morphing overlay, driven by `lib/use-morph.ts`. It goes inside the
 * Base UI popup, which stays transparent and at its final size:
 *
 * - shapes: while goo or morph runs, the growing surface, cut around the
 *   source so the source stays visible. For goo, an SVG goo filter melts it
 *   with a copy of the source into one shape with a liquid neck. The filter (blur, alpha threshold, composite on top) is beUI's
 *   gooey popover (github.com/starc007/ui-components
 *   `components/motion/popover.tsx` @ de52f337e520e7ee37749b36eb1c32df86137bcb
 *   — MIT © 2026 Saurabh Chauhan, notice: LICENSE.beui), the same one Sileo's
 *   toast uses (github.com/hiaaryan/sileo `src/sileo.tsx` @
 *   9793f844349983e140cf33cebbb8f51626d41407 — MIT, notice: LICENSE.sileo).
 * - surface: the background and, above it, the shadow (so a dark scheme's
 *   inset highlight lands on top, as on one `Elevated` element). Two layers
 *   so the shadow can fade in while the goo neck is still attached.
 * - content: in normal flow at its final place, revealed by a clip from the
 *   same rect.
 */

import type { ReactNode } from 'react'
import { GOO_MATRIX, type Morph } from './use-morph'
import { cn } from './utils'

interface MorphSurfaceProps {
  /** The engine, from `useMorph`. */
  morph: Morph
  /** Background class of the surface: `SURFACE_BG[level]`, or `bg-foreground` for an inverted tooltip. */
  bg?: string
  /** Shadow class (`SURFACE_SHADOW[level]`); leave out for a flat surface. */
  shadow?: string
  /** Radius class the surface rests at (the shape context's `container`, `bg`, …). */
  radius: string
  /** Classes for the content wrapper: padding, width. */
  className?: string
  /** The overlay's content. */
  children?: ReactNode
}

export function MorphSurface({ morph, bg, shadow, radius, className, children }: MorphSurfaceProps) {
  const { refs, gooId, effect } = morph

  return (
    <>
      {effect === 'goo' && (
        <svg aria-hidden className="absolute size-0">
          <filter id={gooId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur ref={refs.blur} in="SourceGraphic" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values={GOO_MATRIX} result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>
      )}
      {(effect === 'goo' || effect === 'morph') && (
        // The filter is the effect itself, not a visual value: it melts the shapes' own token background.
        <div
          ref={refs.shapes}
          aria-hidden
          className="pointer-events-none absolute hidden"
          style={effect === 'goo' ? { filter: `url(#${gooId})` } : undefined}
        >
          {effect === 'goo' && <div ref={refs.copy} className={cn('absolute', bg)} />}
          <div ref={refs.shape} className={cn('absolute', bg)} />
        </div>
      )}
      <div ref={refs.bg} aria-hidden className={cn('pointer-events-none absolute inset-0', bg, radius)} />
      {shadow && (
        <div ref={refs.shadow} aria-hidden className={cn('pointer-events-none absolute inset-0', shadow, radius)} />
      )}
      <div ref={refs.content} className={cn('relative', className)}>
        {children}
      </div>
    </>
  )
}
