/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tabs-subtle.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `"use client"` dropped; `@/lib/*` and `@/hooks/*`
 * imports rewritten to `../../_fluid/{lib,hooks}/*`, `framer-motion` to
 * `motion/react`; uncontrolled mode added — `selectedIndex` and `onSelect` are
 * optional, with a `defaultSelectedIndex` twin backed by
 * `useControllableState`; panels may now be written inside `<TabsSubtle>` —
 * the root partitions its children, renders only the tabs inside the tab list
 * and the `TabsSubtlePanel`s as its siblings right after it (the root element
 * IS the `role="tablist"`, so panels cannot nest in it), and a panel with no
 * `selectedIndex` / `idPrefix` of its own reads both from the TabsSubtle
 * context, with the prefix falling back to a `useId()` one; a panel rendered
 * outside `<TabsSubtle>` keeps taking them as props, exactly as upstream;
 * React 18 types: the tab list's ref write goes through `MutableRefObject`; modo
 * docs — TSDoc with FF's docs/API text, `TabsSubtle.Item` / `TabsSubtle.Panel`
 * statics (typed via a cast on the root), default export.
 * Styling reads DS tokens (AGENTS.md styling): inline `fontVariationSettings`
 * → `weight-*`; the hex focus-ring fallback → `ring-focus-ring` /
 * `border-focus-ring`; `duration-80|120|160` and tier-length JS durations →
 * `duration-<tier>` / `spring.*`.
 */

import {
  Children,
  isValidElement,
  useRef,
  useState,
  useCallback,
  useEffect,
  useId,
  createContext,
  useContext,
  forwardRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type HTMLAttributes,
  type RefAttributes,
} from "react";
import { useControllableState } from "../../_fluid/hooks/use-controllable-state";
import { Tabs } from "@base-ui/react/tabs";
import { motion, AnimatePresence } from "motion/react";
import type { IconComponent } from "../../_fluid/lib/icon-context";
import { cn } from "../../_fluid/lib/utils";
import { spring } from "../../_fluid/lib/springs";
import { useShape } from "../../_fluid/lib/shape-context";
import { SizeProvider, useSize, type SizeVariant } from "../../_fluid/lib/size-context";
import { useFluidHover } from "../../_fluid/hooks/use-fluid-hover";

interface TabsSubtleContextValue {
  registerTab: (index: number, element: HTMLElement | null) => void;
  hoveredIndex: number | null;
  selectedIndex: number;
  idPrefix: string | undefined;
  activeLabel: boolean;
}

const TabsSubtleContext = createContext<TabsSubtleContextValue | null>(null);

function useTabsSubtle() {
  const ctx = useContext(TabsSubtleContext);
  if (!ctx) throw new Error("useTabsSubtle must be used within a TabsSubtle");
  return ctx;
}

