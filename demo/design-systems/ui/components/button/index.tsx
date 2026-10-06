// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/{icon-context,utils,shape-context,size-context}` imports rewritten to `../../lib/*`.
 * - `ButtonProps`: `variant`, `disabled` and `children` re-declared in the interface body (modo's
 *   parser lists only members declared there); member docs replaced by the FF docs API-table text
 *   (upstream's size-alias and `active` notes folded in).
 * - modo item: TSDoc (from the FF "Button" docs page, plus Sizes / Active / As child examples for
 *   the API-table props the page has no section for) and a default export.
 * - Also the modo docs-chrome Button (`modo.config.ts` shell.Button): the chrome renders its
 *   icon buttons as `<Button variant="ghost" size="icon-sm">`, served by upstream's legacy
 *   `icon-sm` → `icon-compact` alias.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 * - `loading` morphs (local, in the morph layer's language): the surface layer contracts into
 *   a circle around the spinner on `spring.moderate` and springs back when loading ends, while
 *   the button's own box keeps its size; the label and the spinner crossfade instead of
 *   swapping. The spinner centres on the button, not on the label. `aria-busy` while loading.
 *   The root's `transition-colors` → `transition-[color,opacity]`, so the disabled dim fades
 *   in step instead of jumping (the root draws no background or border of its own).
 */

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotionConfig } from 'motion/react'
import {
  type ButtonHTMLAttributes,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from 'react'
import type { IconComponent } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { useSizeVariant } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  [
    'group relative isolate inline-flex items-center justify-center outline-none cursor-pointer',
    'transition-[color,opacity] duration-fast',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-focus-ring',
  ],
  {
    variants: {
      variant: {
        primary: 'text-background',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
      },
      // The two-step size ladder shared by every control — see /docs/sizes.
      // default = 36px control height, compact = 28px for dense surfaces.
      size: {
        default: 'h-9 px-4 text-body gap-1.5',
        compact: 'h-7 px-3 text-body-compact gap-1',
        icon: 'h-9 w-9 p-0 [&_svg]:h-4 [&_svg]:w-4',
        'icon-compact': 'h-7 w-7 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
      },
      iconLeft: { true: '' },
      iconRight: { true: '' },
    },
    // An icon sits 4px closer to its edge than text does: 12px default and
    // 8px compact, against the 16px / 12px base padding.
    compoundVariants: [
      { size: 'compact', iconLeft: true, className: 'pl-2' },
      { size: 'default', iconLeft: true, className: 'pl-3' },
      { size: 'compact', iconRight: true, className: 'pr-2' },
      { size: 'default', iconRight: true, className: 'pr-3' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

type ButtonSizeCanonical = 'default' | 'compact' | 'icon' | 'icon-compact'

/** Public size values: the canonical two-size scale plus the pre-sizes-system
 *  aliases, kept so existing call sites keep compiling. Aliases resolve onto
 *  the canonical ladder (sm → compact; md/lg → default). */
type ButtonSize = ButtonSizeCanonical | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-lg'

const legacySizeAliases: Partial<Record<ButtonSize, ButtonSizeCanonical>> = {
  sm: 'compact',
  md: 'default',
  lg: 'default',
  'icon-sm': 'icon-compact',
  'icon-lg': 'icon',
}

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'size'> {
  /** Visual style of the button. Defaults to `"primary"`. */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'
  /** Step on the size ladder (36px default, 28px compact — see Sizes): `"default"` | `"compact"` | `"icon"` | `"icon-compact"`. Omitted, the button follows the surrounding SizeProvider. Legacy sm/md/lg values resolve as aliases (sm → compact; md/lg → default; icon-sm → icon-compact; icon-lg → icon). */
  size?: ButtonSize
  /** Merge props onto the child element instead of rendering a `<button>` — the single React-element child becomes the rendered element (slot-style). Defaults to `false`. */
  asChild?: boolean
  /** Folds the button into a circle around a spinner and disables it; the button keeps its box, so nothing around it moves. Defaults to `false`. */
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
const bgVariants: Record<string, string> = {
  primary:
    '[--btn-bg:var(--foreground)] group-hover:[--btn-bg:color-mix(in_oklab,var(--foreground)_90%,var(--background))] group-active:[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
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
    'bg-transparent shadow-[0_0_0_1px_transparent] group-hover:bg-hover group-hover:shadow-[0_0_0_1px_var(--hover)] group-active:bg-active group-active:shadow-[0_0_0_0px_var(--active)]',
}

/* Forced-active (`active` prop): pressed colors at full size; the
   geometric press-collapse still reacts on top. */
const activeBgVariants: Record<string, string> = {
  primary:
    '[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  secondary:
    '[--btn-bg:var(--accent)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]',
  tertiary:
    'bg-active shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]',
  ghost: 'bg-active shadow-[0_0_0_1px_var(--active)] group-active:shadow-[0_0_0_0px_var(--active)]',
}

const { exit: _exit, ...enter } = spring.moderate

/* Loading morph (local): the surface layer contracts from the button's box
   into a circle one control tall around the spinner, on one progress value
   like the morph layer (lib/use-morph.ts). The button's own box never
   changes, so nothing around it moves. Left and right mix a share of the
   button's width with pixels, so a stretched (w-full) button keeps the
   circle centred without measuring its width. At rest the inline geometry
   is dropped and the classes (inset-px, the inherited radius) take over. */
function useLoadingMorph(loading: boolean) {
  const surface = useRef<HTMLSpanElement>(null)
  const progress = useMotionValue(loading ? 1 : 0)
  const reduced = useReducedMotionConfig()

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
 * Four variants (primary, secondary, tertiary, ghost) on the two-step size
 * ladder: 36px by default, 28px compact — an explicit `size` wins, otherwise
 * the button follows the surrounding SizeProvider. The press effect shrinks
 * the fill by exactly 1px per side at any width, icons thicken their stroke
 * on hover, and `loading` folds the surface into a circle around a spinner
 * (and back when it ends) while the button keeps its box, so nothing around
 * it moves. Built on Base UI's Button; `asChild` renders your own
 * element (e.g. a link) with the button's styling instead.
 *
 * @example {@include ./examples.mdx}
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
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
    // asChild: the user's element becomes the root while the button's internal
    // structure (bg layer, content wrapper, spinner, icons) survives as its
    // children — the element's own children become the label. We clone the
    // element directly instead of routing through ButtonPrimitive's `render`:
    // Base UI would bolt button semantics (role="button", Space activation)
    // onto e.g. a link, where plain-link output is wanted.
    const asChildElement =
      asChild && isValidElement(children)
        ? (children as ReactElement<{
            children?: ReactNode
            className?: string
            style?: React.CSSProperties
            ref?: React.Ref<HTMLButtonElement>
            'aria-busy'?: boolean
          }>)
        : null
    const label = asChildElement ? asChildElement.props.children : children
    // Resolve the size: explicit prop (legacy aliases mapped onto the
    // canonical ladder) > surrounding SizeProvider > default.
    const contextSize = useSizeVariant()
    const resolvedSize: ButtonSizeCanonical = size
      ? (legacySizeAliases[size] ?? (size as ButtonSizeCanonical))
      : contextSize === 'compact'
        ? 'compact'
        : 'default'
    const isIconOnly = resolvedSize === 'icon' || resolvedSize === 'icon-compact'
    const isCompact = resolvedSize === 'compact' || resolvedSize === 'icon-compact'
    const iconSize = isCompact ? 14 : 16
    // Spinner box tracks the button height so the loading glyph stays
    // proportionate across sizes.
    const spinnerSizeClass = isCompact ? 'h-7 w-7' : 'h-9 w-9'
    const shape = useShape()
    const bgClass = active ? activeBgVariants[variant ?? 'primary'] : bgVariants[variant ?? 'primary']

    const surface = useLoadingMorph(loading)

    const internals = (
      <>
        <span
          ref={surface}
          aria-hidden
          className={cn(
            'absolute inset-px rounded-[inherit] transition-[box-shadow,background-color] [transition-duration:180ms,80ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease] group-active:[transition-duration:80ms,80ms]',
            bgClass,
          )}
        />
        {/* The label keeps its place while loading, so the button keeps its
            box. Whatever leaves goes on the fast exit, so the label and the
            spinner barely overlap while the surface folds or unfolds. */}
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
              {/* text-box only applies to block containers, so the trim lives
                  on the label span (a blockified flex item), not the flex root.
                  The button's height is fixed (h-*), so this doesn't change
                  layout — it just centers the cap-to-baseline box optically. */}
              <span className="[text-box:trim-both_cap_alphabetic]">{label}</span>
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
              <svg className={spinnerSizeClass} viewBox="0 0 24 24" fill="none">
                <path
                  d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
                  stroke="currentColor"
                  strokeWidth="1.125"
                  strokeLinecap="round"
                  pathLength="100"
                  style={{
                    strokeDasharray: '15 85',
                    animation: 'spinner-move 2s linear infinite, spinner-dash 4s ease-in-out infinite',
                  }}
                />
              </svg>
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
      className,
    )

    if (asChildElement) {
      const childProps = asChildElement.props
      return cloneElement(
        asChildElement,
        {
          ...props,
          ref,
          'aria-busy': loading || undefined,
          className: cn(rootClassName, childProps.className),
          style: { ...style, ...childProps.style },
        },
        internals,
      )
    }

    return (
      <ButtonPrimitive
        // Base UI's `ButtonPrimitive` forwards to an HTMLButtonElement;
        // keep the public ref type narrow so consumers see the right type.
        ref={ref as React.Ref<HTMLButtonElement>}
        className={rootClassName}
        disabled={disabled || loading}
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

export type { ButtonProps, ButtonSize }
export { Button, buttonVariants }

export default Button
