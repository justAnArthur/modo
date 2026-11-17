/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/badge.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import type { VariantProps } from 'class-variance-authority'
import { AnimatePresence, animate, motion } from 'motion/react'
import { forwardRef, type HTMLAttributes, type ReactNode, useLayoutEffect, useRef } from 'react'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { useSizeVariant } from '../../../lib/size-context'
import { spring, springEnter } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { type BadgeColor, type BadgeSize, type BadgeVariant, badgeColors, badgeVariants } from './variants'

const enter = springEnter(spring.moderate)

/** The label as text, when it is text: the key its crossfade runs on. */
function textOf(node: ReactNode) {
  const parts = Array.isArray(node) ? node : [node]
  if (parts.every(part => typeof part === 'string' || typeof part === 'number')) return parts.join('')
}

/* The content springs from its old width to its new one. By the time a change
   commits the span already has its new width, so a ResizeObserver keeps the
   resting one. */
function useWidthMorph(change: string) {
  const content = useRef<HTMLSpanElement>(null)
  const rest = useRef(0)
  const live = useRef<number | null>(null)
  const reduced = useReduceMotion()

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
  /** Visual style. Solid uses a tinted background; dot shows a colored indicator; outline is the dot badge's neutral frame without the dot (it ignores `color`). Defaults to `"solid"`. */
  variant?: BadgeVariant
  /** Step on the size ladder (see Sizes). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: BadgeSize
  /** Color from the Tailwind palette: gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose. Defaults to `"gray"`. */
  color?: BadgeColor
}

/**
 * Compact label for status, category, or metadata. Supports solid, dot and
 * outline variants with Tailwind colors.
 *
 * Solid badges tint their background with the chosen color mixed into the
 * page background (gray uses the accent token); dot badges keep a neutral
 * border and show the color as a small indicator; outline badges are that
 * neutral frame alone, for a label that carries no status. The badge rides the size
 * ladder — `size` pins it, otherwise it follows the surrounding SizeProvider
 * — and takes its corner radius from the shape context. Changes animate: a
 * new label or variant springs the width while the label crossfades, and a
 * new color fades in. The palette is also exported as `badgeColors`, the class
 * recipe as `badgeVariants`.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/badge.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'solid', size: sizeProp, color = 'gray', children, style, ...props }, ref) => {
    const shape = useShape()
    const size = useSizeVariant(sizeProp)
    const colorValue = badgeColors[color]
    const isSolid = variant === 'solid'
    const hasDot = variant === 'dot'
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
        {/* min-w-0: it may shrink below its content while the width springs,
            clipping sideways only. */}
        <span ref={content} className="relative inline-flex min-w-0 items-center gap-[inherit] overflow-x-clip">
          <AnimatePresence mode="popLayout" initial={false}>
            {hasDot && (
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
            <motion.span
              key={label ?? 'label'}
              layout="position"
              className="text-trim"
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

export type { BadgeColor, BadgeVariant } from './variants'
export { badgeColors, badgeVariants } from './variants'
export type { BadgeProps, BadgeSize }
export { Badge }

export default Badge
