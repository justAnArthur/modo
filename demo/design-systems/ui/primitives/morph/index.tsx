/*
 * Local addition (not part of Fluid Functionalism): the docs page of the morph
 * engine (`lib/use-morph.ts`, `lib/morph-layers.tsx`). `Morph` is a docs stage
 * like `primitives/motion`'s `Motion`: a trigger and a small panel that plays
 * one `from` × `effect` pair, so the page's examples stay hook-free.
 */

import { type ReactNode, useState } from 'react'
import Button from '../../components/button'
import { MorphSurface } from '../../lib/morph-layers'
import { useShape } from '../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { useMorph, useMorphOrigin } from '../../lib/use-morph'
import { cn } from '../../lib/utils'

interface MorphProps {
  /** Where the panel grows from: the pressed `'trigger'`, the press `'pointer'` (a circle; keyboard opens use the trigger's center), the panel's own `'center'`, or a viewport edge (`'top'`, `'right'`, `'bottom'`, `'left'`). Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left'
  /** How it gets there: `'goo'` grows the surface with a liquid neck to its source, `'morph'` grows it without one, `'slide'` moves the finished panel in, `'fade'` only fades (what every effect becomes under reduced motion). Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Spring tier the panel opens on; it closes on the tier's faster exit tween. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
  /** Hide the trigger while the panel is open, so the trigger reads as becoming the panel. Defaults to `false`. */
  hideSource?: boolean
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Uncontrolled initial open state, toggled by the built-in trigger. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called with the next open state when the trigger is pressed. */
  onOpenChange?: (open: boolean) => void
  /** Label of the built-in trigger. Defaults to `'Open'`. */
  label?: string
  /** Extra classes for the stage (trigger + panel). */
  className?: string
  /** The panel's content. */
  children?: ReactNode
}

/**
 * Overlays grow out of whatever opened them. One progress value on a spring
 * tier carries the surface from its source to its own box, and every
 * morphing overlay in this system runs on that one engine.
 *
 * The overlay's popup keeps its final size the whole time, so Base UI's
 * positioning, collision flipping and focus handling never see the animation.
 * Inside it, three layers move: the surface's background and its shadow (the
 * `Elevated` level, as `SURFACE_BG` / `SURFACE_SHADOW`), the goo layer that
 * melts the surface into its source, and the content, revealed by a clip
 * from the same rect. The surface moves its real box rather than being
 * clipped, so its shadow is never cut off and nothing scales.
 *
 * ## Options
 *
 * Every morphing overlay takes the same three options.
 *
 * - `from` — where the surface grows from. `'trigger'` is the trigger that
 *   was pressed; it is measured again on close, and when it has gone or
 *   scrolled away the surface grows from its `'center'` instead.
 *   `'pointer'` is the press point, `'center'` the panel's own center, and an
 *   edge (`'top'`, `'right'`, `'bottom'`, `'left'`) the side of the viewport.
 *   Components also take a ref to any element, such as a card that
 *   expands.
 * - `effect` — `'goo'` (the default) grows the surface with a liquid neck to
 *   its source, like two drops of water merging; `'morph'` grows it without
 *   one; `'slide'` moves the finished panel in; `'fade'` only fades.
 * - `hideSource` — hides the source while open, so it reads as turning into
 *   the overlay. Focus can still return to it.
 *
 * ## Motion
 *
 * The morph opens on a spring tier (`slow` by default) and closes on that
 * tier's faster exit tween, like every other animation here (see Motion).
 * With reduced motion on, every effect becomes a fade.
 *
 * ## The `Morph` stage
 *
 * `Morph` itself is a docs stage, not a building block: a trigger and a small
 * panel below it that plays one `from` × `effect` pair.
 *
 * @example {@include ./examples.mdx}
 */
export default function Morph({
  from = 'trigger',
  effect = 'goo',
  tier = 'slow',
  hideSource = false,
  open,
  defaultOpen = false,
  onOpenChange,
  label = 'Open',
  className,
  children,
}: MorphProps) {
  const [shown, setShown] = useControllableState(open, defaultOpen, onOpenChange)
  const [mounted, setMounted] = useState(shown)
  if (shown && !mounted) setMounted(true)
  const { origin, capture } = useMorphOrigin()
  const morph = useMorph(shown, origin, { from, effect, tier, hideSource }, () => setMounted(false))
  const shape = useShape()
  const level = Math.min(useSurface() + 2, 8)

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <Button
        variant="secondary"
        aria-expanded={shown}
        onClick={event => {
          if (!shown) capture({ trigger: event.currentTarget, event: event.nativeEvent })
          setShown(!shown)
        }}
      >
        {shown ? 'Close' : label}
      </Button>
      {(shown || mounted) && (
        <div ref={morph.popupRef} className="absolute top-full left-1/2 z-10 mt-3 -translate-x-1/2">
          <SurfaceProvider value={level}>
            <MorphSurface
              morph={morph}
              bg={SURFACE_BG[level]}
              shadow={SURFACE_SHADOW[level]}
              radius={shape.container}
              className="w-56 p-4"
            >
              {children}
            </MorphSurface>
          </SurfaceProvider>
        </div>
      )}
    </div>
  )
}

export type { MorphProps }
export { Morph }
