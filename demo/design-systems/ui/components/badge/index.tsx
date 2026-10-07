/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/badge.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/*` imports rewritten to relative `../../lib/*` paths.
 * - `BadgeProps` re-declares `variant` (inherited from cva's VariantProps
 *   upstream) and carries the FF docs API-table descriptions on every prop,
 *   so modo's parser lists them; types are unchanged for callers.
 * - TSDoc with the FF docs page's examples added above the component;
 *   `export default Badge` added.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; `font-medium` → `weight-medium`; literal colors →
 *   color tokens.
 * - Changes animate (local, in the morph layer's language): a new label or
 *   variant springs the badge from its old width to its new one on
 *   `spring.moderate` (the content clipped on the way) while the label
 *   crossfades with Toast's blur; a color fades over `duration-moderate`, and
 *   the dot scales in and out with the label sliding to make room. The content
 *   sits in one inner span that carries the morph, so the root keeps the
 *   caller's `style`.
 */

import { cva, type VariantProps } from 'class-variance-authority'
import { AnimatePresence, animate, motion, useReducedMotionConfig } from 'motion/react'
import { forwardRef, type HTMLAttributes, type ReactNode, useLayoutEffect, useRef } from 'react'
import { useShape } from '../../lib/shape-context'
import { useSizeVariant } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'

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

const badgeVariants = cva('inline-flex items-center weight-medium whitespace-nowrap', {
  variants: {
    variant: {
      solid: '',
      dot: 'border border-border text-foreground',
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

const { exit: _exit, ...enter } = spring.moderate

/** The label as text, when it is text: the key its crossfade runs on. */
function textOf(node: ReactNode) {
  const parts = Array.isArray(node) ? node : [node]
  if (parts.every(part => typeof part === 'string' || typeof part === 'number')) return parts.join('')
}

/* Width morph (local): when the label or the variant changes, the content
   span springs from its old width to its new one instead of jumping, and the
   badge follows it. By the time the change commits the span already has its
   new width, so a ResizeObserver keeps the resting one. At rest the inline
   width is dropped. */
function useWidthMorph(change: string) {
  const content = useRef<HTMLSpanElement>(null)
  const rest = useRef(0)
  const live = useRef<number | null>(null)
  const reduced = useReducedMotionConfig()

  useLayoutEffect(() => {
    const el = content.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (live.current === null) rest.current = el.offsetWidth
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = content.current
    const from = live.current ?? rest.current
    if (!el || !from) return
    el.style.width = ''
    const to = el.offsetWidth
    rest.current = to
    live.current = null
    if (reduced || from === to) return
    const write = (width: number) => {
      live.current = width
      el.style.width = `${width}px`
    }
    write(from)
    const controls = animate(from, to, {
      ...enter,
      onUpdate: write,
      onComplete: () => {
        live.current = null
        el.style.width = ''
      },
    })
    return () => controls.stop()
  }, [change, reduced])

  return content
}

interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
    Omit<VariantProps<typeof badgeVariants>, 'size'> {
  /** Visual style. Solid uses a tinted background; dot shows a colored indicator. Defaults to `"solid"`. */
  variant?: 'solid' | 'dot'
  /** Step on the size ladder (see Sizes). Legacy sm/md/lg values resolve as aliases (sm → compact; md/lg → default). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: BadgeSize
  /** Color from the Tailwind palette: gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose. Defaults to `"gray"`. */
  color?: BadgeColor
}

/**
 * Compact label for status, category, or metadata. Supports solid and dot
 * variants with Tailwind colors.
 *
 * Solid badges tint their background with the chosen color mixed into the
 * page background (gray uses the accent token); dot badges keep a neutral
 * border and show the color as a small indicator. The badge rides the size
 * ladder — `size` pins it, otherwise it follows the surrounding SizeProvider
 * — and takes its corner radius from the shape context. Changes animate: a
 * new label or variant springs the width while the label crossfades, and a
 * new color fades in. The palette is also exported as `badgeColors`, the class
 * recipe as `badgeVariants`.
 *
 * @example {@include ./examples.mdx}
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'solid', size: sizeProp, color = 'gray', children, style, ...props }, ref) => {
    const shape = useShape()
    // Resolve the size: explicit prop (legacy aliases mapped onto the
    // canonical ladder) > surrounding SizeProvider > default.
    const contextSize = useSizeVariant()
    const size: BadgeSizeCanonical = sizeProp
      ? (legacySizeAliases[sizeProp] ?? (sizeProp as BadgeSizeCanonical))
      : contextSize === 'compact'
        ? 'compact'
        : 'default'
    const colorValue = badgeColors[color]
    const isSolid = variant === 'solid'
    const dotSize = size === 'compact' ? 6 : 7

    const colorStyle = isSolid
      ? color === 'gray'
        ? { backgroundColor: 'var(--accent)', color: 'var(--foreground)' }
        : {
            color: 'var(--foreground)',
            backgroundColor: `color-mix(in srgb, ${colorValue} 15%, var(--background))`,
          }
      : {}

    const dotColor = color === 'gray' ? 'var(--muted-foreground)' : colorValue
    const label = textOf(children)
    const content = useWidthMorph(`${variant} ${size} ${label}`)

    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          shape.item,
          'transition-[background-color] duration-moderate',
          className,
        )}
        style={{ ...colorStyle, ...style }}
        {...props}
      >
        {/* The morphing box: it may shrink below its content while the width
            springs (min-w-0), clipping it sideways only, and it positions
            whatever pops out of the flow on its way out. */}
        <span ref={content} className="relative inline-flex min-w-0 items-center gap-[inherit] overflow-x-clip">
          <AnimatePresence mode="popLayout" initial={false}>
            {!isSolid && (
              <motion.span
                key="dot"
                className="shrink-0 rounded-full transition-[background-color] duration-moderate"
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: dotColor,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0, transition: spring.moderate.exit }}
                transition={enter}
              />
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout" initial={false}>
            {/* text-box needs a block container — the badge root is a flex
                container, so the label gets its own span. Height is fixed
                (h-*), so trimming only recenters the letterforms. */}
            <motion.span
              key={label ?? 'label'}
              layout="position"
              className="[text-box:trim-both_cap_alphabetic]"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              // At rest the label keeps no filter, which would make it its own stacking context.
              animate={{ opacity: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
              exit={{ opacity: 0, filter: 'blur(4px)', transition: spring.moderate.exit }}
              transition={enter}
            >
              {children}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    )
  },
)

Badge.displayName = 'Badge'

export type { BadgeColor, BadgeProps, BadgeSize }
export { Badge, badgeColors, badgeVariants }

export default Badge
