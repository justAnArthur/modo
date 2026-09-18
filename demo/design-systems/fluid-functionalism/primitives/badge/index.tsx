/*
 * Vendored from the Fluid Functionalism registry (@fluid namespace,
 * fluidfunctionalism.com — MIT License © 2026 Micka Touillaud), pulled with
 * `bunx shadcn@latest add @fluid/badge` (shadcn CLI 4.21.0) into a scratch
 * scaffold. Local modifications: `@/…` imports rewritten to relative paths for the modo layout; `framer-motion` imports rewritten to `motion/react`; `"use client"` directives dropped (non-RSC). modo item docs: TSDoc on the component, default export (file renamed to index.tsx; the former adapter is gone).
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../_fluid/utils";
import { useShape } from "../../_fluid/shape-context";
import { useSizeVariant } from "../../_fluid/size-context";

const badgeColors = {
  gray: "#a3a3a3",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
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
        default: "h-6 px-2.5 text-[12px] gap-1.5",
        compact: "h-5 px-2 text-[11px] gap-1",
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
  color?: BadgeColor;
  /** Omitted, the badge follows the surrounding SizeProvider. Legacy
   *  sm/md/lg values still resolve. */
  size?: BadgeSize;
}

/**
 * Fluid Functionalism Badge — compact status label. The solid variant tints
 * the surface with a color-mix of the chosen color; the dot variant renders
 * an outlined pill with a leading color dot.
 * Pulled via `bunx shadcn@latest add @fluid/badge`.
 *
 * @example # Solid colors
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
 *   <Badge>Gray</Badge>
 *   <Badge color="blue">Blue</Badge>
 *   <Badge color="green">Green</Badge>
 *   <Badge color="amber">Amber</Badge>
 *   <Badge color="red">Red</Badge>
 *   <Badge color="violet">Violet</Badge>
 * </div>
 * ```
 *
 * @example # Dot variant
 * An outlined pill with a leading color dot — for ambient statuses.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Badge variant="dot">Idle</Badge>
 *   <Badge variant="dot" color="green">Active</Badge>
 *   <Badge variant="dot" color="amber">Degraded</Badge>
 * </div>
 * ```
 *
 * @example # Compact size
 * The 20px compact step for dense surfaces like tables and sidebars.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Badge size="compact">Default 24px</Badge>
 *   <Badge size="compact" color="teal">Compact 20px</Badge>
 * </div>
 * ```
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
export default Badge;
