/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/button.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/{icon-context,utils,shape-context,size-context}` imports rewritten to `../../_fluid/lib/*`.
 * - `ButtonProps`: `variant`, `disabled` and `children` re-declared in the interface body (modo's
 *   parser lists only members declared there); member docs replaced by the FF docs API-table text
 *   (upstream's size-alias and `active` notes folded in).
 * - modo item: TSDoc (from the FF "Button" docs page, plus Sizes / Active / As child examples for
 *   the API-table props the page has no section for) and a default export.
 * - Also the modo docs-chrome Button (`modo.config.ts` shell.Button): the chrome renders
 *   `<Button variant="ghost" size="sm">`, served by upstream's legacy `sm` → `compact` alias.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 */

import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { IconComponent } from "../../_fluid/lib/icon-context";
import { cn } from "../../_fluid/lib/utils";
import { useShape } from "../../_fluid/lib/shape-context";
import { useSizeVariant } from "../../_fluid/lib/size-context";

const buttonVariants = cva(
  [
    "group relative isolate inline-flex items-center justify-center outline-none cursor-pointer",
    "transition-colors duration-fast",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:ring-1 focus-visible:ring-focus-ring",
  ],
  {
    variants: {
      variant: {
        primary: "text-background",
        secondary: "text-foreground",
        tertiary: "text-foreground",
        ghost: "text-muted-foreground hover:text-foreground",
      },
      // The two-step size ladder shared by every control — see /docs/sizes.
      // default = 36px control height, compact = 28px for dense surfaces.
      size: {
        default: "h-9 px-4 text-body gap-1.5",
        compact: "h-7 px-3 text-body-compact gap-1",
        icon: "h-9 w-9 p-0 [&_svg]:h-4 [&_svg]:w-4",
        "icon-compact": "h-7 w-7 p-0 [&_svg]:h-3.5 [&_svg]:w-3.5",
      },
      iconLeft: { true: "" },
      iconRight: { true: "" },
    },
    // An icon sits 4px closer to its edge than text does: 12px default and
    // 8px compact, against the 16px / 12px base padding.
    compoundVariants: [
      { size: "compact", iconLeft: true, className: "pl-2" },
      { size: "default", iconLeft: true, className: "pl-3" },
      { size: "compact", iconRight: true, className: "pr-2" },
      { size: "default", iconRight: true, className: "pr-3" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonSizeCanonical = "default" | "compact" | "icon" | "icon-compact";

/** Public size values: the canonical two-size scale plus the pre-sizes-system
 *  aliases, kept so existing call sites keep compiling. Aliases resolve onto
 *  the canonical ladder (sm → compact; md/lg → default). */
type ButtonSize =
  | ButtonSizeCanonical
  | "sm"
  | "md"
  | "lg"
  | "icon-sm"
  | "icon-lg";

const legacySizeAliases: Partial<Record<ButtonSize, ButtonSizeCanonical>> = {
  sm: "compact",
  md: "default",
  lg: "default",
  "icon-sm": "icon-compact",
  "icon-lg": "icon",
};

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "size"> {
  /** Visual style of the button. Defaults to `"primary"`. */
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  /** Step on the size ladder (36px default, 28px compact — see Sizes): `"default"` | `"compact"` | `"icon"` | `"icon-compact"`. Omitted, the button follows the surrounding SizeProvider. Legacy sm/md/lg values resolve as aliases (sm → compact; md/lg → default; icon-sm → icon-compact; icon-lg → icon). */
  size?: ButtonSize;
  /** Merge props onto the child element instead of rendering a `<button>` — the single React-element child becomes the rendered element (slot-style). Defaults to `false`. */
  asChild?: boolean;
  /** Shows a spinner and disables the button. Defaults to `false`. */
  loading?: boolean;
  /** Icon displayed before the label. */
  leadingIcon?: IconComponent;
  /** Icon displayed after the label. */
  trailingIcon?: IconComponent;
  /** Forces the pressed/held visual — e.g. while a dropdown or popover the button opened is showing. Defaults to `false`. */
  active?: boolean;
  /** Disables the button. Defaults to `false`. */
  disabled?: boolean;
  /** The label. With `size="icon"` / `"icon-compact"`, the icon itself (give the button an `aria-label`). */
  children?: ReactNode;
}

/* Press effect: the surface layer sits 1px inside the button and a
   same-color box-shadow spread fills it back out to the full bounds.
   Pressing collapses the spread, shrinking the surface by exactly 1px per
   side at any width — a scale would warp (2% of a 400px button is 8px
   sideways but under 1px vertically). Fill colors are opaque color-mix()es
   rather than alpha so the fill and its spread ring never seam. */
const bgVariants: Record<string, string> = {
  primary:
    "[--btn-bg:var(--foreground)] group-hover:[--btn-bg:color-mix(in_oklab,var(--foreground)_90%,var(--background))] group-active:[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]",
  secondary:
    "[--btn-bg:var(--accent)] group-hover:[--btn-bg:color-mix(in_oklab,var(--accent)_80%,var(--background))] group-active:[--btn-bg:var(--accent)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]",
  // The border ring is an outer 1px shadow at rest that hands off to an
  // inset 1px shadow when pressed, so the ring moves inward with the
  // surface. The translucent fill only ever reaches the ring's inner edge
  // (exactly the surface box), so it needs no spread of its own.
  tertiary:
    "bg-transparent shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-hover:bg-hover group-active:bg-active group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]",
  // Translucent fill + same-color spread never double up: outer shadows
  // render only outside the surface box.
  ghost:
    "bg-transparent shadow-[0_0_0_1px_transparent] group-hover:bg-hover group-hover:shadow-[0_0_0_1px_var(--hover)] group-active:bg-active group-active:shadow-[0_0_0_0px_var(--active)]",
};

/* Forced-active (`active` prop): pressed colors at full size; the
   geometric press-collapse still reacts on top. */
const activeBgVariants: Record<string, string> = {
  primary:
    "[--btn-bg:color-mix(in_oklab,var(--foreground)_80%,var(--background))] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]",
  secondary:
    "[--btn-bg:var(--accent)] bg-[var(--btn-bg)] shadow-[0_0_0_1px_var(--btn-bg)] group-active:shadow-[0_0_0_0px_var(--btn-bg)]",
  tertiary:
    "bg-active shadow-[0_0_0_1px_var(--border),inset_0_0_0_0px_var(--border)] group-active:shadow-[0_0_0_0px_var(--border),inset_0_0_0_1px_var(--border)]",
  ghost:
    "bg-active shadow-[0_0_0_1px_var(--active)] group-active:shadow-[0_0_0_0px_var(--active)]",
};

/**
 * Versatile button with variants, sizes, loading state, and icon support.
 *
 * Four variants (primary, secondary, tertiary, ghost) on the two-step size
 * ladder: 36px by default, 28px compact — an explicit `size` wins, otherwise
 * the button follows the surrounding SizeProvider. The press effect shrinks
 * the fill by exactly 1px per side at any width, icons thicken their stroke
 * on hover, and `loading` swaps the label for a spinner while keeping the
 * button's width. Built on Base UI's Button; `asChild` renders your own
 * element (e.g. a link) with the button's styling instead.
 *
 * @example
 * # Variants
 *
 * 4 variants, inline or full width: add `className="w-full"` to stretch one
 * to its container.
 *
 * ```tsx
 * <div className="flex w-fit max-w-full flex-col gap-8">
 *   <div className="flex items-center gap-2">
 *     <Button variant="primary">Primary</Button>
 *     <Button variant="secondary">Secondary</Button>
 *     <Button variant="tertiary">Tertiary</Button>
 *     <Button variant="ghost">Ghost</Button>
 *   </div>
 *   <div className="flex flex-col gap-2">
 *     <Button variant="primary" className="w-full">Primary</Button>
 *     <Button variant="secondary" className="w-full">Secondary</Button>
 *     <Button variant="tertiary" className="w-full">Tertiary</Button>
 *     <Button variant="ghost" className="w-full">Ghost</Button>
 *   </div>
 * </div>
 * ```
 *
 * @example
 * # With Icons
 *
 * `leadingIcon` and `trailingIcon` take an icon component; it sits 4px
 * closer to its edge than the label would.
 *
 * ```tsx
 * <div className="flex flex-wrap items-center gap-2">
 *   <Button leadingIcon={Plus}>Create</Button>
 *   <Button variant="secondary" trailingIcon={ArrowRight}>Next</Button>
 *   <Button variant="tertiary" leadingIcon={Search} trailingIcon={ArrowRight}>
 *     Search
 *   </Button>
 * </div>
 * ```
 *
 * @example
 * # Loading & Disabled
 *
 * `loading` shows a spinner and disables the button; the hidden label keeps
 * its width.
 *
 * ```tsx
 * <div className="flex flex-wrap items-center gap-2">
 *   <Button loading>Loading</Button>
 *   <Button variant="secondary" loading leadingIcon={Loader}>Saving</Button>
 *   <Button disabled>Disabled</Button>
 * </div>
 * ```
 *
 * @example
 * # Sizes
 *
 * The size ladder: `default` (36px) and `compact` (28px), plus square
 * icon-only steps. Icon-only buttons take the icon as their child and need
 * an `aria-label`.
 *
 * ```tsx
 * <div className="flex flex-col gap-3">
 *   <div className="flex flex-wrap items-center gap-2">
 *     <Button leadingIcon={Plus}>Default</Button>
 *     <Button variant="secondary" size="icon" aria-label="Add">
 *       <Plus />
 *     </Button>
 *     <Button variant="ghost" size="icon" aria-label="Settings">
 *       <Settings />
 *     </Button>
 *   </div>
 *   <div className="flex flex-wrap items-center gap-2">
 *     <Button size="compact" leadingIcon={Plus}>Compact</Button>
 *     <Button variant="secondary" size="icon-compact" aria-label="Add">
 *       <Plus />
 *     </Button>
 *     <Button variant="ghost" size="icon-compact" aria-label="Settings">
 *       <Settings />
 *     </Button>
 *   </div>
 * </div>
 * ```
 *
 * @example
 * # Active
 *
 * `active` forces the pressed visual — for a button whose dropdown or
 * popover is currently open.
 *
 * ```tsx
 * <div className="flex flex-wrap items-center gap-2">
 *   <Button active>Primary</Button>
 *   <Button variant="secondary" active>Secondary</Button>
 *   <Button variant="tertiary" active trailingIcon={ChevronDown}>Tertiary</Button>
 *   <Button variant="ghost" active>Ghost</Button>
 * </div>
 * ```
 *
 * @example
 * # As child
 *
 * `asChild` merges the button's styling onto its single child element —
 * here a link — instead of rendering a `<button>`.
 *
 * ```tsx
 * <Button asChild variant="tertiary" trailingIcon={ArrowRight}>
 *   <a href="https://www.fluidfunctionalism.com" target="_blank" rel="noreferrer">
 *     Fluid Functionalism
 *   </a>
 * </Button>
 * ```
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
    ref
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
            children?: ReactNode;
            className?: string;
            style?: React.CSSProperties;
            ref?: React.Ref<HTMLButtonElement>;
          }>)
        : null;
    const label = asChildElement ? asChildElement.props.children : children;
    // Resolve the size: explicit prop (legacy aliases mapped onto the
    // canonical ladder) > surrounding SizeProvider > default.
    const contextSize = useSizeVariant();
    const resolvedSize: ButtonSizeCanonical = size
      ? legacySizeAliases[size] ?? (size as ButtonSizeCanonical)
      : contextSize === "compact"
        ? "compact"
        : "default";
    const isIconOnly = resolvedSize === "icon" || resolvedSize === "icon-compact";
    const isCompact =
      resolvedSize === "compact" || resolvedSize === "icon-compact";
    const iconSize = isCompact ? 14 : 16;
    // Spinner box tracks the button height so the loading glyph stays
    // proportionate across sizes.
    const spinnerSizeClass = isCompact ? "h-7 w-7" : "h-9 w-9";
    const shape = useShape();
    const bgClass = active
      ? activeBgVariants[variant ?? "primary"]
      : bgVariants[variant ?? "primary"];

    const internals = (
      <>
        <span
          aria-hidden
          className={cn(
            "absolute inset-px rounded-[inherit] transition-[box-shadow,background-color] [transition-duration:180ms,80ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease] group-active:[transition-duration:80ms,80ms]",
            bgClass
          )}
        />
        <span className="relative inline-flex items-center justify-center gap-[inherit]">
          {loading ? (
            <>
              <span className="flex items-center justify-center gap-[inherit] opacity-0">
                {LeadingIcon && !isIconOnly && (
                  <LeadingIcon size={iconSize} strokeWidth={2} />
                )}
                {label}
                {TrailingIcon && !isIconOnly && (
                  <TrailingIcon size={iconSize} strokeWidth={2} />
                )}
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                <svg
                  className={spinnerSizeClass}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
                    stroke="currentColor"
                    strokeWidth="1.125"
                    strokeLinecap="round"
                    pathLength="100"
                    style={{
                      strokeDasharray: "15 85",
                      animation: "spinner-move 2s linear infinite, spinner-dash 4s ease-in-out infinite",
                    }}
                  />
                </svg>
              </span>
            </>
          ) : isIconOnly ? (
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
        </span>
      </>
    );

    const rootClassName = cn(
      buttonVariants({
        variant,
        size: resolvedSize,
        iconLeft: !isIconOnly && !!LeadingIcon,
        iconRight: !isIconOnly && !!TrailingIcon,
      }),
      shape.button,
      className
    );

    if (asChildElement) {
      const childProps = asChildElement.props;
      return cloneElement(
        asChildElement,
        {
          ...props,
          ref,
          className: cn(rootClassName, childProps.className),
          style: { ...style, ...childProps.style },
        },
        internals
      );
    }

    return (
      <ButtonPrimitive
        // Base UI's `ButtonPrimitive` forwards to an HTMLButtonElement;
        // keep the public ref type narrow so consumers see the right type.
        ref={ref as React.Ref<HTMLButtonElement>}
        className={rootClassName}
        disabled={disabled || loading}
        style={style}
        {...props}
      >
        {internals}
      </ButtonPrimitive>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps, ButtonSize };

export default Button
