/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/thinking-indicator.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*` →
 *   `../../lib/*`.
 * - Prop JSDoc kept from upstream (it matches the FF docs API table);
 *   modo TSDoc and examples on `ThinkingIndicator`. The `.shimmer-text` rule
 *   the label rides lives in global.css.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`;
 *   `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 *   `spring.*`.
 * - A `variant="goo"` look (local, the morph style's goo): three
 *   `muted-foreground` dots that melt into one blob (swelling to hold their
 *   area) and split again through the shared `GooFilter`, one loop every
 *   eight slow-tier lengths, beside a plain cycling label. Reduced motion
 *   (`useReduceMotion`: the OS setting or MotionConfig's, which now also
 *   counts for the shimmer look) holds them split and still. The default stays upstream's
 *   `shimmer` look.
 */

import { AnimatePresence, motion } from 'motion/react'
import { forwardRef, type HTMLAttributes, useEffect, useId, useState } from 'react'
import { GooFilter } from '../../lib/morph-layers'
import { useReduceMotion } from '../../lib/reduced-motion'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { GOO_BLUR_RATIO } from '../../lib/use-morph'
import { cn } from '../../lib/utils'

const circleA = 'M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z'

const infinity = 'M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z'

const circleB =
  'M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z'

const words = ['Thinking', 'Moonwalking', 'Planning', 'Refining']

// Per ladder step, as literal classes for the extractor: the dot, the box of
// the three split dots, and the spacing between dot centers, wide enough that
// split dots let go of each other through the goo.
const DOTS: Record<SizeVariant, { box: string; dot: string; radius: number; gap: number }> = {
  default: { box: 'h-5 w-[26px]', dot: 'size-1.5', radius: 3, gap: 10 },
  compact: { box: 'h-[18px] w-[23px]', dot: 'size-[5px]', radius: 2.5, gap: 9 },
}

// The merged blob holds the three dots' area, so it swells as they melt in.
const MERGED = Math.sqrt(3)

/** Three dots that melt into one blob and split again, through the shared goo filter. */
function GooDots({ step, still }: { step: SizeVariant; still: boolean }) {
  const gooId = `thinking-goo-${useId().replace(/:/g, '')}`
  const { box, dot, radius, gap } = DOTS[step]
  // Split → merged → split over eight slow-tier lengths. A spring per move
  // is over in a frame or two at this size, too quick to see a neck form;
  // eased all the way, the necks stretch and snap in view.
  const loop = { duration: spring.slow.duration * 8, ease: 'easeInOut' as const, repeat: Infinity }

  return (
    <span aria-hidden className={cn('relative shrink-0', box)}>
      <GooFilter id={gooId} blur={radius * GOO_BLUR_RATIO} />
      {/* The filter is the effect itself: it melts the token-colored dots into one shape. */}
      <span className="absolute inset-0 flex items-center justify-center" style={{ filter: `url(#${gooId})` }}>
        {[-1, 0, 1].map(side => (
          <motion.span
            key={side}
            className={cn('absolute rounded-full bg-muted-foreground', dot)}
            animate={still ? { x: side * gap } : side ? { x: [side * gap, 0, side * gap] } : { scale: [1, MERGED, 1] }}
            transition={still ? { duration: 0 } : loop}
          />
        ))}
      </span>
    </span>
  )
}

interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  /** The look: `shimmer` morphs a circle⇄infinity glyph beside a shimmering label (Fluid Functionalism's), `goo` melts three dots into one blob and splits them again beside a plain label. Defaults to `"shimmer"`. */
  variant?: 'shimmer' | 'goo'
  /** Show the glyph (or, for `goo`, the dots) before the label. Set to `false` for a text-only indicator (e.g. inline before a streamed reply). Defaults to `true`. */
  showIcon?: boolean
  /** Step on the size ladder. Wins over the surrounding SizeProvider. Defaults to the provider's step, else `"default"`. */
  size?: SizeVariant
}

/**
 * Animated status indicator with morphing SVG and cycling text — the
 * assistant's working state.
 *
 * A glyph that morphs circle to infinity and back sits next to a shimmering
 * label that cycles Thinking, Moonwalking, Planning, Refining, each word
 * swapped on a spring. The row reserves the width of the longest word, so
 * nothing around it shifts while the words change. One static "Thinking…" is
 * announced to screen readers instead of a re-announcement every four
 * seconds, and reduced motion drops both the morph and the cycling for a
 * still glyph and label.
 *
 * `variant="goo"` swaps the glyph for three dots that melt into one blob and
 * split again through the goo filter (see Morph), beside a plain label;
 * reduced motion holds them split.
 *
 * @example {@include ./examples.mdx}
 */
const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
  ({ className, variant = 'shimmer', showIcon = true, size, ...props }, ref) => {
    const step = useSize(size).variant
    const compactStep = step === 'compact'
    const [index, setIndex] = useState(0)
    // Reduced motion drops the infinite glyph morph and the word cycling — a
    // static glyph and label carry the same meaning without the movement.
    const reduceMotion = useReduceMotion()
    const label = variant === 'goo' ? 'text-muted-foreground' : 'shimmer-text'

    useEffect(() => {
      if (reduceMotion) return
      const interval = setInterval(() => {
        setIndex(i => (i + 1) % words.length)
      }, 4000)
      return () => clearInterval(interval)
    }, [reduceMotion])

    return (
      <div ref={ref} role="status" className={cn('flex items-center gap-2 px-3 py-2', className)} {...props}>
        {/* Static announcement — the cycling word display below is aria-hidden
          so screen readers hear one "Thinking…" instead of a re-announcement
          every 4 seconds. */}
        <span className="sr-only">Thinking…</span>
        {showIcon && variant === 'goo' && <GooDots step={step} still={reduceMotion} />}
        {showIcon && variant === 'shimmer' && (
          <motion.svg
            aria-hidden
            width={compactStep ? 18 : 20}
            height={compactStep ? 18 : 20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground shrink-0"
          >
            {reduceMotion ? (
              <path d={infinity} />
            ) : (
              <motion.path
                d={circleA}
                initial={{ d: circleA }}
                animate={{
                  d: [circleA, infinity, circleB, infinity, circleA],
                }}
                transition={{
                  d: {
                    duration: 6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    times: [0, 0.25, 0.5, 0.75, 1.0],
                  },
                }}
              />
            )}
          </motion.svg>
        )}
        <span
          aria-hidden="true"
          className={cn(
            'inline-grid overflow-hidden',
            compactStep ? 'text-body-compact' : 'text-body',
            'weight-medium',
          )}
        >
          <span className={cn('col-start-1 row-start-1 invisible', label)}>
            {words.reduce((a, b) => (a.length >= b.length ? a : b))}
          </span>
          {reduceMotion ? (
            <span className={cn('col-start-1 row-start-1', label)}>{words[0]}</span>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={words[index]}
                className={cn('col-start-1 row-start-1', label)}
                initial={{ y: '80%', opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: { duration: spring.slow.duration, ease: [0.4, 0, 0.2, 1] },
                }}
                exit={{
                  y: '-80%',
                  opacity: 0,
                  transition: { duration: spring.slow.exit.duration, ease: [0.4, 0, 0.2, 1] },
                }}
              >
                {words[index]}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      </div>
    )
  },
)

ThinkingIndicator.displayName = 'ThinkingIndicator'

export type { ThinkingIndicatorProps }
export { ThinkingIndicator }
export default ThinkingIndicator
