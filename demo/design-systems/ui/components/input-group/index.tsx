/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `"use client"` dropped; `@/lib/*` and `@/hooks/*` imports
 * rewritten to `../../lib/{lib,hooks}/*`; uncontrolled mode added —
 * `InputField` `value` and `onChange` are optional, with a `defaultValue`
 * twin (`InputHTMLAttributes`' own `defaultValue` omitted in its favour)
 * backed by `useControllableState`; modo docs — TSDoc with FF's docs/API
 * text, `InputGroup.Field` static (typed via a cast on the root), default
 * export.
 * Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 * `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`;
 * `duration-80|120|160` and tier-length JS durations → `duration-<tier>` /
 * `spring.*`.
 */

import {
  useRef,
  useState,
  useMemo,
  createContext,
  useContext,
  forwardRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type RefAttributes,
} from "react";
import { Field } from "@base-ui/react/field";
import type { IconComponent } from "../../lib/icon-context";
import { cn } from "../../lib/utils";
import { useShape } from "../../lib/shape-context";
import { SizeProvider, useSize, type SizeVariant } from "../../lib/size-context";
import { useFluidHover, useRegisterFluidHoverItem } from "../../lib/use-fluid-hover";
import { useControllableState } from "../../lib/use-controllable-state";

interface InputGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
}

const InputGroupContext = createContext<InputGroupContextValue | null>(null);

function useInputGroup() {
  const ctx = useContext(InputGroupContext);
  if (!ctx)
    throw new Error("useInputGroup must be used within an InputGroup");
  return ctx;
}

interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** One or more InputGroup.Field children. */
  children: ReactNode;
  /** Pins the group's fields to one step of the size ladder (default 36px, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant;
}

type InputGroupComponent = ForwardRefExoticComponent<
  InputGroupProps & RefAttributes<HTMLDivElement>
> & { Field: typeof InputField };

/**
 * Input field group with fluid hover and validation.
 *
 * `InputGroup` stacks labelled fields and tracks the pointer across them: the
 * field under the cursor lifts onto a muted ground with a hairline ring, the
 * focused one onto the card ground, and its leading icon thickens. Each field
 * is a Base UI `Field`, so the label, control and error message are wired for
 * assistive tech, and an `error` turns the field destructive. Fields are
 * uncontrolled with `defaultValue`, or controlled with `value` + `onChange`.
 *
 * Statics:
 * - `InputGroup.Field` — one labelled input: `index`, `label`, `labelHidden`,
 *   `placeholder`, `icon`, `value` / `defaultValue`, `onChange`, `error`,
 *   `disabled`.
 *
 * @example {@include ./examples.mdx}
 */
const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, size, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const { activeIndex, handlers, registerItem } =
      useFluidHover(containerRef);

    const contextValue = useMemo(
      () => ({ registerItem, activeIndex }),
      [registerItem, activeIndex]
    );

    const group = (
      <InputGroupContext.Provider value={contextValue}>
        <div
          ref={(node) => {
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          onMouseEnter={handlers.onMouseEnter}
          onMouseMove={handlers.onMouseMove}
          onMouseLeave={handlers.onMouseLeave}
          // `relative` makes this div the fields' offsetParent — the fluid hover
          // hook measures items via offsetTop and compares against
          // container-relative mouse coords, so the two coordinate spaces must
          // share this origin (same as every other fluid hover consumer).
          className={cn("relative flex flex-col gap-3 w-72 max-w-full", className)}
          {...props}
        >
          {children}
        </div>
      </InputGroupContext.Provider>
    );

    // A size prop pins every field in the group to one ladder step.
    return size ? <SizeProvider size={size}>{group}</SizeProvider> : group;
  }
) as InputGroupComponent;

InputGroup.displayName = "InputGroup";

interface InputFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "index" | "value" | "defaultValue"> {
  /** Label text above the input. */
  label: string;
  /** Keep the label for assistive tech but don't render it — for inline fields (a toolbar search) where the placeholder carries the meaning. Defaults to `false`. */
  labelHidden?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Leading icon inside the input. */
  icon?: IconComponent;
  /** Position index within the group (required for fluid hover). */
  index: number;
  /** Controlled input value. */
  value?: string;
  /** Initial value when uncontrolled. Defaults to `''`. */
  defaultValue?: string;
  /** Called when the input value changes. */
  onChange?: (value: string) => void;
  /** Error message shown below the input. */
  error?: string;
  /** Disables the input. Defaults to `false`. */
  disabled?: boolean;
  className?: string;
}

