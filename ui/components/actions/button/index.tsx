/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { useSizeVariant } from '../../../lib/size-context'
import { resolveSlotTemplate, slotElement } from '../../../lib/slot'
import { SpinnerGlyph } from '../../../lib/spinner-glyph'
import { spring, springEnter } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { type ButtonSize, type ButtonSizeCanonical, type ButtonVariant, buttonVariants } from './variants'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button. `outline` frames it in the control border; `destructive` and `success` tint the label and a wash of their hue; `link` is underlined-on-hover text at the control height. Defaults to `"primary"`. */
  variant?: ButtonVariant
  /** Step on the size ladder (36px default, 28px compact — see Sizes), or its square icon-only step. `"icon-sm"` is `"icon-compact"` (the modo chrome's name). Omitted, the button follows the surrounding SizeProvider. */
  size?: ButtonSize
  /** Render this element (a link) with the button's styling and internals; its handlers and refs merge with the button's. */
  render?: ReactElement
  /** `render` spelled as the single child element: the child becomes the button and its children the label. Defaults to `false`. */
  asChild?: boolean
  /** Folds the button into a circle around a spinner and blocks presses; the button keeps its box, so nothing around it moves, and keeps keyboard focus (`aria-disabled`, not `disabled`). Defaults to `false`. */
  loading?: boolean
  /** Icon displayed before the label. */
  leadingIcon?: IconComponent
  /** Icon displayed after the label. */
  trailingIcon?: IconComponent
  /** Forces the pressed/held visual — e.g. while a dropdown or popover the button opened is showing. Defaults to `false`. */
  active?: boolean
  /** Disables the button. Defaults to `false`. */
  disabled?: boolean
  /** The label. With `size="icon"` / `"icon-compact"`, the icon itself (give the button an `aria-label`). */
  children?: ReactNode
}

/* Press effect: the surface layer sits 1px inside the button and a
   same-color box-shadow spread fills it back out to the full bounds.
   Pressing collapses the spread, shrinking the surface by exactly 1px per
   side at any width — a scale would warp (2% of a 400px button is 8px
   sideways but under 1px vertically). Fill colors are opaque color-mix()es
   rather than alpha so the fill and its spread ring never seam. */
const bgVariants: Record<ButtonVariant, string> = {
  // The `--primary*` hooks (tokens/colors.css); `--shadow-button-primary` joins the press ring.
  primary:
    '[--btn-bg:var(--primary)] group-hover:[--btn-bg:var(--primary-hover)] group-active:[--btn-bg:var(--primary-active)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg),var(--shadow-button-primary)] group-active:shadow-[0_0_0_0px_var(--btn-bg),var(--shadow-button-primary)]',
  secondary:
    '[--btn-bg:var(--accent)] group-hover:[--btn-bg:color-mix(in_oklab,var(--accent)_80%,var(--background))] group-active:[--btn-bg:var(--accent)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  // The border ring is an outer 1px shadow at rest that hands off to an
  // inset 1px shadow when pressed, so the ring moves inward with the
  // surface. The translucent fill only ever reaches the ring's inner edge
  // (exactly the surface box), so it needs no spread of its own.
  tertiary:
    'bg-transparent shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-hover:bg-hover group-active:bg-active group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  // Translucent fill + same-color spread never double up: outer shadows
  // render only outside the surface box.
  ghost:
    'bg-transparent shadow-button-ghost group-hover:bg-hover group-hover:shadow-[0_0_0_1px_var(--hover)] group-active:bg-active group-active:shadow-[0_0_0_0px_var(--active)]',
  // Tertiary's hand-off on the control border.
  outline:
    'bg-transparent shadow-button-outline group-hover:bg-hover group-active:bg-active group-active:shadow-button-outline-pressed',
  // A status as an action: a wash of its hue (the ghost recipe, a 1px ring
  // of the same wash as the spread), deepening on hover and press.
  destructive:
    'bg-destructive-wash ring-1 ring-destructive-wash group-hover:bg-destructive-wash-hover group-hover:ring-destructive-wash-hover group-active:bg-destructive-wash-active group-active:ring-destructive-wash-active group-active:ring-0',
  success:
    'bg-success-wash ring-1 ring-success-wash group-hover:bg-success-wash-hover group-hover:ring-success-wash-hover group-active:bg-success-wash-active group-active:ring-success-wash-active group-active:ring-0',
  link: 'bg-transparent',
}

