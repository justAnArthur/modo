/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/elevated.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `@/lib/{utils,surface-context,surface-classes}` imports rewritten to `../../_fluid/lib/*`.
 * - `className` / `children` re-declared on `ElevatedProps` with descriptions (modo's parser
 *   lists only members declared in the interface body); `children` doc added.
 * - modo item: TSDoc (from the FF "Surfaces" docs page) on the component, the forwardRef
 *   result typed with its `Provider` static, `Object.assign(Elevated, { Provider: SurfaceProvider })`,
 *   `SurfaceProvider` / `useSurface` / `surfaceClasses` re-exported, and a default export.
 * - Imports `./surface.css` (the 8-level ladder tokens; modo also auto-injects it).
 */

import './surface.css'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
} from "react";
import { cn } from "../../_fluid/lib/utils";
import { useSurface, SurfaceProvider } from "../../_fluid/lib/surface-context";
import { surfaceClasses } from "../../_fluid/lib/surface-classes";

interface ElevatedProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Steps above the current substrate.
   *
   * The component's own surface level becomes `min(substrate + offset, 8)`
   * and is re-provided to descendants via SurfaceProvider, so further
   * nesting walks up the ladder automatically.
   *
   * Conventional offsets:
   *   2 — dropdown / popover / select menu
   *   4 — dialog / modal
   */
  offset: number;
  /**
   * Override for the shadow level. Defaults to the computed surface level.
   *
   * Pass a fixed value when the component should keep a constant shadow
   * weight regardless of how deeply it's nested — e.g. a dropdown always
   * reads `shadow-surface-3` whether it opens on the page or inside a
   * dialog, even though its background tracks the substrate.
   */
  shadowLevel?: number;
  /** Merged after the surface classes; radius and padding go here. */
  className?: string;
  /** Content of the surface. Everything inside reads this surface's level as its substrate. */
  children?: ReactNode;
}

interface ElevatedStatics {
  /** `SurfaceProvider` — set the substrate for a subtree by hand. */
  Provider: typeof SurfaceProvider;
}

