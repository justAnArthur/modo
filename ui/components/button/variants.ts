// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The class recipe (`buttonVariants`) and the size aliases, split out of
 *   `index.tsx` so server code can call them: no JSX, hooks or contexts here.
 *   `index.tsx` re-exports them.
 * - Styling reads DS tokens (see `index.tsx`).
 * - Variants `outline` (an alias of `tertiary`), `destructive`, `success` and
 *   `link`, and the `xs` size alias (→ `compact`), for hosts with a
 *   shadcn-style API; see `index.tsx` for the look.
 * - `buttonVariants` takes the size aliases too (resolved as the Button
 *   resolves them), so a host can re-export it as is.
 * - `surface: true` (local): the fill, ring, hover, press and disabled look
 *   as root classes, for an element that is not a Button (`<a>`), which has
 *   no surface layer of its own. Static: no press shrink, no loading morph.
 *   The transition list moved into compounds so one element gets exactly one.
 */

import { cva, type VariantProps } from 'class-variance-authority'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'link'

type SurfacedVariant = Exclude<ButtonVariant, 'link'>

const SURFACED: SurfacedVariant[] = ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'destructive', 'success']

/* The Button draws its fill on an inner layer 1px inside the root and fills
   that pixel back out with a same-color spread. Without the layer the root
   is the surface, so the fill sits on the root and the outline ring is an
   inset hairline on the same edge. Same tokens and mixes as the layer
   (`index.tsx` bgVariants); plain `hover:` / `active:` instead of `group-*`. */
const surfaceVariants: Record<SurfacedVariant, string> = {
  primary:
    '[--btn-bg:var(--foreground)] hover:[--btn-bg:color-mix(in_oklab,var(--foreground)_90%,var(--background))] active:[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)]',
  secondary:
    '[--btn-bg:var(--accent)] hover:[--btn-bg:color-mix(in_oklab,var(--accent)_80%,var(--background))] active:[--btn-bg:var(--accent)] bg-[var(--btn-bg)]',
  tertiary: 'shadow-[inset_0_0_0_1px_var(--border)] hover:bg-hover active:bg-active',
  outline: 'shadow-[inset_0_0_0_1px_var(--border)] hover:bg-hover active:bg-active',
  ghost: 'hover:bg-hover active:bg-active',
  destructive: 'bg-destructive-wash hover:bg-destructive-wash-hover active:bg-destructive-wash-active',
  success: 'bg-success-wash hover:bg-success-wash-hover active:bg-success-wash-active',
}

const buttonRecipe = cva(
  [
    'group relative isolate inline-flex items-center justify-center outline-none cursor-pointer',
    'duration-fast',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:ring-1 focus-visible:ring-focus-ring',
  ],
  {
    variants: {
      variant: {
        primary: 'text-background',
        secondary: 'text-foreground',
        tertiary: 'text-foreground',
        outline: 'text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground',
        destructive: 'text-destructive-strong',
        success: 'text-success-strong',
        // The underline is always drawn and fades its color in, so hovering
        // never shifts a pixel of the label.
        link: 'text-foreground underline underline-offset-4 decoration-transparent hover:decoration-current',
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
      // The fill and ring as root classes, for a non-Button host (an anchor).
      surface: {
        true: [
          'rounded-lg',
          'aria-disabled:opacity-50 aria-disabled:pointer-events-none',
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
      // it still lines up with the buttons beside it.
      { variant: 'link', size: ['default', 'compact'], className: 'px-0' },
      // One transition list per element: a link fades its underline, a
      // surface its fill and ring.
      { variant: 'link', className: 'transition-[color,opacity,text-decoration-color]' },
      { variant: SURFACED, surface: false, className: 'transition-[color,opacity]' },
      {
        variant: SURFACED,
        surface: true,
        className: 'no-underline transition-[color,opacity,background-color,box-shadow]',
      },
      ...SURFACED.map(variant => ({ variant, surface: true, className: surfaceVariants[variant] })),
      // The Button sizes its icons by prop; children of a surface host are sized here.
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

type ButtonSizeCanonical = 'default' | 'compact' | 'icon' | 'icon-compact'

/** Public size values: the canonical two-size scale plus aliases, kept so
 *  existing call sites keep compiling. Aliases resolve onto the canonical
 *  ladder (sm, xs → compact; md/lg → default). The ladder has two steps, so
 *  `xs` is compact rather than a third height. */
type ButtonSize = ButtonSizeCanonical | 'xs' | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-lg'

const legacySizeAliases: Partial<Record<ButtonSize, ButtonSizeCanonical>> = {
  xs: 'compact',
  sm: 'compact',
  md: 'default',
  lg: 'default',
  'icon-sm': 'icon-compact',
  'icon-lg': 'icon',
}

type ButtonRecipeOptions = NonNullable<Parameters<typeof buttonRecipe>[0]>

/** Options of `buttonVariants`: the Button's look, picked without rendering one. */
interface ButtonVariantsOptions extends Omit<ButtonRecipeOptions, 'size'> {
  /** Visual style. Defaults to `"primary"`. */
  variant?: ButtonVariant | null
  /** Step on the size ladder; the aliases resolve as on the Button (xs, sm → compact; md, lg → default; icon-sm → icon-compact; icon-lg → icon). Defaults to `"default"`. */
  size?: ButtonSize | null
  /** Draw the fill, ring, hover, press and disabled (`aria-disabled`) look on the element itself, for a host that is not a Button, such as an `<a>`. Static: no press shrink or loading morph — prefer `<Button asChild>` when you can render a component. Defaults to `false`. */
  surface?: boolean | null
}

/**
 * The Button's class recipe, callable from server code (no JSX, hooks or
 * context). Without `surface` it returns the root classes the Button builds
 * on: layout, label color, size, focus ring — the fill lives on the Button's
 * inner layer, so on its own it reads as a bare label. With `surface: true`
 * the fill and ring go on the element itself, for an anchor styled as a
 * button. Size aliases resolve onto the ladder; the radius is the rounded
 * shape's (pass `rounded-[20px]` or read `useShape().button` for pill).
 */
function buttonVariants({ size, ...options }: ButtonVariantsOptions = {}): string {
  const canonical = size ? (legacySizeAliases[size] ?? (size as ButtonSizeCanonical)) : size
  return buttonRecipe({ ...options, size: canonical } as ButtonRecipeOptions)
}

type ButtonVariantsProps = VariantProps<typeof buttonVariants>

export type { ButtonSize, ButtonSizeCanonical, ButtonVariant, ButtonVariantsOptions, ButtonVariantsProps }
export { buttonVariants, legacySizeAliases }