const InputField = forwardRef<HTMLDivElement, InputFieldProps>(
  (
    {
      label,
      labelHidden,
      placeholder,
      icon: Icon,
      index,
      value: valueProp,
      defaultValue = '',
      onChange: onChangeProp,
      error,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    // Local: controlled `value`, or internal state seeded from `defaultValue`.
    const [value, onChange] = useControllableState(valueProp, defaultValue, onChangeProp)

    const internalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLElement | null>(null);
    const { registerItem, activeIndex } = useInputGroup();
    const [isFocused, setIsFocused] = useState(false);
    const shape = useShape();
    const sizeClasses = useSize();
    const compact = sizeClasses.variant === "compact";

    useRegisterFluidHoverItem(registerItem, index, internalRef);

    const isActive = activeIndex === index;
    const labelActive = isActive || isFocused;

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    // Input container classes
    let bgClass: string;
    let ringClass: string;

    if (disabled) {
      bgClass = "bg-transparent";
      ringClass = "ring-border";
    } else if (error) {
      bgClass = isFocused ? "bg-card" : isActive ? "bg-destructive-light/60" : "bg-transparent";
      ringClass = isFocused || isActive ? "ring-destructive/50" : "ring-transparent";
    } else if (isFocused) {
      bgClass = "bg-card";
      ringClass = "ring-border";
    } else if (isActive) {
      bgClass = "bg-muted/50";
      ringClass = "ring-border";
    } else {
      bgClass = "bg-transparent";
      ringClass = "ring-transparent";
    }

    return (
      // Base UI Field wires the accessibility plumbing: Field.Label's htmlFor
      // targets the control, Field.Error's generated id lands in the control's
      // aria-describedby, and `invalid` drives aria-invalid / data-invalid.
      <Field.Root
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        invalid={!!error}
        disabled={disabled}
        className={cn(
          "flex flex-col gap-1 cursor-text",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        {/* Label — sr-only when hidden so the field keeps its accessible
            name and the htmlFor wiring. */}
        <Field.Label
          className={cn(
            labelHidden ? "sr-only" : "inline-grid",
            sizeClasses.text,
            // One notch tighter than the ladder's control padding — the field
            // ring is invisible at rest, so the roomier inset reads as a gap.
            !labelHidden && (compact ? "pl-2" : "pl-2.5")
          )}
        >
          <span
            className="col-start-1 row-start-1 invisible weight-semibold"
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1",
              error ? "text-destructive" : "text-muted-foreground",
              "weight-normal"
            )}
          >
            {label}
          </span>
        </Field.Label>

        {/* Input container */}
        <div
          onMouseDown={(e) => {
            // The old wrapper was one big <label>, so a click anywhere (icon,
            // padding) focused the input. Keep that, without disturbing the
            // input's own caret placement.
            if (e.target === inputRef.current) return;
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className={cn(
            // Fixed height (was py-2 around the line box) so the field sits
            // exactly on the ladder's control height.
            `flex items-center ${sizeClasses.gap} ${shape.input} ${
              compact ? "px-2" : "px-2.5"
            } ${sizeClasses.control} ring-1 transition-all duration-fast`,
            bgClass,
            ringClass
          )}
        >
          {Icon && (
            <Icon
              size={sizeClasses.icon}
              strokeWidth={labelActive ? 2 : 1.5}
              className={cn(
                "shrink-0 transition-[color,stroke-width] duration-fast",
                labelActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            />
          )}
          <Field.Control
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              "w-full rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]",
              sizeClasses.text,
              "weight-normal"
            )}
            {...props}
          />
        </div>

        {/* Error message — `match` pins it visible while our controlled
            `error` prop is standing. */}
        {error && (
          <Field.Error
            match
            className={cn(
              "text-destructive",
              compact ? "text-caption-compact pl-2" : "text-caption pl-2.5",
              "weight-medium"
            )}
          >
            {error}
          </Field.Error>
        )}
      </Field.Root>
    );
  }
);

InputField.displayName = "InputField";

Object.assign(InputGroup, { Field: InputField })

export { InputGroup, InputField };
export type { InputGroupProps, InputFieldProps };
export default InputGroup
