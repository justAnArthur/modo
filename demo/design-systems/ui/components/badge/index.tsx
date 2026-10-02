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
 *   `text-<role>[-compact]`; literal colors → color tokens.
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { useShape } from "../../lib/shape-context";
import { useSizeVariant } from "../../lib/size-context";

const badgeColors = {
  gray: "var(--badge-gray)",
  red: "var(--badge-red)",
  orange: "var(--badge-orange)",
  amber: "var(--badge-amber)",
  yellow: "var(--badge-yellow)",
  lime: "var(--badge-lime)",
  green: "var(--badge-green)",
  emerald: "var(--badge-emerald)",
  teal: "var(--badge-teal)",
  cyan: "var(--badge-cyan)",
  blue: "var(--badge-blue)",
  indigo: "var(--badge-indigo)",
  violet: "var(--badge-violet)",
  purple: "var(--badge-purple)",
  fuchsia: "var(--badge-fuchsia)",
  pink: "var(--badge-pink)",
  rose: "var(--badge-rose)",
} as const;

type BadgeColor = keyof typeof badgeColors;

const badgeVariants = cva(
  "inline-flex items-center font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        solid: "",
        dot: "border border-border text-foreground",
      },
      // The two-step size ladder shared by every control — see /docs/sizes.
      size: {
        default: "h-6 px-2.5 text-caption gap-1.5",
        compact: "h-5 px-2 text-caption-compact gap-1",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "default",
    },
  }
);

type BadgeSizeCanonical = "default" | "compact";

/** Public size values: the canonical two-size scale plus the pre-sizes-system
 *  aliases, kept so existing call sites keep compiling. Aliases resolve onto
 *  the canonical ladder (sm → compact; md/lg → default). */
type BadgeSize = BadgeSizeCanonical | "sm" | "md" | "lg";

const legacySizeAliases: Partial<Record<BadgeSize, BadgeSizeCanonical>> = {
  sm: "compact",
  md: "default",
  lg: "default",
};

interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "color">,
    Omit<VariantProps<typeof badgeVariants>, "size"> {
  /** Visual style. Solid uses a tinted background; dot shows a colored indicator. Defaults to `"solid"`. */
  variant?: "solid" | "dot";
  /** Step on the size ladder (see Sizes). Legacy sm/md/lg values resolve as aliases (sm → compact; md/lg → default). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: BadgeSize;
  /** Color from the Tailwind palette: gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose. Defaults to `"gray"`. */
  color?: BadgeColor;
}

/**
 * Compact label for status, category, or metadata. Supports solid and dot
 * variants with Tailwind colors.
 *
 * Solid badges tint their background with the chosen color mixed into the
 * page background (gray uses the accent token); dot badges keep a neutral
 * border and show the color as a small indicator. The badge rides the size
 * ladder — `size` pins it, otherwise it follows the surrounding SizeProvider
 * — and takes its corner radius from the shape context. The palette is also
 * exported as `badgeColors`, the class recipe as `badgeVariants`.
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "solid",
      size: sizeProp,
      color = "gray",
      children,
      style,
      ...props
    },
    ref
  ) => {
    const shape = useShape();
    // Resolve the size: explicit prop (legacy aliases mapped onto the
    // canonical ladder) > surrounding SizeProvider > default.
    const contextSize = useSizeVariant();
    const size: BadgeSizeCanonical = sizeProp
      ? legacySizeAliases[sizeProp] ?? (sizeProp as BadgeSizeCanonical)
      : contextSize === "compact"
        ? "compact"
        : "default";
    const colorValue = badgeColors[color];
    const isSolid = variant === "solid";
    const dotSize = size === "compact" ? 6 : 7;

    const colorStyle = isSolid
      ? color === "gray"
        ? { backgroundColor: "var(--accent)", color: "var(--foreground)" }
        : {
            color: "var(--foreground)",
            backgroundColor: `color-mix(in srgb, ${colorValue} 15%, var(--background))`,
          }
      : {};

    const dotColor = color === "gray" ? "var(--muted-foreground)" : colorValue;

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), shape.item, className)}
        style={{ ...colorStyle, ...style }}
        {...props}
      >
        {!isSolid && (
          <span
            className="shrink-0 rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: dotColor,
            }}
          />
        )}
        {/* text-box needs a block container — the badge root is a flex
            container, so the label gets its own span. Height is fixed (h-*),
            so trimming only recenters the letterforms. */}
        <span className="[text-box:trim-both_cap_alphabetic]">{children}</span>
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants, badgeColors };
export type { BadgeProps, BadgeColor, BadgeSize };

export default Badge
