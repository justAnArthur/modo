/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/accordion.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*`,
 *   `@/hooks/*` and `@/components/ui/fluid-hover-highlight` → relative
 *   `_fluid` paths.
 * - Open state (Accordion and AccordionGroup) runs through
 *   `useControllableState`, the Base UI contract: `value` controls, otherwise
 *   the accordion keeps its own state from `defaultValue` and still reports
 *   every change to `onValueChange`. Upstream treated `onValueChange` alone
 *   as controlled, so an uncontrolled accordion with a listener never opened.
 * - Standalone `Accordion` accepts `highlight` (the FF API table lists it on
 *   the root) and hands it to its items through context as their default;
 *   `AccordionItem`'s own `highlight` still wins.
 * - Prop JSDoc rewritten from the FF docs API tables; modo TSDoc and
 *   examples on `Accordion`.
 * - Compound statics `Accordion.Group/.Item/.Trigger/.Content` attached with
 *   `Object.assign`, typed through an `AccordionComponent` cast on the
 *   forwardRef. Upstream's named exports are kept.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-*`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; `duration-80|120|160` and
 *   tier-length JS durations → `duration-<tier>` / `spring.*`.
 */

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

// SSR-safe layout effect (client components still server-render in Next).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { cn } from "../../lib/utils";
import { useIcon } from "../../lib/icon-context";
import { spring } from "../../lib/springs";
import { useFluidHover, useRegisterFluidHoverItem } from "../../lib/use-fluid-hover";
import { useControllableState } from "../../lib/use-controllable-state";
import { useShape } from "../../lib/shape-context";
import { SizeProvider, useSize, type SizeVariant } from "../../lib/size-context";
import { FluidHoverHighlight } from "../../lib/fluid-hover-highlight";

// ─── Contexts ────────────────────────────────────────────────────────────────

interface ItemRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface AccordionGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  registerFullItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
  grouped: true;
  remeasure: () => void;
  openValues: Set<string>;
  openItemRects: Map<number, ItemRect>;
}

const AccordionGroupContext =
  createContext<AccordionGroupContextValue | null>(null);

function useAccordionGroup() {
  return useContext(AccordionGroupContext);
}

interface AccordionItemContextValue {
  index?: number;
  value: string;
  isOpen: boolean;
  triggerRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Standalone items carry the group's choice themselves. */
  highlight: "trigger" | "item";
}

const AccordionItemContext =
  createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext() {
  const ctx = useContext(AccordionItemContext);
  if (!ctx)
    throw new Error(
      "AccordionTrigger/AccordionContent must be used within an AccordionItem"
    );
  return ctx;
}

// ─── AccordionGroup ──────────────────────────────────────────────────────────

type AccordionGroupSingleProps = {
  /** Whether one or multiple items can be expanded. Defaults to `"single"`. */
  type?: "single";
  /** Controlled expanded value. */
  value?: string;
  /** Initially expanded item value — uncontrolled. */
  defaultValue?: string;
  /** Callback when expanded state changes. */
  onValueChange?: (value: string) => void;
  /** Allow collapsing all items when type is single. Defaults to `true`. */
  collapsible?: boolean;
};

type AccordionGroupMultipleProps = {
  /** Whether one or multiple items can be expanded. */
  type: "multiple";
  /** Controlled expanded values. */
  value?: string[];
  /** Initially expanded item values — uncontrolled. */
  defaultValue?: string[];
  /** Callback when expanded state changes. */
  onValueChange?: (value: string[]) => void;
};

type AccordionGroupProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Pins the group's rows to one step of the size ladder (default 36px,
   *  compact 28px — see /docs/sizes). Omitted, they follow the surrounding
   *  SizeProvider. */
  size?: SizeVariant;
  /** What an open item tints. "item" paints the row and its panel as one
   *  block, and holds while it stays open. "trigger" scopes the fill to the
   *  row and shows it on hover only, leaving the panel on the page's own
   *  surface — the way a sidebar row highlights without colouring its
   *  sub-tree. @default "item" */
  highlight?: "trigger" | "item";
} & (AccordionGroupSingleProps | AccordionGroupMultipleProps);

