/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/thinking-indicator.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*` →
 *   relative `_fluid` paths.
 * - Prop JSDoc kept from upstream (it matches the FF docs API table);
 *   modo TSDoc and examples on `ThinkingIndicator`.
 * The `.shimmer-text` rule the label rides lives in global.css.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`;
 *   `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 *   `spring.*`.
 */

import { forwardRef, useState, useEffect, type HTMLAttributes } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "../../_fluid/lib/utils";
import { spring } from "../../_fluid/lib/springs";
import { useSize, type SizeVariant } from "../../_fluid/lib/size-context";

const circleA =
  "M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z";

const infinity =
  "M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z";

const circleB =
  "M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z";

const words = ["Thinking", "Moonwalking", "Planning", "Refining"];

interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the morphing circle⇄infinity glyph before the label. Set to `false` for a text-only indicator (e.g. inline before a streamed reply). Defaults to `true`. */
  showIcon?: boolean;
  /** Step on the size ladder. Wins over the surrounding SizeProvider. Defaults to the provider's step, else `"default"`. */
  size?: SizeVariant;
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
 * @example # Basic
 * ```tsx
 * <ThinkingIndicator />
 * ```
 *
 * @example # Text only
 * Drop the glyph for an inline indicator, e.g. before a streamed reply.
 *
 * ```tsx
 * <ThinkingIndicator showIcon={false} />
 * ```
 *
 * @example # Compact
 * The compact step of the size ladder, for dense transcripts.
 *
 * ```tsx
 * <ThinkingIndicator size="compact" />
 * ```
 */
const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
  ({ className, showIcon = true, size, ...props }, ref) => {
  const compactStep = useSize(size).variant === "compact";
  const [index, setIndex] = useState(0);
  // Reduced motion drops the infinite glyph morph and the word cycling — a
  // static glyph and label carry the same meaning without the movement.
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div
      ref={ref}
      role="status"
      className={cn("flex items-center gap-2 px-3 py-2", className)}
      {...props}
    >
      {/* Static announcement — the cycling word display below is aria-hidden
          so screen readers hear one "Thinking…" instead of a re-announcement
          every 4 seconds. */}
      <span className="sr-only">Thinking…</span>
      {showIcon && (
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
                  ease: "easeInOut",
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
          "inline-grid overflow-hidden",
          compactStep ? "text-body-compact" : "text-body",
          "weight-medium"
        )}
      >
        <span className="col-start-1 row-start-1 invisible shimmer-text">
          {words.reduce((a, b) => (a.length >= b.length ? a : b))}
        </span>
        {reduceMotion ? (
          <span className="col-start-1 row-start-1 shimmer-text">
            {words[0]}
          </span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={words[index]}
              className="col-start-1 row-start-1 shimmer-text"
              initial={{ y: "80%", opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: spring.slow.duration, ease: [0.4, 0, 0.2, 1] } }}
              exit={{ y: "-80%", opacity: 0, transition: { duration: spring.slow.exit.duration, ease: [0.4, 0, 0.2, 1] } }}
            >
              {words[index]}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
    </div>
  );
});

ThinkingIndicator.displayName = "ThinkingIndicator";

export { ThinkingIndicator };
export type { ThinkingIndicatorProps };
export default ThinkingIndicator;