/**
 * Eight surface levels that nest. Components read their substrate from
 * context and lift relative to it, so popovers, dropdowns, and dialogs stay
 * visible at any depth — in both light and dark mode.
 *
 * Three pieces: tokens, substrate context, and the primitive. The tokens are
 * eight `bg-surface-N` / `shadow-surface-N` pairs. The substrate is a React
 * context holding the level of the container you are in (1, the page, when
 * nothing provides one). `Elevated` reads that substrate, settles at
 * `min(substrate + offset, 8)`, paints the matching background and shadow,
 * and re-provides its own level, so nested surfaces keep climbing the ladder
 * without anything passed between them. Conventional offsets: 2 for a
 * dropdown, popover or select menu; 4 for a dialog or modal. All other props
 * (ref included) go to the `div`.
 *
 * Statics:
 * - `Elevated.Provider` — `SurfaceProvider`: set the substrate for a subtree
 *   by hand (1 page, 3 popover, 5 dialog).
 *
 * Also exported: `SurfaceProvider`, `useSurface()` (the current substrate
 * level, 1 when no provider is present) and `surfaceClasses(bgLevel,
 * shadowLevel = bgLevel)` for components that paint a level without
 * `Elevated`.
 *
 * @example
 * # The problem
 *
 * In light mode, we use shadow behind white surfaces to signify elevation.
 * In dark mode, we use progressively lighter backgrounds instead. But
 * traditional components have a fixed background — a dropdown often ends up
 * the same color as the dialog it sits in. Here the role menu hard-codes the
 * dialog's own `bg-surface-5`: a real elevation shadow, but the body melts
 * straight into the dialog.
 *
 * ```tsx
 * <div className="dark bg-background text-foreground rounded-2xl p-6 w-full flex justify-center">
 *   <Elevated.Provider value={1}>
 *     <Elevated offset={4} className="w-[320px] max-w-full rounded-2xl p-6 flex flex-col gap-5">
 *       <div className="flex items-start justify-between gap-3">
 *         <span className="text-[15px]" style={{ fontVariationSettings: "'wght' 550, 'opsz' 18" }}>Invite to your workspace</span>
 *         <X size={16} strokeWidth={1.5} className="text-muted-foreground" />
 *       </div>
 *       <div className="flex flex-col gap-2">
 *         <span className="text-body" style={{ fontVariationSettings: "'wght' 450, 'opsz' 15" }}>Select role</span>
 *         <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-active text-body border border-border">
 *           <span>Member</span>
 *           <ChevronDown size={14} strokeWidth={1.5} className="text-muted-foreground rotate-180" />
 *         </div>
 *         <div className="-mt-px rounded-2xl p-1 flex flex-col bg-surface-5 shadow-surface-3">
 *           {[{ Icon: Users, label: 'Workspace owner' }, { Icon: User, label: 'Member' }, { Icon: Lock, label: 'Restricted member' }].map(({ Icon, label }) => (
 *             <div key={label} className={label === 'Member' ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-active text-body text-foreground' : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body text-muted-foreground'}>
 *               <Icon size={18} strokeWidth={label === 'Member' ? 2 : 1.5} />
 *               {label}
 *             </div>
 *           ))}
 *         </div>
 *       </div>
 *       <span className="text-caption text-muted-foreground">Dialog: surface 5 · menu: surface 5 + shadow 3 — it melts</span>
 *     </Elevated>
 *   </Elevated.Provider>
 * </div>
 * ```
 *
 * @example
 * # Tokens
 *
 * Eight bg/shadow pairs. Light mode flattens to white after step 2 (shadow
 * alone carries elevation). Dark mode keeps adding white-opacity plus a
 * layered shadow recipe. A `dark` or `light` class on any subtree
 * re-resolves the whole ladder inside it.
 *
 * ```tsx
 * <Elevated.Provider value={1}>
 *   <div className="dark bg-background text-foreground rounded-2xl p-4 flex flex-col gap-4 w-full">
 *     {['dark', 'light'].map((scheme) => (
 *       <div key={scheme} className={scheme === 'dark' ? 'dark flex flex-col gap-2' : 'light flex flex-col gap-2'}>
 *         <span className="text-[11px] text-muted-foreground tracking-wider capitalize" style={{ fontVariationSettings: "'wght' 550, 'opsz' 18" }}>{scheme}</span>
 *         <ScrollArea orientation="horizontal" viewportClassName="scroll-fade-x" className="rounded-2xl bg-background">
 *           <div className="flex gap-3 p-4 w-max">
 *             {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
 *               <div key={n} className="flex flex-col items-center gap-2 shrink-0">
 *                 <Elevated offset={n - 1} aria-hidden className="size-14 rounded-xl" />
 *                 <span className="text-[11px] text-muted-foreground font-mono">{n}</span>
 *               </div>
 *             ))}
 *           </div>
 *         </ScrollArea>
 *       </div>
 *     ))}
 *   </div>
 * </Elevated.Provider>
 * ```
 *
 * @example
 * # Substrate
 *
 * Each container knows its own level and tells whatever opens inside. A
 * popover on the page and the same popover inside a dialog both end up at
 * the right depth, without anything passed between them. The same
 * three-item menu (`Elevated offset={2}`) lands on surface 3, 5 and 7.
 *
 * ```tsx
 * <div className="dark bg-background text-foreground rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
 *   {[{ substrate: 1, label: 'On the page' }, { substrate: 3, label: 'Inside a popover' }, { substrate: 5, label: 'Inside a dialog' }].map(({ substrate, label }) => (
 *     <div key={substrate} className="flex flex-col gap-3 rounded-2xl p-4 border border-border/40" style={{ backgroundColor: `var(--surface-${substrate})` }}>
 *       <span className="text-caption text-foreground" style={{ fontVariationSettings: "'wght' 550, 'opsz' 18" }}>{label}</span>
 *       <Elevated.Provider value={substrate}>
 *         <Elevated offset={2} className="rounded-xl p-1 flex flex-col">
 *           {[{ Icon: Star, name: 'Favorites' }, { Icon: Clock, name: 'Recents' }, { Icon: Lock, name: 'Private' }].map(({ Icon, name }, i) => (
 *             <div key={name} className={i === 0 ? 'flex items-center gap-2 h-9 px-2 rounded-lg text-body bg-active text-foreground' : 'flex items-center gap-2 h-9 px-2 rounded-lg text-body text-muted-foreground hover:bg-hover hover:text-foreground'}>
 *               <Icon size={16} strokeWidth={i === 0 ? 2 : 1.5} />
 *               {name}
 *             </div>
 *           ))}
 *         </Elevated>
 *       </Elevated.Provider>
 *       <span className="text-[11px] font-mono text-muted-foreground">substrate {substrate} → menu surface {substrate + 2}</span>
 *     </div>
 *   ))}
 * </div>
 * ```
 *
 * @example
 * # Elevated
 *
 * Wrap a panel and the background settles at the level it belongs to. The
 * shadow doesn't change, so a popover still reads as a popover three layers
 * down.
 *
 * ```tsx
 * <div className="dark bg-background text-foreground rounded-2xl p-4 w-full">
 *   <Elevated.Provider value={1}>
 *     <div className="flex flex-col gap-3 p-5 rounded-2xl w-full max-w-[480px] mx-auto bg-surface-1 shadow-surface-1">
 *       <span className="text-caption text-muted-foreground">Page</span>
 *       <Elevated offset={2} className="rounded-2xl p-5 flex flex-col gap-3">
 *         <span className="text-caption text-muted-foreground">Card</span>
 *         <Elevated offset={2} className="rounded-2xl p-5 flex flex-col gap-3">
 *           <span className="text-caption text-muted-foreground">Popover</span>
 *           <Elevated offset={2} className="rounded-2xl p-5">
 *             <span className="text-caption text-muted-foreground">Menu</span>
 *           </Elevated>
 *         </Elevated>
 *       </Elevated>
 *     </div>
 *   </Elevated.Provider>
 * </div>
 * ```
 *
 * @example
 * # Move through levels
 *
 * Each layer lifts a single step off the one it sits in (`offset={1}`) —
 * whether you span two levels or all eight. Hover a surface to see its
 * level. (The FF page picks the slice with a range slider; this one spans
 * the whole ladder.)
 *
 * ```tsx
 * <div className="dark bg-background text-foreground rounded-2xl p-4 w-full flex justify-center">
 *   <Elevated.Provider value={1}>
 *     <div data-surface className="relative rounded-2xl p-6 flex items-center justify-center bg-surface-1 shadow-surface-1 [&:hover>span]:opacity-100 [&:has([data-surface]:hover)>span]:opacity-0">
 *       <span className="absolute top-2 left-2.5 text-caption text-muted-foreground opacity-0 transition-opacity duration-150">surface-1</span>
 *       {[2, 3, 4, 5, 6, 7, 8].reduceRight((inner, level) => (
 *         <Elevated offset={1} data-surface className={inner ? 'relative rounded-2xl p-6 flex items-center justify-center [&:hover>span]:opacity-100 [&:has([data-surface]:hover)>span]:opacity-0' : 'relative rounded-2xl p-6 flex items-center justify-center size-24 [&:hover>span]:opacity-100 [&:has([data-surface]:hover)>span]:opacity-0'}>
 *           <span className="absolute top-2 left-2.5 text-caption text-muted-foreground opacity-0 transition-opacity duration-150">surface-{level}</span>
 *           {inner}
 *         </Elevated>
 *       ), null)}
 *     </div>
 *   </Elevated.Provider>
 * </div>
 * ```
 *
 * @example
 * # Invite dialog
 *
 * Dialog at surface 5, role picker at surface 7 — no props passed between
 * them. The menu keeps the dropdown's fixed `shadowLevel={3}` while its
 * background tracks the substrate.
 *
 * ```tsx
 * <div className="dark bg-background text-foreground rounded-2xl p-6 w-full flex justify-center">
 *   <Elevated.Provider value={1}>
 *     <Elevated offset={4} className="w-[320px] max-w-full rounded-2xl p-6 flex flex-col gap-5">
 *       <div className="flex items-start justify-between gap-3">
 *         <span className="text-[15px]" style={{ fontVariationSettings: "'wght' 550, 'opsz' 18" }}>Invite to your workspace</span>
 *         <X size={16} strokeWidth={1.5} className="text-muted-foreground" />
 *       </div>
 *       <div className="flex flex-col gap-2">
 *         <span className="text-body" style={{ fontVariationSettings: "'wght' 450, 'opsz' 15" }}>Select role</span>
 *         <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-active text-body border border-border">
 *           <span>Member</span>
 *           <ChevronDown size={14} strokeWidth={1.5} className="text-muted-foreground rotate-180" />
 *         </div>
 *         <Elevated offset={2} shadowLevel={3} className="-mt-px rounded-2xl p-1 flex flex-col">
 *           {[{ Icon: Users, label: 'Workspace owner' }, { Icon: User, label: 'Member' }, { Icon: Lock, label: 'Restricted member' }].map(({ Icon, label }) => (
 *             <div key={label} className={label === 'Member' ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-active text-body text-foreground' : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body text-muted-foreground hover:bg-hover hover:text-foreground'}>
 *               <Icon size={18} strokeWidth={label === 'Member' ? 2 : 1.5} />
 *               {label}
 *             </div>
 *           ))}
 *         </Elevated>
 *       </div>
 *       <div className="flex justify-end items-center gap-2 pt-2">
 *         <Button variant="ghost">Cancel</Button>
 *         <Button disabled>Send invites</Button>
 *       </div>
 *     </Elevated>
 *   </Elevated.Provider>
 * </div>
 * ```
 */
const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, ...props }, ref) => {
    const substrate = useSurface();
    const level = Math.min(substrate + offset, 8);
    return (
      <SurfaceProvider value={level}>
        <div
          ref={ref}
          className={cn(surfaceClasses(level, shadowLevel ?? level), className)}
          {...props}
        >
          {children}
        </div>
      </SurfaceProvider>
    );
  }
) as ForwardRefExoticComponent<ElevatedProps & RefAttributes<HTMLDivElement>> & ElevatedStatics;
Elevated.displayName = "Elevated";

Object.assign(Elevated, { Provider: SurfaceProvider })

export { Elevated, SurfaceProvider, useSurface, surfaceClasses };
export type { ElevatedProps };

export default Elevated