interface TabsSubtleProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** TabsSubtle.Item children, and optionally the TabsSubtle.Panel children they select. */
  children: ReactNode;
  /** Index of the currently selected tab. Controlled — pair it with `onSelect`. */
  selectedIndex?: number;
  /** Selected tab on first render when uncontrolled. Defaults to `0`. */
  defaultSelectedIndex?: number;
  /** Called when a tab is selected. */
  onSelect?: (index: number) => void;
  /** Prefix for ARIA IDs linking tabs to panels. Defaults to a generated one when panels are nested inside. */
  idPrefix?: string;
  /** When true, only the selected tab shows its text label. Requires icons on tabs. Defaults to `false`. */
  activeLabel?: boolean;
  /** Pins the tabs to one step of the size ladder (default 36px, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant;
}

type TabsSubtleComponent = ForwardRefExoticComponent<
  TabsSubtleProps & RefAttributes<HTMLDivElement>
> & { Item: typeof TabsSubtleItem; Panel: typeof TabsSubtlePanel };

/**
 * Tab navigation with smooth pill animations.
 *
 * A borderless tab strip: the selected pill springs between tabs, a lighter
 * hover pill previews the next one, and the active label animates to semibold
 * without shifting. With `activeLabel`, tabs collapse to their icon and the
 * selected one expands its label to a measured width. Base UI owns
 * `role="tablist"`, the roving tabindex and Arrow/Home/End navigation
 * (manual activation — arrows move, Enter or Space selects). Uncontrolled with
 * `defaultSelectedIndex`, or controlled with `selectedIndex` + `onSelect`.
 *
 * The root element is the tab list itself, so nested `TabsSubtle.Panel`
 * children are lifted out and rendered as its siblings, wired to the tabs
 * through a generated id prefix; panels rendered outside still take
 * `selectedIndex` and `idPrefix` as props.
 *
 * Statics:
 * - `TabsSubtle.Item` — one tab: `index`, `label`, optional `icon`.
 * - `TabsSubtle.Panel` — content for the tab with the same `index`.
 *
 * @example
 * # Basic
 *
 * The pill follows the selected tab; panels swap with it.
 *
 * ```tsx
 * <div className="flex flex-col gap-4 w-full">
 *   <TabsSubtle defaultSelectedIndex={0}>
 *     {['Teamspaces', 'Recents', 'Favorites', 'Shared'].map((label, i) => (
 *       <TabsSubtle.Item key={label} index={i} label={label} />
 *     ))}
 *     {['Teamspaces', 'Recents', 'Favorites', 'Shared'].map((label, i) => (
 *       <TabsSubtle.Panel key={label} index={i}>
 *         <p className="text-body text-muted-foreground px-3">{label} content goes here.</p>
 *       </TabsSubtle.Panel>
 *     ))}
 *   </TabsSubtle>
 * </div>
 * ```
 *
 * @example
 * # With Icons
 *
 * An `icon` sits ahead of the label and thickens its stroke while its tab is
 * hovered or selected.
 *
 * ```tsx
 * <div className="flex flex-col gap-4 w-full">
 *   <TabsSubtle defaultSelectedIndex={0}>
 *     <TabsSubtle.Item index={0} icon={SquareLibrary} label="Teamspaces" />
 *     <TabsSubtle.Item index={1} icon={Clock} label="Recents" />
 *     <TabsSubtle.Item index={2} icon={Star} label="Favorites" />
 *     <TabsSubtle.Item index={3} icon={Users} label="Shared" />
 *     <TabsSubtle.Panel index={0}><p className="text-body text-muted-foreground px-3">Teamspaces content goes here.</p></TabsSubtle.Panel>
 *     <TabsSubtle.Panel index={1}><p className="text-body text-muted-foreground px-3">Recents content goes here.</p></TabsSubtle.Panel>
 *     <TabsSubtle.Panel index={2}><p className="text-body text-muted-foreground px-3">Favorites content goes here.</p></TabsSubtle.Panel>
 *     <TabsSubtle.Panel index={3}><p className="text-body text-muted-foreground px-3">Shared content goes here.</p></TabsSubtle.Panel>
 *   </TabsSubtle>
 * </div>
 * ```
 *
 * @example
 * # Active Label
 *
 * With `activeLabel`, every tab shrinks to its icon and only the selected one
 * spells itself out.
 *
 * ```tsx
 * <TabsSubtle activeLabel defaultSelectedIndex={0}>
 *   <TabsSubtle.Item index={0} icon={SquareLibrary} label="Teamspaces" />
 *   <TabsSubtle.Item index={1} icon={Clock} label="Recents" />
 *   <TabsSubtle.Item index={2} icon={Star} label="Favorites" />
 *   <TabsSubtle.Item index={3} icon={Users} label="Shared" />
 * </TabsSubtle>
 * ```
 */