const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProps>(
  (props, ref) => {
    const {
      children,
      highlight = "item",
      type = "single",
      size,
      className,
      ...rest
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const fullItemElementsRef = useRef<Map<number, HTMLElement>>(new Map());
    const [openItemRects, setOpenItemRects] = useState<Map<number, ItemRect>>(
      new Map()
    );
    const openItemRectsRef = useRef(openItemRects);

    const hover = useFluidHover(containerRef);
    const {
      activeIndex,
      setActiveIndex,
      itemRects,
      handlers,
      registerItem,
      measureItems,
    } = hover;

    const registerFullItem = useCallback(
      (index: number, element: HTMLElement | null) => {
        if (element) {
          fullItemElementsRef.current.set(index, element);
        } else {
          fullItemElementsRef.current.delete(index);
        }
      },
      []
    );

    const measureFullItems = useCallback(() => {
      if (!containerRef.current) return;
      const next = new Map<number, ItemRect>();
      fullItemElementsRef.current.forEach((el, idx) => {
        next.set(idx, {
          top: el.offsetTop,
          left: el.offsetLeft,
          width: el.offsetWidth,
          height: el.offsetHeight,
        });
      });
      // Skip the state update when nothing moved (mirrors the fluid hover
      // hook's measureItems guard) — this runs per animation frame via
      // onUpdate, and an unconditional set would invalidate the group
      // context and re-render every item even on no-op remeasures.
      const prev = openItemRectsRef.current;
      let changed = prev.size !== next.size;
      if (!changed) {
        for (const [idx, r] of next) {
          const p = prev.get(idx);
          if (
            !p ||
            p.top !== r.top ||
            p.left !== r.left ||
            p.width !== r.width ||
            p.height !== r.height
          ) {
            changed = true;
            break;
          }
        }
      }
      if (!changed) return;
      openItemRectsRef.current = next;
      setOpenItemRects(next);
    }, []);

    // Local: controlled while `value` is set, else own state seeded from
    // `defaultValue` — `onValueChange` reports either way (Base UI contract).
    const sp = props as AccordionGroupSingleProps;
    const mp = props as AccordionGroupMultipleProps;
    const [singleValue, setSingleValue] = useControllableState<string>(
      type === "single" ? sp.value : undefined,
      type === "single" ? sp.defaultValue ?? "" : "",
      type === "single" ? sp.onValueChange : undefined
    );
    const [multipleValue, setMultipleValue] = useControllableState<string[]>(
      type === "multiple" ? mp.value : undefined,
      type === "multiple" ? mp.defaultValue ?? [] : [],
      type === "multiple" ? mp.onValueChange : undefined
    );

    const openValuesList: string[] =
      type === "multiple"
        ? multipleValue
        : singleValue
          ? [singleValue]
          : [];

    // Keyed on the joined values so the Set (and the group context value
    // below) keeps a stable identity across re-renders where the open values
    // haven't actually changed.
    const openValuesKey = openValuesList.join(",");

    const openValues = useMemo(
      () => new Set(openValuesList),
      // Deliberately keyed on the joined string, not the (fresh) array.
      [openValuesKey]
    );

    const handleSingleValueChange = setSingleValue;
    const handleMultipleValueChange = setMultipleValue;

    useEffect(() => {
      measureItems();
      measureFullItems();
    }, [measureItems, measureFullItems, children]);

    useEffect(() => {
      measureItems();
      measureFullItems();
    }, [measureItems, measureFullItems, openValuesKey]);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
    // An open item tints its trigger by default; "item" restores the older
    // block treatment that spans the panel too. The trigger rects are the
    // ones fluid hover already tracks, so this is a choice of source.
    // "trigger" tints the open row only while you're on it: the panel below
    // already says the item is open, so the fill goes back to being a hover
    // affordance rather than a persistent state.
    const expandedRects =
      highlight === "item"
        ? openItemRects
        : new Map(
            [...openItemRects.keys()].flatMap((idx) => {
              const rect = idx === activeIndex ? itemRects[idx] : null;
              return rect ? ([[idx, rect]] as [number, ItemRect][]) : [];
            })
          );

    const isHoveringNonOpen =
      activeIndex !== null && !openItemRects.has(activeIndex);
    const shape = useShape();

    const {
      value: _value,
      defaultValue: _defaultValue,
      onValueChange: _onValueChange,
      collapsible: _collapsible,
      type: _type,
      ...htmlProps
    } = rest as Record<string, unknown>;

    // Translate FF API → Base UI Accordion API.
    // Base UI always uses `value: string[]` and a `multiple: boolean`. In
    // single mode we wrap the active value in a single-element array.
    const baseValue: string[] = openValuesList;

    const baseOnValueChange = (next: string[]) => {
      if (type === "multiple") handleMultipleValueChange(next);
      else handleSingleValueChange(next[0] ?? "");
    };

    const remeasure = useCallback(() => {
      measureItems();
      measureFullItems();
    }, [measureItems, measureFullItems]);

    // Memoized: the group re-renders on every fluid-hover mousemove; a
    // fresh context object each time would re-render every item with it.
    const groupContextValue = useMemo<AccordionGroupContextValue>(
      () => ({
        registerItem,
        registerFullItem,
        activeIndex,
        grouped: true,
        remeasure,
        openValues,
        openItemRects,
      }),
      [
        registerItem,
        registerFullItem,
        activeIndex,
        remeasure,
        openValues,
        openItemRects,
      ]
    );

    const group = (
      <AccordionGroupContext.Provider value={groupContextValue}>
        <AccordionPrimitive.Root
          value={baseValue}
          onValueChange={baseOnValueChange}
          multiple={type === "multiple"}
          render={(rootProps) => {
            const {
              style: _baseStyle,
              onDrag: _onDrag,
              onDragStart: _onDragStart,
              onDragEnd: _onDragEnd,
              onAnimationStart: _onAnimationStart,
              onAnimationEnd: _onAnimationEnd,
              onAnimationIteration: _onAnimationIteration,
              ...restRoot
            } = rootProps as React.HTMLAttributes<HTMLDivElement>;
            return (
              <div
                {...restRoot}
                ref={(node) => {
                  (
                    containerRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = node;
                  if (typeof ref === "function") ref(node);
                  else if (ref)
                    (
                      ref as React.MutableRefObject<HTMLDivElement | null>
                    ).current = node;
                }}
                onMouseEnter={handlers.onMouseEnter}
                onMouseMove={(e) => {
                  const container = containerRef.current;
                  if (container) {
                    const cRect = container.getBoundingClientRect();
                    const layoutH = container.offsetHeight;
                    const visualH = cRect.height;
                    const scale = layoutH > 0 ? visualH / layoutH : 1;
                    const localY =
                      (e.clientY - cRect.top) / scale + container.scrollTop;
                    for (const [idx, full] of openItemRects) {
                      const trigger = itemRects[idx];
                      if (!trigger) continue;
                      const contentTop = trigger.top + trigger.height;
                      const contentBottom = full.top + full.height;
                      if (localY >= contentTop && localY <= contentBottom) {
                        setActiveIndex(null);
                        return;
                      }
                    }
                  }
                  handlers.onMouseMove(e);
                }}
                onMouseLeave={handlers.onMouseLeave}
                onFocus={(e) => {
                  const indexAttr = (e.target as HTMLElement)
                    .closest("[data-fluid-hover-index]")
                    ?.getAttribute("data-fluid-hover-index");
                  if (indexAttr != null) {
                    const idx = Number(indexAttr);
                    setActiveIndex(idx);
                    setFocusedIndex(
                      (e.target as HTMLElement).matches(":focus-visible")
                        ? idx
                        : null
                    );
                  }
                }}
                onBlur={(e) => {
                  if (
                    containerRef.current?.contains(e.relatedTarget as Node)
                  )
                    return;
                  setFocusedIndex(null);
                  setActiveIndex(null);
                }}
                className={cn(
                  "relative flex flex-col w-72 max-w-full",
                  className
                )}
                {...(htmlProps as HTMLAttributes<HTMLDivElement>)}
              >
                {/* Expanded item backgrounds */}
                <AnimatePresence>
                  {[...expandedRects.entries()].map(([idx, rect]) => (
                    <motion.div
                      key={`expanded-${idx}`}
                      className={`absolute ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
                      // Fade in from the item's current rect: with initial={false}
                      // a newly-opened item's background would pop in at full
                      // opacity mid-layout-shift while the previous item's bg is
                      // still fading out — reads as a glitch when switching items
                      // (especially under /demo's scaled card). Geometry still
                      // snaps (duration 0) so the bg hugs the animating item.
                      initial={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        opacity: 0,
                      }}
                      animate={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        opacity: isHoveringNonOpen ? 0.7 : 1,
                      }}
                      exit={{ opacity: 0, transition: spring.moderate.exit }}
                      transition={{
                        top: { duration: 0 },
                        left: { duration: 0 },
                        width: { duration: 0 },
                        height: { duration: 0 },
                        opacity: { duration: spring.moderate.exit.duration },
                      }}
                    />
                  ))}
                </AnimatePresence>

                {/* Hover background */}
                <FluidHoverHighlight
                  hover={hover}
                  className={shape.bg}
                />

                {/* Focus ring */}
                <AnimatePresence>
                  {focusRect && (
                    <motion.div
                      className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-focus-ring`}
                      initial={false}
                      animate={{
                        left: focusRect.left - 2,
                        top: focusRect.top - 2,
                        width: focusRect.width + 4,
                        height: focusRect.height + 4,
                      }}
                      exit={{ opacity: 0, transition: spring.fast.exit }}
                      transition={{
                        ...spring.fast,
                        opacity: { duration: spring.fast.duration },
                      }}
                    />
                  )}
                </AnimatePresence>

                {children}
              </div>
            );
          }}
        />
      </AccordionGroupContext.Provider>
    );

    // A size prop pins every row in the group to one ladder step.
    return size ? <SizeProvider size={size}>{group}</SizeProvider> : group;
  }
);

AccordionGroup.displayName = "AccordionGroup";

// ─── Accordion (Standalone) ──────────────────────────────────────────────────

interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  /** The accordion's items (`Accordion.Item`). */
  children: ReactNode;
  /** Whether one or multiple items can be expanded. Defaults to `"single"`. */
  type?: "single" | "multiple";
  /** Allow collapsing all items when type is single. Defaults to `true` (Base UI's single mode is always collapsible). */
  collapsible?: boolean;
  /** Initially expanded item value(s) — uncontrolled. A string for `type="single"`, an array for `type="multiple"`. */
  defaultValue?: string | string[];
  /** Controlled expanded value(s). Pair with `onValueChange`. */
  value?: string | string[];
  /** Callback when expanded state changes. Receives a string in single mode, an array in multiple mode. */
  onValueChange?: ((value: string) => void) | ((value: string[]) => void);
  /** What an open item tints: `item` holds a block across the row and its panel, `trigger` scopes it to the row and shows it on hover. Same prop on `Accordion.Group` and on a standalone `Accordion.Item`. Defaults to `"item"`. */
  highlight?: "trigger" | "item";
  /** Pins the accordion's rows to one step of the size ladder (default 36px, compact 28px). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant;
}

type AccordionComponent = ForwardRefExoticComponent<
  AccordionProps & RefAttributes<HTMLDivElement>
> & {
  Group: typeof AccordionGroup;
  Item: typeof AccordionItem;
  Trigger: typeof AccordionTrigger;
  Content: typeof AccordionContent;
};

/**
 * Collapsible sections with animated expand/collapse and fluid hover in
 * grouped mode.
 *
 * Accordion is the standalone form: every row carries its own hover fill.
 * Accordion.Group takes the same props and adds one magnetic highlight that
 * glides between rows, so give each item inside it an `index`. Built on Base
 * UI Accordion (WAI-ARIA wiring, keyboard navigation, focus management), with
 * a spring-driven panel height and chevron. Uncontrolled through
 * `defaultValue`, controlled through `value` + `onValueChange`.
 *
 * Statics: Accordion.Group (the grouped root: type, collapsible,
 * defaultValue, value, onValueChange, highlight, size), Accordion.Item (value,
 * index, disabled), Accordion.Trigger (the row that toggles its item) and
 * Accordion.Content (the collapsible panel).
 */
const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      children,
      type = "single",
      collapsible = true,
      defaultValue,
      value,
      onValueChange,
      highlight,
      size,
      className,
      ...props
    },
    ref
  ) => {
    void collapsible; // Base UI's single-mode is always collapsible.

    // Local: controlled while `value` is set, else own state seeded from
    // `defaultValue` — `onValueChange` reports either way (Base UI contract).
    const [singleValue, setSingleValue] = useControllableState<string>(
      type === "single" ? (value as string | undefined) : undefined,
      type === "single" ? (defaultValue as string | undefined) ?? "" : "",
      type === "single"
        ? (onValueChange as ((v: string) => void) | undefined)
        : undefined
    );
    const [multipleValue, setMultipleValue] = useControllableState<string[]>(
      type === "multiple" ? (value as string[] | undefined) : undefined,
      type === "multiple" ? (defaultValue as string[] | undefined) ?? [] : [],
      type === "multiple"
        ? (onValueChange as ((v: string[]) => void) | undefined)
        : undefined
    );

    const openValues = new Set<string>(
      type === "multiple"
        ? multipleValue
        : singleValue
          ? [singleValue]
          : []
    );

    const handleSingleChange = setSingleValue;
    const handleMultipleChange = setMultipleValue;

    const baseValue: string[] = [...openValues];

    const baseOnValueChange = (next: string[]) => {
      if (type === "multiple") handleMultipleChange(next);
      else handleSingleChange(next[0] ?? "");
    };

    const root = (
      <AccordionPrimitive.Root
        value={baseValue}
        onValueChange={baseOnValueChange}
        multiple={type === "multiple"}
        render={(rootProps) => {
          const { style: _s, ...restRoot } = rootProps as React.HTMLAttributes<HTMLDivElement>;
          return (
            <div
              {...restRoot}
              ref={ref}
              className={cn(
                "w-72 max-w-full flex flex-col",
                className
              )}
              {...props}
            >
              <StandaloneOpenContext.Provider value={openValues}>
                <StandaloneHighlightContext.Provider value={highlight}>
                  {children}
                </StandaloneHighlightContext.Provider>
              </StandaloneOpenContext.Provider>
            </div>
          );
        }}
      />
    );

    // A size prop pins every row to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
  }
) as AccordionComponent;

