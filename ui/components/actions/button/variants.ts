/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

import { cva } from 'class-variance-authority'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'link'

type ButtonSizeCanonical = 'default' | 'compact' | 'icon' | 'icon-compact'

/** `icon-sm` is the modo chrome's name for `icon-compact` (its shell Button contract). */
type ButtonSize = ButtonSizeCanonical | 'icon-sm'

type SurfacedVariant = Exclude<ButtonVariant, 'link'>

const SURFACED: SurfacedVariant[] = ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'destructive', 'success']

/* `surface: true`: the Button draws its fill on an inner layer 1px inside the
   root; a host that is not a Button (an anchor) has no layer, so the fill sits
   on the root and the frame is an inset hairline on the same edge. Same tokens
   as the layer (index.tsx bgVariants), plain `hover:` / `active:`. Static: no
   press shrink, no loading morph. */
const surfaceVariants: Record<SurfacedVariant, string> = {
  primary:
    '[--btn-bg:var(--primary)] hover:[--btn-bg:var(--primary-hover)] active:[--btn-bg:var(--primary-active)] bg-[var(--btn-bg)] shadow-button-primary',
  secondary:
    '[--btn-bg:var(--accent)] hover:[--btn-bg:color-mix(in_oklab,var(--accent)_80%,var(--background))] active:[--btn-bg:var(--accent)] bg-[var(--btn-bg)]',
  tertiary: 'shadow-[inset_0_0_0_1px_var(--border)] hover:bg-hover active:bg-active',
  outline: 'shadow-[inset_0_0_0_1px_var(--control-border)] hover:bg-hover active:bg-active',
  ghost: 'hover:bg-hover active:bg-active',
  destructive: 'bg-destructive-wash hover:bg-destructive-wash-hover active:bg-destructive-wash-active',
  success: 'bg-success-wash hover:bg-success-wash-hover active:bg-success-wash-active',
}

const buttonRecipe = cva(
  [
    'group relative isolate inline-flex items-center justify-center outline-none cursor-pointer',
    'duration-fast',
    'disabled:opacity-50 disabled:pointer-events-none',
    // A loading Button disables through aria-disabled (it keeps focus).
    'aria-disabled:opacity-50 aria-disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-focus-ring',
  ],
  {
    variants: {
      variant: {
        primary: 'text-primary-foreground',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
        outline: 'text-foreground',
        destructive: 'text-destructive-strong',
        success: 'text-success-strong',
        // The underline is always drawn and fades its color in, so a hover
        // never shifts a pixel of the label.
        link: 'text-foreground underline underline-offset-4 decoration-transparent hover:decoration-current',
      },
      size: {
        default: 'h-9 px-4 text-body gap-1.5',
        compact: 'h-7 px-3 text-body-compact gap-1',
        icon: 'h-9 w-9 p-0 [&_svg]:h-4 [&_svg]:w-4',
        'icon-compact': 'h-7 w-7 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
      },
      iconLeft: { true: '' },
      iconRight: { true: '' },
      surface: {
        true: [
          'rounded-box',
          '[&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast hover:[&_svg]:stroke-[2]',
        ],
        false: '',
      },
    },
    // An icon sits 4px closer to its edge than text does: 12px default and
    // 8px compact, against the 16px / 12px base padding.
    compoundVariants: [
      { size: 'compact', iconLeft: true, className: 'pl-2' },
      { size: 'default', iconLeft: true, className: 'pl-3' },
      { size: 'compact', iconRight: true, className: 'pr-2' },
      { size: 'default', iconRight: true, className: 'pr-3' },
      // A link is text: no surface to pad, but it keeps the control height so
      // it lines up with the buttons beside it.
      { variant: 'link', size: ['default', 'compact'], className: 'px-0' },
      // One transition list per element: a link fades its underline, a surface host its fill and ring.
      { variant: 'link', className: 'transition-[color,opacity,text-decoration-color]' },
      { variant: SURFACED, surface: false, className: 'transition-[color,opacity]' },
      {
        variant: SURFACED,
        surface: true,
        className: 'no-underline transition-[color,opacity,background-color,box-shadow]',
      },
      ...SURFACED.map(variant => ({ variant, surface: true, className: surfaceVariants[variant] })),
      // The Button sizes its icons by prop; a surface host's children are sized here.
      { surface: true, size: 'default', className: '[&_svg]:size-4' },
      { surface: true, size: 'compact', className: '[&_svg]:size-3.5' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      surface: false,
    },
  },
)

/** Options of `buttonVariants`: the Button's look, picked without rendering one. */
interface ButtonVariantsOptions {
  /** Visual style. Defaults to `"primary"`. */
  variant?: ButtonVariant | null
  /** Step on the size ladder, or its square icon-only step; `"icon-sm"` is `"icon-compact"`. Defaults to `"default"`. */
  size?: ButtonSize | null
  /** The icon-side padding of a leading icon. Defaults to `false`. */
  iconLeft?: boolean | null
  /** The icon-side padding of a trailing icon. Defaults to `false`. */
  iconRight?: boolean | null
  /** Draw the fill, frame, hover, press and disabled look on the element itself, for a host that is not a Button (an `<a>`). Static: no press shrink or loading morph; prefer `<Button render={…}>` when you can. Defaults to `false`. */
  surface?: boolean | null
  /** Extra classes, appended. */
  className?: string
}

/**
 * The Button's class recipe, callable from server code (no JSX, hooks or
 * context). Without `surface` it returns the root classes the Button builds
 * on (layout, label color, size, focus ring): the fill lives on the Button's
 * inner layer, so on its own it reads as a bare label. With `surface: true`
 * the fill and frame go on the element itself. The radius is the rounded
 * shape's (read `useShape().button` for pill).
 */
function buttonVariants({ size, ...options }: ButtonVariantsOptions = {}): string {
  const canonical = size === 'icon-sm' ? 'icon-compact' : size
  return buttonRecipe({ ...options, size: canonical } as Parameters<typeof buttonRecipe>[0])
}

export type { ButtonSize, ButtonSizeCanonical, ButtonVariant, ButtonVariantsOptions }
export { buttonVariants }
