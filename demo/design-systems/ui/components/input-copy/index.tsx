/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-copy.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/{utils,icon-context,font-weight,shape-context,
 *   size-context,springs}` rewritten to `../../fluid/*`; `@/registry/radix/tooltip`
 *   → `../tooltip`.
 * - React 18 types: `useRef<ReturnType<typeof setTimeout>>(null)` →
 *   `useRef<ReturnType<typeof setTimeout> | null>(null)` (React 19 allows the
 *   1-arg null form, React 18's overloads don't).
 * - `InputCopyProps`: member docs replaced by the FF docs API-table text with the
 *   defaults spelled into the prose (modo reads defaults from the description, not
 *   from the destructuring), and `className` re-declared so it is documented.
 * - The tooltip comment's "Radix closes it on pointer down" reads "Base UI" here —
 *   this port's Tooltip is the Base UI flavor; behaviour is the same.
 * - modo item: TSDoc from the FF "InputCopy" docs page. Upstream's exports are kept.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-*`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; literal colors → color tokens;
 *   `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 *   `spring.*`.
 */

import {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  useId,
  type HTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../fluid/utils";
import { useIcon } from "../../fluid/icon-context";
import { useShape } from "../../fluid/shape-context";
import { useSize, type SizeVariant } from "../../fluid/size-context";
import { spring } from "../../fluid/springs";
import { Tooltip } from "../tooltip";

type InputCopyVariant = "icon" | "button";
type InputCopyAlign = "right" | "left";

interface InputCopyProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The text value to display and copy to clipboard. */
  value: string;
  /** Optional label displayed above the input. */
  label?: string;
  /** Callback fired after the value is successfully copied. */
  onCopy?: () => void;
  /** Disables the input and copy button. Defaults to `false`. */
  disabled?: boolean;
  /** Icon-only with tooltip, or button with visible label. Defaults to `"icon"`. */
  variant?: InputCopyVariant;
  /** Position of the copy action relative to the value. Defaults to `"right"`. */
  align?: InputCopyAlign;
  /** Pins the field to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant;
  /** Extra classes for the wrapper around the label and the field. */
  className?: string;
}

/**
 * Read-only input with a copy-to-clipboard button and animated check
 * feedback.
 *
 * The whole row is the button: click anywhere on it and the value goes to
 * the clipboard, the copy glyph springs into a check that draws itself, and
 * the tooltip flips to "Copied" for 2 seconds. The value is monospaced and
 * highlights on hover so it reads as one selectable token rather than a
 * text field, and the async Clipboard API falls back to an off-screen
 * textarea + `execCommand` where it is unavailable (insecure context,
 * permissions policy) — a failure animates a ✕ and says so. `variant`
 * switches between the icon-only affordance (with a tooltip) and a labelled
 * Copy button, `align` moves that action to the leading edge, and the field
 * follows the surrounding SizeProvider unless `size` pins it.
 */