Accordion.displayName = "Accordion";

const StandaloneOpenContext = createContext<Set<string>>(new Set());

// Local: the standalone root's `highlight`, the default for its items.
const StandaloneHighlightContext = createContext<"trigger" | "item" | undefined>(
  undefined
);

// ─── AccordionItem ───────────────────────────────────────────────────────────

interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Unique identifier for this item. */
  value: string;
  /** Position index for fluid hover. Required inside `Accordion.Group`, omit for standalone. */
  index?: number;
  /** Whether this item is disabled. Defaults to `false`. */
  disabled?: boolean;
  /** Standalone equivalent of the group's prop: what an open item tints. Ignored inside a group, which decides for all its rows. Defaults to the standalone root's `highlight`, else `"item"`. */
  highlight?: "trigger" | "item";
  /** The item's `Accordion.Trigger` and `Accordion.Content`. */
  children: ReactNode;
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, index, disabled, highlight: highlightProp, children, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const groupCtx = useAccordionGroup();
    const standaloneOpen = useContext(StandaloneOpenContext);
    const standaloneHighlight = useContext(StandaloneHighlightContext);
    const highlight = highlightProp ?? standaloneHighlight ?? "item";
    const shape = useShape();

    const isOpen = groupCtx?.grouped
      ? groupCtx.openValues.has(value)
      : standaloneOpen.has(value);

    const triggerRef = useRef<HTMLDivElement>(null);

    useRegisterFluidHoverItem(
      groupCtx?.grouped ? groupCtx.registerItem : undefined,
      index,
      triggerRef
    );

    useEffect(() => {
      if (groupCtx?.grouped && index !== undefined) {
        if (isOpen) {
          groupCtx.registerFullItem(index, internalRef.current);
        } else {
          groupCtx.registerFullItem(index, null);
        }
        return () => groupCtx.registerFullItem(index, null);
      }
    }, [index, groupCtx, isOpen]);

    return (
      <AccordionItemContext.Provider value={{ index, value, isOpen, triggerRef, highlight }}>
        <AccordionPrimitive.Item
          value={value}
          disabled={disabled}
          render={(itemProps) => {
            const { style: _s, ...restItem } = itemProps as React.HTMLAttributes<HTMLDivElement>;
            return (
              <div
                {...restItem}
                ref={(node) => {
                  (
                    internalRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = node;
                  if (typeof ref === "function") ref(node);
                  else if (ref)
                    (
                      ref as React.MutableRefObject<HTMLDivElement | null>
                    ).current = node;
                }}
                data-fluid-hover-index={index}
                className={cn(!groupCtx?.grouped && "relative", className)}
                {...props}
              >
                {/* Standalone expanded background. Under the default
                    "trigger" choice the tint lives inside AccordionTrigger,
                    where it covers the row and not the panel below it. */}
                {!groupCtx?.grouped && highlight === "item" && (
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        className={`absolute inset-0 ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: spring.moderate.exit }}
                        transition={{ duration: spring.moderate.exit.duration }}
                      />
                    )}
                  </AnimatePresence>
                )}
                {children}
              </div>
            );
          }}
        />
      </AccordionItemContext.Provider>
    );
  }
);

AccordionItem.displayName = "AccordionItem";

// ─── AccordionTrigger ────────────────────────────────────────────────────────

interface AccordionTriggerProps
  extends HTMLAttributes<HTMLButtonElement> {
  /** Trigger label content. */
  children: ReactNode;
}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const ChevronRight = useIcon("chevron-right");
    const groupCtx = useAccordionGroup();
    const { index, isOpen, triggerRef, highlight } = useAccordionItemContext();
    const shape = useShape();
    const sizeClasses = useSize();
    const [isHovered, setIsHovered] = useState(false);

    const isActive = groupCtx?.grouped
      ? groupCtx.activeIndex === index
      : isHovered;

    const triggerContent = (
      // Render Header as a <div>. Base UI's Header defaults to <h3>, which
      // would be more semantic but breaks the ancestor selectors the styles
      // rely on.
      <AccordionPrimitive.Header render={<div />}>
        <AccordionPrimitive.Trigger
          ref={ref as React.Ref<HTMLElement>}
          className={cn(
            `relative z-10 flex items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} ${sizeClasses.variant === "compact" ? "py-1" : "py-2"} w-full cursor-pointer outline-none select-none`,
            !groupCtx?.grouped &&
              "focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-0",
            className
          )}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {/* Label with dual-layer text */}
          <span className={cn("inline-grid flex-1 text-left", sizeClasses.text)}>
            <span
              className="col-start-1 row-start-1 invisible weight-semibold"
              aria-hidden="true"
            >
              {children}
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast",
                isOpen || isActive
                  ? "text-foreground"
                  : "text-muted-foreground",
                isOpen ? "weight-semibold" : "weight-normal"
              )}
            >
              {children}
            </span>
          </span>

          {/* Chevron */}
          <motion.span
            className="shrink-0 inline-flex items-center justify-center"
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={spring.fast}
          >
            <ChevronRight
              size={sizeClasses.icon}
              strokeWidth={isOpen || isActive ? 2 : 1.5}
              className={cn(
                "transition-[color,stroke-width] duration-fast",
                isOpen || isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            />
          </motion.span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    );

    if (groupCtx?.grouped) {
      return <div ref={triggerRef}>{triggerContent}</div>;
    }

    return (
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Open tint, scoped to this row: the panel below keeps the page's
            own surface, the way a sidebar row highlights without colouring
            its sub-tree. */}
        <AnimatePresence>
          {isOpen && highlight === "trigger" && isHovered && (
            <motion.div
              className={`absolute inset-0 ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              // The expanded tint rides the moderate tier, like the grouped
              // one — it marks a state, where the hover fill below tracks the
              // pointer and stays fast.
              exit={{ opacity: 0, transition: spring.moderate.exit }}
              transition={{ duration: spring.moderate.exit.duration }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className={`absolute inset-0 ${shape.bg} bg-hover pointer-events-none`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ duration: spring.fast.duration }}
            />
          )}
        </AnimatePresence>
        {triggerContent}
      </div>
    );
  }
);

AccordionTrigger.displayName = "AccordionTrigger";

// ─── AccordionContent ────────────────────────────────────────────────────────

interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Collapsible content. */
  children: ReactNode;
}

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, ...props }, ref) => {
    const groupCtx = useAccordionGroup();
    const { isOpen } = useAccordionItemContext();
    const sizeClasses = useSize();
    // Read here rather than relying on a MotionConfig the consumer may not
    // have: height is a positional value, so framer would otherwise animate
    // it for a reduced-motion user in any app that installs this component.
    const reduceMotion = useReducedMotion() ?? false;

    // The open height is animated to a self-measured LAYOUT pixel value, not
    // `height: "auto"`: framer resolves an "auto" target by measuring the
    // element's *visual* (transformed) size, so under a scaled ancestor
    // (e.g. /demo's 1.7x card) the animation overshoots to scale× the real
    // height and snaps back when the final "auto" lands — a visible height
    // reduction at the end of every open. offsetHeight and ResizeObserver
    // are transform-immune.
    const innerRef = useRef<HTMLDivElement | null>(null);
    const roRef = useRef<ResizeObserver | null>(null);
    const [contentHeight, setContentHeight] = useState<number | null>(null);
    // Items open at mount render `initial: "auto"` and receive their first
    // pixel target a commit later; that hand-off must SNAP (duration 0), not
    // spring — framer would measure the spring's numeric start visually
    // (scaled) and play a shrink. Items that open later spring normally.
    const needsSnap = useRef(isOpen);
    // Height springs only when THIS panel toggles. When contentHeight
    // changes underneath it instead — anything collapsible nested inside
    // the panel, another accordion included — it must snap: a spring
    // re-targeted every frame chases the child's own animation, lands
    // after it, and drags everything below the item along late. Same rule
    // as SidebarGroup / SidebarMenuSub; see motion-guidelines.md.
    const prevOpenRef = useRef(isOpen);
    const togglingRef = useRef(false);
    if (prevOpenRef.current !== isOpen) {
      prevOpenRef.current = isOpen;
      togglingRef.current = true;
    }

    const measureRef = useCallback((el: HTMLDivElement | null) => {
      roRef.current?.disconnect();
      roRef.current = null;
      innerRef.current = el;
      if (!el) return;
      if (el.offsetHeight > 0) setContentHeight(el.offsetHeight);
      const ro = new ResizeObserver(() => {
        // Ignore the 0 that fires while the panel is display:none.
        if (el.offsetHeight > 0) setContentHeight(el.offsetHeight);
      });
      ro.observe(el);
      roRef.current = ro;
    }, []);

    // Re-measure synchronously (pre-paint) when opening, so the spring's
    // target is the fresh layout height from its first frame.
    useIsoLayoutEffect(() => {
      if (isOpen && innerRef.current && innerRef.current.offsetHeight > 0) {
        setContentHeight(innerRef.current.offsetHeight);
      }
    }, [isOpen]);

    useEffect(() => {
      if (contentHeight !== null) needsSnap.current = false;
    }, [contentHeight]);

    // Whether the framer-motion height exit animation has fully finished.
    // Base UI's Panel would apply `hidden` the moment a controlled item
    // closes (useCollapsibleRoot sets `mounted = false` in a layout effect
    // when no CSS transition/animation is detected on the panel element, and
    // useCollapsiblePanel derives `hidden = !open && !mounted`) — which is
    // `display: none` and would freeze the exit animation mid-flight. So we
    // take over the `hidden` attribute below and only apply it once the exit
    // has actually completed.
    const [exitComplete, setExitComplete] = useState(!isOpen);
    if (isOpen && exitComplete) {
      // Reset during render so the panel is un-hidden before the opening
      // animation's first paint.
      setExitComplete(false);
    }

    // Render through `<AccordionPrimitive.Panel keepMounted>` so the panel
    // element persists through the exit animation and the trigger ↔ panel
    // ARIA contract stays intact: the panel carries `role="region"`,
    // `aria-labelledby` and the id that the Trigger's `aria-controls` points
    // to. The framer-motion height animation lives one level down inside the
    // persistent panel element and flips its target with `isOpen` (content
    // stays mounted so it can be measured).
    return (
      <AccordionPrimitive.Panel
        keepMounted
        render={(panelProps) => {
          const {
            // Applied too early for our exit animation (see above); we
            // control the attribute ourselves.
            hidden: _baseHidden,
            // Only carries the --accordion-panel-height/width vars, which
            // stay 'auto' since Base UI never measures JS-driven animations;
            // dropped for parity with the Root/Item render props above.
            style: _baseStyle,
            ...restPanel
          } = panelProps as React.HTMLAttributes<HTMLDivElement> & {
            hidden?: boolean;
          };
          return (
            <div {...restPanel} hidden={!isOpen && exitComplete}>
              <motion.div
                ref={ref}
                className={cn("overflow-hidden", className)}
                initial={{ height: isOpen ? "auto" : 0 }}
                animate={{ height: isOpen ? contentHeight ?? 0 : 0, opacity: isOpen ? 1 : 0 }}
                // spring.fast lands with the trigger's chevron, and its
                // bounce: 0 keeps pure height from overshooting its content.
                // A close is a decision already made, so it takes the quicker
                // exit tier — the target flip has no `exit` prop to carry it.
                // Opacity runs ahead of the height on its own timing: the
                // body dissolves rather than being sliced by the clip edge,
                // which is what stops the rows below reading as shoved.
                transition={
                  needsSnap.current || reduceMotion || !togglingRef.current
                    ? { duration: 0 }
                    : isOpen
                      ? { ...spring.fast, opacity: { duration: spring.fast.exit.duration } }
                      : { ...spring.fast.exit, opacity: { duration: 0.04 } }
                }
                onUpdate={() => {
                  groupCtx?.remeasure();
                }}
                onAnimationComplete={() => {
                  togglingRef.current = false;
                  groupCtx?.remeasure();
                  if (!isOpen) setExitComplete(true);
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...(props as any)}
              >
                <div
                  ref={measureRef}
                  className={cn(
                    "pt-1 text-muted-foreground",
                    sizeClasses.px,
                    sizeClasses.text,
                    sizeClasses.variant === "compact" ? "pb-2.5" : "pb-3"
                  )}
                >
                  {children}
                </div>
              </motion.div>
            </div>
          );
        }}
      />
    );
  }
);

AccordionContent.displayName = "AccordionContent";

// Compound statics: `<Accordion.Group>`, `<Accordion.Item>`, … (typed by the
// AccordionComponent cast on the forwardRef above).
Object.assign(Accordion, {
  Group: AccordionGroup,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});

export {
  Accordion,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
};
export default Accordion;