const TabsSubtle = forwardRef<HTMLDivElement, TabsSubtleProps>(
  (
    {
      children,
      selectedIndex: selectedIndexProp,
      defaultSelectedIndex = 0,
      onSelect: onSelectProp,
      idPrefix,
      activeLabel = false,
      size,
      className,
      ...props
    },
    ref
  ) => {
    // Local: controlled `selectedIndex`, or internal state seeded from
    // `defaultSelectedIndex`.
    const [selectedIndex, onSelect] = useControllableState(
      selectedIndexProp,
      defaultSelectedIndex,
      onSelectProp
    )

    // Local: the root IS the tab list, so panels written inside it are pulled
    // out and rendered right after it, under the same context.
    const childList = Children.toArray(children)
    const panels = childList.filter((child) => isValidElement(child) && child.type === TabsSubtlePanel)
    const tabs = childList.filter((child) => !(isValidElement(child) && child.type === TabsSubtlePanel))
    const generatedIdPrefix = useId()
    const resolvedIdPrefix = idPrefix ?? (panels.length > 0 ? generatedIdPrefix : undefined)

    const containerRef = useRef<HTMLDivElement>(null);
    const isMouseInside = useRef(false);
    const shape = useShape();

    const {
      activeIndex: hoveredIndex,
      setActiveIndex: setHoveredIndex,
      itemRects: tabRects,
      handlers,
      registerItem,
      measureItems: measureTabs,
    } = useFluidHover(containerRef, { axis: "x" });

    // Track tab elements locally so we can observe their individual resizes
    const tabElementsRef = useRef(new Map<number, HTMLElement>());
    const registerTab = useCallback(
      (index: number, element: HTMLElement | null) => {
        registerItem(index, element);
        if (element) {
          tabElementsRef.current.set(index, element);
        } else {
          tabElementsRef.current.delete(index);
        }
      },
      [registerItem]
    );

    useEffect(() => {
      measureTabs();
    }, [measureTabs, children]);

    // Observe individual tab buttons for resize (label expand/collapse in activeLabel mode)
    useEffect(() => {
      const elements = tabElementsRef.current;
      if (elements.size === 0) return;
      const ro = new ResizeObserver(() => measureTabs());
      elements.forEach((el) => ro.observe(el));
      return () => ro.disconnect();
    }, [measureTabs, children]);

    // Wrap handlers to track isMouseInside
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        isMouseInside.current = true;
        handlers.onMouseMove(e);
      },
      [handlers]
    );

    const handleMouseLeave = useCallback(() => {
      isMouseInside.current = false;
      handlers.onMouseLeave();
    }, [handlers]);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const selectedRect = tabRects[selectedIndex];
    const hoverRect =
      hoveredIndex !== null ? tabRects[hoveredIndex] : null;
    const focusRect = focusedIndex !== null ? tabRects[focusedIndex] : null;
    const isHoveringSelected = hoveredIndex === selectedIndex;
    const isHovering = hoveredIndex !== null && !isHoveringSelected;

    const root = (
      <TabsSubtleContext.Provider
        value={{ registerTab, hoveredIndex, selectedIndex, idPrefix: resolvedIdPrefix, activeLabel }}
      >
        {/* Root is merged into List via `render` so a single <div> is emitted,
            matching the previous DOM structure. Base UI owns role="tablist",
            roving tabindex, and Arrow/Home/End keyboard navigation.
            `activateOnFocus={false}` keeps manual activation: arrows move
            focus, Enter/Space selects. */}
        <Tabs.Root
          value={selectedIndex}
          onValueChange={(value) => {
            if (typeof value === "number") onSelect(value);
          }}
          render={
            <Tabs.List
              activateOnFocus={false}
              ref={(node: HTMLDivElement | null) => {
                // React 18 types: `useRef<T>(null)` is a read-only RefObject.
                (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
                const indexAttr = (e.target as HTMLElement)
                  .closest("[data-fluid-hover-index]")
                  ?.getAttribute("data-fluid-hover-index");
                if (indexAttr != null) {
                  const idx = Number(indexAttr);
                  setHoveredIndex(idx);
                  setFocusedIndex(
                    (e.target as HTMLElement).matches(":focus-visible") ? idx : null
                  );
                }
              }}
              onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
                if (containerRef.current?.contains(e.relatedTarget as Node)) return;
                setFocusedIndex(null);
                if (isMouseInside.current) return;
                setHoveredIndex(null);
              }}
              className={cn(
                // -mx-1 px-1 / -my-1 py-1 give the 2px-outset focus ring room
                // to draw without being clipped by overflow-x-auto. The
                // max-width allows for the negative margins: fit-content
                // parents size against the margin box (8px narrower than the
                // border box), so a plain max-w-full would clamp the list 8px
                // too small and clip the first/last tab's ring.
                "relative flex items-center select-none overflow-x-auto max-w-[calc(100%_+_8px)] scrollbar-hide -mx-1 px-1 -my-1 py-1",
                className
              )}
              {...props}
            >
              {/* Selected pill */}
              {selectedRect && (
                <motion.div
                  className={cn("absolute bg-active pointer-events-none", shape.bg)}
                  initial={false}
                  animate={{
                    left: selectedRect.left,
                    width: selectedRect.width,
                    top: selectedRect.top,
                    height: selectedRect.height,
                    opacity: isHovering ? 0.8 : 1,
                  }}
                  transition={{
                    ...spring.moderate,
                    opacity: { duration: spring.fast.duration },
                  }}
                />
              )}

              {/* Hover pill */}
              <AnimatePresence>
                {hoverRect && !isHoveringSelected && selectedRect && (
                  <motion.div
                    className={cn("absolute bg-active pointer-events-none", shape.bg)}
                    initial={{
                      left: selectedRect.left,
                      width: selectedRect.width,
                      top: selectedRect.top,
                      height: selectedRect.height,
                      opacity: 0,
                    }}
                    animate={{
                      left: hoverRect.left,
                      width: hoverRect.width,
                      top: hoverRect.top,
                      height: hoverRect.height,
                      opacity: 0.4,
                    }}
                    exit={
                      !isMouseInside.current && selectedRect
                        ? {
                            left: selectedRect.left,
                            width: selectedRect.width,
                            top: selectedRect.top,
                            height: selectedRect.height,
                            opacity: 0,
                            transition: { ...spring.moderate, opacity: { duration: spring.fast.exit.duration } },
                          }
                        : { opacity: 0, transition: spring.fast.exit }
                    }
                    transition={{
                      ...spring.fast,
                      opacity: { duration: spring.fast.duration },
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Focus ring */}
              <AnimatePresence>
                {focusRect && (
                  <motion.div
                    className={cn("absolute pointer-events-none z-20 border border-focus-ring", shape.focusRing)}
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

              {tabs}
            </Tabs.List>
          }
        />
        {panels}
      </TabsSubtleContext.Provider>
    );

    // A size prop pins every tab to one ladder step.
    return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
  }
) as TabsSubtleComponent;

TabsSubtle.displayName = "TabsSubtle";

interface TabsSubtleItemProps extends HTMLAttributes<HTMLButtonElement> {
  /** Icon displayed in the tab. */
  icon?: IconComponent;
  /** Text label for the tab. */
  label: string;
  /** Position index within the tab list. */
  index: number;
}

const TabsSubtleItem = forwardRef<HTMLButtonElement, TabsSubtleItemProps>(
  ({ icon: Icon, label, index, className, ...props }, ref) => {
    const internalRef = useRef<HTMLButtonElement | null>(null);
    // The collapsing label animates to a MEASURED layout width, not "auto":
    // framer resolves an "auto" target from the element's *visual*
    // (transformed) size, so under a scaled ancestor (e.g. /demo's card) the
    // spring overshoots to scale-x the real width and snaps when "auto"
    // lands. offsetWidth and ResizeObserver are transform-immune — same
    // setup as the accordions' height animation.
    const [labelWidth, setLabelWidth] = useState<number | null>(null);
    const labelRoRef = useRef<ResizeObserver | null>(null);
    const measureLabel = useCallback((el: HTMLSpanElement | null) => {
      labelRoRef.current?.disconnect();
      labelRoRef.current = null;
      if (!el) return;
      const update = () => setLabelWidth(el.offsetWidth);
      update();
      labelRoRef.current = new ResizeObserver(update);
      labelRoRef.current.observe(el);
    }, []);
    const shape = useShape();
    const sizeClasses = useSize();
    const { registerTab, hoveredIndex, selectedIndex, idPrefix, activeLabel } =
      useTabsSubtle();

    useEffect(() => {
      registerTab(index, internalRef.current);
      return () => registerTab(index, null);
    }, [index, registerTab]);

    const isSelected = selectedIndex === index;
    const isActive = hoveredIndex === index || isSelected;
    const collapseLabel = activeLabel && !!Icon;
    const showLabel = !collapseLabel || isSelected;

    const labelContent = (
      // Both stacked spans carry the text-box trim so the invisible bold
      // sizer and the visible label keep identical boxes.
      <span
        ref={measureLabel}
        className={cn("inline-grid whitespace-nowrap", sizeClasses.text)}
      >
        <span
          className="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic] weight-semibold"
          aria-hidden="true"
        >
          {label}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast [text-box:trim-both_cap_alphabetic]",
            isActive ? "text-foreground" : "text-muted-foreground",
            isSelected ? "weight-semibold" : "weight-normal"
          )}
        >
          {label}
        </span>
      </span>
    );

    return (
      // Base UI Tab renders a native <button type="button"> and wires
      // role="tab", aria-selected, roving tabindex, and activation for us.
      // id/aria-controls are only overridden when an idPrefix is supplied so
      // externally rendered TabsSubtlePanel elements stay linked.
      <Tabs.Tab
        ref={(node: HTMLElement | null) => {
          const button = node as HTMLButtonElement | null;
          internalRef.current = button;
          if (typeof ref === "function") ref(button);
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = button;
        }}
        value={index}
        data-fluid-hover-index={index}
        id={idPrefix ? `${idPrefix}-tab-${index}` : undefined}
        aria-controls={idPrefix ? `${idPrefix}-panel-${index}` : undefined}
        aria-label={collapseLabel && !showLabel ? label : undefined}
        className={cn(
          // Fixed heights (was py-2 around a 19.5px line box ≈ 35.5px) so the
          // text-box trim on the label doesn't shrink the tab. Standalone
          // pills sit directly on the ladder's control height.
          "relative z-10 flex items-center cursor-pointer bg-transparent border-none outline-none",
          sizeClasses.control,
          sizeClasses.px,
          !collapseLabel && sizeClasses.gap,
          shape.bg,
          className
        )}
        {...props}
      >
        {Icon && (
          <Icon
            size={sizeClasses.icon}
            strokeWidth={isActive ? 2 : 1.5}
            className={cn(
              "shrink-0 transition-[color,stroke-width] duration-fast",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          />
        )}
        {collapseLabel ? (
          <AnimatePresence initial={false}>
            {showLabel && (
              <motion.span
                key="label"
                className="overflow-hidden"
                // Until the measurement lands, let CSS resolve the width
                // instead of handing framer "auto": framer resolves an "auto"
                // target from the element's *visual* size, so under a scaled
                // ancestor (the /demo card, ~1.76x) it writes back a layout
                // width that much too wide, then springs back down when the
                // measured value arrives — the selected tab visibly pulses on
                // arrival. Plain CSS auto is the true layout width, and the
                // measured number that follows matches it exactly.
                style={labelWidth == null ? { width: "auto" } : undefined}
                initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                animate={{
                  ...(labelWidth != null ? { width: labelWidth } : null),
                  opacity: 1,
                  // Matches the ladder's icon-to-label gap (gap-2 / gap-1.5).
                  marginLeft: sizeClasses.variant === "compact" ? 6 : 8,
                }}
                exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                transition={{
                  ...spring.fast,
                  opacity: { duration: spring.fast.exit.duration },
                }}
              >
                {labelContent}
              </motion.span>
            )}
          </AnimatePresence>
        ) : (
          labelContent
        )}
      </Tabs.Tab>
    );
  }
);

TabsSubtleItem.displayName = "TabsSubtleItem";

interface TabsSubtlePanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Index of this panel; rendered only when it matches the selected tab. */
  index: number;
  /** Currently selected tab index. Defaults to the enclosing TabsSubtle's selection. */
  selectedIndex?: number;
  /** Must match the TabsSubtle idPrefix. Defaults to the enclosing TabsSubtle's prefix. */
  idPrefix?: string;
  /** Panel content, only rendered when selected. */
  children: ReactNode;
}

// Written either inside <TabsSubtle> (the root lifts it out of the tab list
// and it reads the selection from context) or outside it, next to the tabs
// (then it takes `selectedIndex` and `idPrefix` as props, as upstream). Either
// way it cannot use Base UI's Tabs.Panel — which needs the Tabs.Root context,
// and that root is merged into the tab list — so it stays a plain tabpanel
// linked to its tab through the shared idPrefix.
const TabsSubtlePanel = forwardRef<HTMLDivElement, TabsSubtlePanelProps>(
  ({ index, selectedIndex, idPrefix, children, className, ...props }, ref) => {
    // Local: fall back to the group's selection and id prefix.
    const ctx = useContext(TabsSubtleContext)
    const resolvedSelectedIndex = selectedIndex ?? ctx?.selectedIndex ?? -1
    const resolvedIdPrefix = idPrefix ?? ctx?.idPrefix
    const isSelected = resolvedSelectedIndex === index;

    return (
      <div
        ref={ref}
        id={resolvedIdPrefix ? `${resolvedIdPrefix}-panel-${index}` : undefined}
        role="tabpanel"
        aria-labelledby={resolvedIdPrefix ? `${resolvedIdPrefix}-tab-${index}` : undefined}
        hidden={!isSelected}
        tabIndex={-1}
        className={cn("outline-none", className)}
        {...props}
      >
        {isSelected && children}
      </div>
    );
  }
);

TabsSubtlePanel.displayName = "TabsSubtlePanel";

Object.assign(TabsSubtle, { Item: TabsSubtleItem, Panel: TabsSubtlePanel })

export { TabsSubtle, TabsSubtleItem, TabsSubtlePanel };
export type { TabsSubtleProps, TabsSubtleItemProps, TabsSubtlePanelProps };
export default TabsSubtle