const InputCopy = forwardRef<HTMLDivElement, InputCopyProps>(
  ({ value, label, onCopy, disabled, variant = "icon", align = "right", size, className, ...props }, ref) => {
    const CopyIcon = useIcon("copy");
    // "copied" and "error" both occupy the same animation slot on the button
    const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
    const [copyCount, setCopyCount] = useState(0);
    // "idle" = normal tooltip behavior, "copied" = force open, "suppressed" = force closed
    const [tooltipState, setTooltipState] = useState<"idle" | "copied" | "suppressed">("idle");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tooltipVisibleRef = useRef(false);
    const tooltipWasVisibleRef = useRef(false);
    const shape = useShape();
    const sizeClasses = useSize(size);
    // The row's height comes from the padded children, so the paddings step
    // down with the ladder (py-2 → 36px total, py-1 → 28px).
    const rowPy = sizeClasses.variant === "compact" ? "py-1" : "py-2";

    // Associate the visible label with the button: the button's accessible
    // name reads "Copy <label>" (its own state label + the field label).
    const generatedId = useId();
    const labelId = label ? `${generatedId}-label` : undefined;
    const buttonId = `${generatedId}-button`;

    const handlePointerDown = useCallback(() => {
      // Capture tooltip visibility before Base UI closes it on pointer down
      tooltipWasVisibleRef.current = tooltipVisibleRef.current;
    }, []);

    // execCommand fallback for when the async Clipboard API is unavailable or
    // denied (insecure context, permissions policy) — copies via a temporary
    // off-screen textarea.
    const copyViaExecCommand = useCallback(() => {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(textarea);
      return ok;
    }, [value]);

    const handleCopy = useCallback(async () => {
      if (disabled) return;
      let ok = true;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        ok = copyViaExecCommand();
      }
      setStatus(ok ? "copied" : "error");
      setCopyCount((c) => c + 1);
      setTooltipState(tooltipWasVisibleRef.current ? "copied" : "suppressed");
      if (ok) onCopy?.();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
        setTooltipState("suppressed");
      }, 2000);
    }, [value, disabled, onCopy, copyViaExecCommand]);

    const handleTooltipOpenChange = useCallback((open: boolean) => {
      tooltipVisibleRef.current = open;
    }, []);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const handleMouseEnter = useCallback(() => {
      setTooltipState((prev) => prev === "suppressed" ? "idle" : prev);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setTooltipState((prev) => prev === "copied" ? "suppressed" : prev);
    }, []);

    const iconSwitch = (
      <AnimatePresence mode="wait" initial={false}>
        {status === "error" ? (
          <motion.span
            key={`error-${copyCount}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.fast}
            className="flex items-center justify-center text-destructive [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast group-hover:[&_svg]:stroke-[2]"
          >
            <svg
              width={14}
              height={14}
              viewBox="2 4 20 16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M9 9L15 15M15 9L9 15"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: spring.fast.duration, ease: "easeOut" },
                }}
              />
            </svg>
          </motion.span>
        ) : status === "copied" ? (
          <motion.span
            key={`check-${copyCount}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.fast}
            className="flex items-center justify-center [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast group-hover:[&_svg]:stroke-[2]"
          >
            <svg
              width={14}
              height={14}
              viewBox="2 4 20 16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M6 12L10 16L18 8"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: spring.fast.duration, ease: "easeOut" },
                }}
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.fast}
            className="flex items-center justify-center"
          >
            <CopyIcon size={14} strokeWidth={1.5} className="transition-[stroke-width] duration-fast group-hover:stroke-[2]" />
          </motion.span>
        )}
      </AnimatePresence>
    );

    const actionElement = variant === "button" ? (
      <span
        className={cn(
          "shrink-0 flex items-center gap-1.5 px-1.5 transition-colors duration-fast",
          rowPy,
          sizeClasses.text,
          "text-muted-foreground group-hover:text-foreground",
          "weight-normal",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === "error" ? (
            <motion.span
              key={`error-label-${copyCount}`}
              className="flex items-center gap-1.5 text-destructive"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.fast}
            >
              <span className="flex items-center justify-center">
                <svg
                  width={14}
                  height={14}
                  viewBox="2 4 20 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M9 9L15 15M15 9L9 15"
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: 1,
                      transition: { duration: spring.fast.duration, ease: "easeOut" },
                    }}
                  />
                </svg>
              </span>
              <span className="select-none inline-grid text-left">
                <span className="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
                <span className="col-start-1 row-start-1">Failed</span>
              </span>
            </motion.span>
          ) : status === "copied" ? (
            <motion.span
              key={`check-label-${copyCount}`}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.fast}
            >
              <span className="flex items-center justify-center">
                <svg
                  width={14}
                  height={14}
                  viewBox="2 4 20 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M6 12L10 16L18 8"
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: 1,
                      transition: { duration: spring.fast.duration, ease: "easeOut" },
                    }}
                  />
                </svg>
              </span>
              <span className="select-none inline-grid text-left">
                <span className="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
                <span className="col-start-1 row-start-1">Copied</span>
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="copy-label"
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.fast}
            >
              <span className="flex items-center justify-center">
                <CopyIcon size={14} strokeWidth={1.5} className="transition-[stroke-width] duration-fast group-hover:stroke-[2]" />
              </span>
              <span className="select-none inline-grid text-left">
                <span className="col-start-1 row-start-1 invisible" aria-hidden="true">Copied</span>
                <span className="col-start-1 row-start-1">Copy</span>
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    ) : (
      <span
        className={cn(
          "shrink-0 px-1.5 transition-colors duration-fast",
          rowPy,
          "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {iconSwitch}
      </span>
    );

    const valueElement = (
      <span
        className={cn(
          "flex-1 min-w-0 text-left text-foreground font-mono select-none truncate",
          sizeClasses.text,
          rowPy,
          align === "left" ? "pl-1" : "pl-0",
          "weight-normal"
        )}
      >
        <mark className="bg-transparent text-foreground transition-colors duration-fast group-hover:bg-brand/20 group-hover:text-foreground">
          {value}
        </mark>
      </span>
    );

    const buttonContent = align === "left" ? (
      <>{actionElement}{valueElement}</>
    ) : (
      <>{valueElement}{actionElement}</>
    );

    const button = (
      <button
        id={buttonId}
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleCopy}
        disabled={disabled}
        aria-label={
          status === "copied"
            ? "Copied"
            : status === "error"
              ? "Copy failed"
              : label
                ? "Copy"
                : "Copy to clipboard"
        }
        aria-labelledby={label ? `${buttonId} ${labelId}` : undefined}
        className={cn(
          "group flex items-center w-full cursor-pointer outline-none transition-all duration-fast",
          "focus-visible:ring-1 focus-visible:ring-focus-ring",
          shape.input
        )}
      >
        {buttonContent}
      </button>
    );

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-0.5",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {label && (
          <span
            id={labelId}
            className={cn(
              "text-muted-foreground",
              sizeClasses.text,
              align === "left" ? "pl-1" : "pl-0",
              "weight-normal"
            )}
          >
            {label}
          </span>
        )}
        {variant === "icon" ? (
          <Tooltip content={tooltipState === "idle" ? "Copy to clipboard" : status === "error" ? "Copy failed" : "Copied"} delayDuration={500} sideOffset={2} forceOpen={tooltipState === "copied" ? true : tooltipState === "suppressed" ? false : undefined} onOpenChange={handleTooltipOpenChange}>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </div>
    );
  }
);

InputCopy.displayName = "InputCopy";

export { InputCopy };
export type { InputCopyProps, InputCopyVariant, InputCopyAlign };
export default InputCopy;