/* Forced-active (`active` prop): pressed colors at full size; the
   geometric press-collapse still reacts on top. */
const activeBgVariants: Record<ButtonVariant, string> = {
  primary:
    '[--btn-bg:var(--primary-active)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg),var(--shadow-button-primary)] group-active:shadow-[0_0_0_0px_var(--btn-bg),var(--shadow-button-primary)]',
  secondary:
    '[--btn-bg:var(--accent)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  tertiary:
    'bg-active shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  ghost: 'bg-active shadow-[0_0_0_1px_var(--active)] group-active:shadow-[0_0_0_0px_var(--active)]',
  outline: 'bg-active shadow-button-outline group-active:shadow-button-outline-pressed',
  destructive: 'bg-destructive-wash-active ring-1 ring-destructive-wash-active group-active:ring-0',
  success: 'bg-success-wash-active ring-1 ring-success-wash-active group-active:ring-0',
  link: 'bg-transparent',
}

const enter = springEnter(spring.moderate)

function swallow(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

/* The surface contracts from the button's box into a circle one control tall
   around the spinner; the button's own box never changes. Left and right mix
   a share of the width with pixels, so a stretched (w-full) button keeps the
   circle centred without measuring itself. At rest the inline geometry goes
   and the classes take over. */
function useLoadingMorph(loading: boolean) {
  const surface = useRef<HTMLSpanElement>(null)
  const progress = useMotionValue(loading ? 1 : 0)
  const reduced = useReduceMotion()

  useLayoutEffect(() => {
    const el = surface.current
    const root = el?.parentElement
    if (!el || !root || (!loading && progress.get() === 0)) return
    const height = root.offsetHeight
    // The surface sits 1px inside the button (its spread fills that pixel back out).
    const circle = height / 2 - 1
    const rest = Math.min(Number.parseFloat(getComputedStyle(root).borderTopLeftRadius) || 0, circle)
    const render = (p: number) => {
      const side = `calc(${50 * p}% + ${1 - (height / 2) * p}px)`
      el.style.left = side
      el.style.right = side
      el.style.borderRadius = `${rest + (circle - rest) * p}px`
    }
    const settle = () => el.removeAttribute('style')
    const target = loading ? 1 : 0
    if (reduced || progress.get() === target) {
      progress.jump(target)
      return loading ? render(1) : settle()
    }
    const controls = animate(progress, target, {
      ...enter,
      onUpdate: render,
      onComplete: loading ? undefined : settle,
    })
    return () => controls.stop()
  }, [loading, reduced])

  return surface
}

/**
 * Versatile button with variants, sizes, loading state, and icon support.
 *
 * Upstream's four variants (primary, secondary, tertiary, ghost) plus four
 * local ones on the two-step size ladder: 36px by default, 28px compact — an
 * explicit `size` wins, otherwise the button follows the surrounding
 * SizeProvider. The press effect shrinks the fill by exactly 1px per side at
 * any width, icons thicken their stroke on hover, and `loading` folds the
 * surface into a circle around a spinner (and back when it ends) while the
 * button keeps its box, so nothing around it moves. A loading button blocks
 * presses but keeps keyboard focus. Built on Base UI's Button; `render` (or
 * `asChild`) renders your own element, e.g. a link, with the button's
 * styling instead.
 *
 * `outline` frames the button in the control border, which holds 3:1
 * against any surface where tertiary's hairline doesn't. `destructive` and
 * `success` put the hue's text on a wash of itself, never a solid fill, so a
 * view keeps one primary; their labels hold AA contrast at rest, hover and
 * press. `link` is foreground text at the control height whose underline
 * fades in on hover.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/button.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size,
      render,
      asChild = false,
      loading = false,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      active = false,
      disabled,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    // A template is cloned rather than handed to Base UI's `render`, which
    // would bolt button semantics (role, Space activation) onto a link.
    const { template, content: label } = resolveSlotTemplate(render, asChild, children)
    const contextSize = useSizeVariant()
    const resolvedSize: ButtonSizeCanonical = size === 'icon-sm' ? 'icon-compact' : (size ?? contextSize)
    const isIconOnly = resolvedSize === 'icon' || resolvedSize === 'icon-compact'
    const isCompact = resolvedSize === 'compact' || resolvedSize === 'icon-compact'
    const iconSize = isCompact ? 14 : 16
    const spinnerSizeClass = isCompact ? 'h-7 w-7' : 'h-9 w-9'
    const shape = useShape()
    const bgClass = active ? activeBgVariants[variant] : bgVariants[variant]

    const surface = useLoadingMorph(loading)

    const internals = (
      <>
        <span
          ref={surface}
          aria-hidden
          className={cn(
            'absolute inset-px rounded-[inherit] transition-[box-shadow,background-color] [transition-duration:var(--duration-moderate),var(--duration-fast)] [transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease] group-active:duration-fast',
            bgClass,
          )}
        />
        {/* The label keeps its place while loading, so the button keeps its box. */}
        <motion.span
          className="relative inline-flex items-center justify-center gap-[inherit]"
          initial={false}
          animate={{ opacity: loading ? 0 : 1 }}
          transition={loading ? spring.fast.exit : enter}
        >
          {isIconOnly ? (
            <span className="[&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast group-hover:[&_svg]:stroke-[2]">
              {label}
            </span>
          ) : (
            <>
              {LeadingIcon && (
                <LeadingIcon
                  size={iconSize}
                  strokeWidth={1.5}
                  className="transition-[stroke-width] duration-fast group-hover:stroke-[2]"
                />
              )}
              {/* text-box needs a block container: the flex item, not the root. */}
              <span className="text-trim">{label}</span>
              {TrailingIcon && (
                <TrailingIcon
                  size={iconSize}
                  strokeWidth={1.5}
                  className="transition-[stroke-width] duration-fast group-hover:stroke-[2]"
                />
              )}
            </>
          )}
        </motion.span>
        <AnimatePresence initial={false}>
          {loading && (
            <motion.span
              key="spinner"
              aria-hidden
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6, transition: spring.fast.exit }}
              transition={enter}
            >
              <SpinnerGlyph className={spinnerSizeClass} />
            </motion.span>
          )}
        </AnimatePresence>
      </>
    )

    const rootClassName = cn(
      buttonVariants({
        variant,
        size: resolvedSize,
        iconLeft: !isIconOnly && !!LeadingIcon,
        iconRight: !isIconOnly && !!TrailingIcon,
      }),
      shape.button,
      // A held link shows its underline.
      active && variant === 'link' && 'decoration-current',
      className,
    )

    if (template) {
      return slotElement(
        template,
        'button',
        {
          ...props,
          ref,
          'aria-busy': loading || undefined,
          'aria-disabled': loading || props['aria-disabled'],
          // A pending action blocks a second press, and a link's navigation.
          onClickCapture: loading ? swallow : props.onClickCapture,
          className: rootClassName,
          style,
        },
        internals,
      )
    }

    return (
      <ButtonPrimitive
        ref={ref}
        className={rootClassName}
        disabled={disabled || loading}
        // Loading disables through aria-disabled, so a keyboard user keeps focus on it.
        focusableWhenDisabled={loading && !disabled}
        aria-busy={loading || undefined}
        style={style}
        {...props}
      >
        {internals}
      </ButtonPrimitive>
    )
  },
)

Button.displayName = 'Button'

export type { ButtonSizeCanonical, ButtonVariantsOptions } from './variants'
export { buttonVariants } from './variants'
export type { ButtonProps, ButtonSize, ButtonVariant }
export { Button }

export default Button
