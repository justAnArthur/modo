/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/size-context.tsx` + docs `app/docs/sizes/page.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The implementation stays in `_fluid/lib/size-context.tsx` (vendored, shared by
 *   every sized component); this item is a thin documented `SizeProvider` wrapper
 *   around it so modo can list its props, plus re-exports of the hooks, maps and types.
 * - The docs page's live demos (toolbar ladder, compact-region callout, token
 *   inspector overlay, type-scale specimen) are rewritten as static TSDoc examples;
 *   Select, TabsSubtle, InputGroup, CheckboxGroup and Dropdown in upstream's demos
 *   are swapped for Button, Badge, Switch and Tabs; the inspector overlay is dropped.
 * - The token table and type scale are written out in the examples (values
 *   mirror `sizeMap` / `typeScale`) instead of being rendered from them.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`.
 */

import type { ReactNode } from 'react'
import { SizeProvider as FluidSizeProvider } from '../../_fluid/lib/size-context'

interface SizeProviderProps {
  /** Controlled variant — pins every control in the subtree to one step. `'default'` is 36px controls, `'compact'` is 28px. */
  size?: 'default' | 'compact'
  /** Uncontrolled initial variant, switchable via `useSizeContext().setSize`. Defaults to `'default'`. */
  defaultSize?: 'default' | 'compact'
  /** The region whose controls follow the step — popups opened from inside it included. */
  children: ReactNode
}

/**
 * Two component sizes: a 36px default and a 28px compact. An interface reads
 * as one product when its controls share a sizing rhythm — a button next to a
 * select next to a tab should land on the same height. Each size scales text,
 * icons, padding and gaps together, not just the box. Compact is for dense,
 * data-heavy tools (filter bars, toolbars, table headers, sidebars); default
 * is the right call for everything else.
 *
 * Density is a region decision, not a per-control one: wrap the region in a
 * `SizeProvider` and every sized component inside follows — menus included,
 * since React context crosses portals. Precedence is explicit `size` prop on
 * the component > nearest `SizeProvider` > `'default'`, so a single control can
 * still opt out with `size="default"` (or `size="compact"`). Button, Badge,
 * Select, Tabs, TabsSubtle, Dropdown, CheckboxGroup, RadioGroup, InputGroup,
 * InputCopy, InputMessage, Table, Switch, Slider, Accordion, Card, ColorPicker
 * and ThinkingIndicator all take that per-component `size`.
 *
 * Tokens per step (`useSize()` returns them as classes, `icon` in px):
 * `control` — control and list-row height, shared so a menu row lines up with
 * its trigger — h-9 · 36px / h-7 · 28px. `segmentItem + segmentPad` —
 * segmented tabs inside their padded list — 28px + 4px = 36px / 24px + 2px =
 * 28px. `text` — labels inside controls — 13px / 12px. `icon` — leading and
 * trailing icons, checkbox square, radio circle — 16px / 14px. `px / itemPx` —
 * control / row horizontal padding — 12px / 8px and 10px / 6px. `gap` —
 * icon-to-label and control-to-control gap — 8px / 4px.
 *
 * Type follows the ladder: compact drops each role one notch, so a dense
 * screen keeps the same hierarchy at a smaller size (`useTypeScale()`, px):
 * display 28 / 24, title 16 / 15, subtitle 14 / 13, body 13 / 12, caption
 * 12 / 11. The default column is also the `text-display|title|subtitle|body|caption`
 * utilities (tokens/typography.css).
 *
 * Also exported from this item: `useSize(override?)`, `useSizeVariant(override?)`,
 * `useSizeContext()` (`{ size, setSize }` inside a provider), `useTypeScale(override?)`,
 * the `sizeMap` and `typeScale` tables, and the `SizeVariant`, `SizeClasses`,
 * `TypeScaleRole`, `TypeScaleStep` types.
 *
 * @example
 * # The principle
 *
 * The same toolbar line at each step. One SizeProvider pins the row; every
 * control inside follows — height, label size, icon size and padding shrink
 * together, and the row gap steps from 8px to 4px.
 *
 * ```tsx
 * <div className="flex w-full flex-col gap-8">
 *   <SizeProvider size="default">
 *     <div className="flex flex-col items-start gap-3">
 *       <span className="text-caption text-muted-foreground select-none">Default · 36px</span>
 *       <div className="flex flex-wrap items-center gap-2">
 *         <Button variant="tertiary" trailingIcon={ChevronDown}>Last updated</Button>
 *         <Button variant="tertiary" size="icon" aria-label="Filter">
 *           <ListFilter />
 *         </Button>
 *         <Button leadingIcon={Plus}>New</Button>
 *       </div>
 *     </div>
 *   </SizeProvider>
 *   <SizeProvider size="compact">
 *     <div className="flex flex-col items-start gap-3">
 *       <span className="text-caption text-muted-foreground select-none">Compact · 28px</span>
 *       <div className="flex flex-wrap items-center gap-1">
 *         <Button variant="tertiary" trailingIcon={ChevronDown}>Last updated</Button>
 *         <Button variant="tertiary" size="icon-compact" aria-label="Filter">
 *           <ListFilter />
 *         </Button>
 *         <Button leadingIcon={Plus}>New</Button>
 *       </div>
 *     </div>
 *   </SizeProvider>
 * </div>
 * ```
 *
 * @example
 * # Mixed controls
 *
 * A tab next to a button next to a badge next to a switch lands on the same
 * rhythm at either step — each reads the step from the provider, so none of
 * them is told its size.
 *
 * ```tsx
 * <div className="flex w-full flex-col gap-6">
 *   <SizeProvider size="default">
 *     <div className="flex flex-wrap items-center gap-2">
 *       <Tabs defaultValue="table">
 *         <Tabs.List>
 *           <Tabs.Item value="table" icon={Table2} label="Table" />
 *           <Tabs.Item value="board" icon={SquareKanban} label="Board" />
 *         </Tabs.List>
 *       </Tabs>
 *       <Button variant="tertiary" leadingIcon={ListFilter}>Filter</Button>
 *       <Badge variant="dot" color="green">Synced</Badge>
 *       <Switch label="Live" defaultChecked />
 *     </div>
 *   </SizeProvider>
 *   <SizeProvider size="compact">
 *     <div className="flex flex-wrap items-center gap-1">
 *       <Tabs defaultValue="table">
 *         <Tabs.List>
 *           <Tabs.Item value="table" icon={Table2} label="Table" />
 *           <Tabs.Item value="board" icon={SquareKanban} label="Board" />
 *         </Tabs.List>
 *       </Tabs>
 *       <Button variant="tertiary" leadingIcon={ListFilter}>Filter</Button>
 *       <Badge variant="dot" color="green">Synced</Badge>
 *       <Switch label="Live" defaultChecked />
 *     </div>
 *   </SizeProvider>
 * </div>
 * ```
 *
 * @example
 * # Typography scale
 *
 * Type follows the ladder. Compact drops each role one notch, so a dense
 * screen keeps the same hierarchy at a smaller size.
 *
 * ```tsx
 * <div className="grid w-full gap-8 sm:grid-cols-2">
 *   {[['Default', 0], ['Compact', 1]].map(([step, col]) => (
 *     <div key={step} className="flex min-w-0 flex-col gap-2">
 *       <span className="text-body font-semibold text-foreground">{step}</span>
 *       {[
 *         { role: 'display', px: [28, 24], size: ['text-display', 'text-display-compact'], weight: 'font-bold', sample: 'Fluid Functionalism' },
 *         { role: 'title', px: [16, 15], size: ['text-title', 'text-title-compact'], weight: 'font-semibold', sample: 'Create teamspace' },
 *         { role: 'subtitle', px: [14, 13], size: ['text-subtitle', 'text-subtitle-compact'], weight: 'font-medium', sample: 'Weekly design review' },
 *         { role: 'body', px: [13, 12], size: ['text-body', 'text-body-compact'], weight: 'font-normal', sample: 'The quick brown fox jumps over the lazy dog' },
 *         { role: 'caption', px: [12, 11], size: ['text-caption', 'text-caption-compact'], weight: 'font-normal text-muted-foreground', sample: 'Last updated 4 minutes ago' },
 *       ].map(({ role, px, size, weight, sample }) => (
 *         <div key={role} className="flex items-baseline gap-3 border-b border-border/50 py-2.5">
 *           <span className="w-9 shrink-0 text-body tabular-nums text-muted-foreground">{px[col]}px</span>
 *           <span className={`min-w-0 flex-1 truncate leading-snug text-foreground ${size[col]} ${weight}`}>{sample}</span>
 *           <code className="shrink-0 text-caption">{role}</code>
 *         </div>
 *       ))}
 *     </div>
 *   ))}
 * </div>
 * ```
 *
 * @example
 * # Compact regions
 *
 * Density is a region decision, not a per-control one. Wrap the region in a
 * SizeProvider and everything inside follows — menus included, since React
 * context crosses portals. Here the page stays at the default step and only
 * its filter bar goes compact.
 *
 * ```tsx
 * <div className="flex w-full flex-col items-start gap-4">
 *   <div className="flex flex-wrap items-center gap-2">
 *     <Button leadingIcon={Plus}>New project</Button>
 *     <Button variant="tertiary">Share</Button>
 *   </div>
 *   <SizeProvider size="compact">
 *     <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border p-1">
 *       <Button variant="tertiary" active trailingIcon={ChevronDown}>Last updated</Button>
 *       <Button variant="tertiary" size="icon-compact" aria-label="Filter">
 *         <ListFilter />
 *       </Button>
 *       <Badge color="blue">12 results</Badge>
 *       <Switch label="Archived" />
 *     </div>
 *   </SizeProvider>
 * </div>
 * ```
 *
 * @example
 * # Component size prop
 *
 * Every sized component also takes a per-instance `size` that wins over the
 * surrounding SizeProvider — here one Button and one Badge opt back into the
 * default step inside a compact region.
 *
 * ```tsx
 * <SizeProvider size="compact">
 *   <div className="flex flex-wrap items-center gap-2">
 *     <Button variant="tertiary">Compact · 28px</Button>
 *     <Button size="default">Default · 36px</Button>
 *     <Badge>Compact</Badge>
 *     <Badge size="default">Default</Badge>
 *   </div>
 * </SizeProvider>
 * ```
 *
 * @example
 * # Token reference
 *
 * Every number a sized component renders is one of these tokens, resolved for
 * the active step — `useSize()` hands them out as classes (and `icon` as px).
 *
 * ```tsx
 * <div className="w-full overflow-x-auto">
 *   <table className="w-full min-w-[560px] border-collapse text-body">
 *     <thead>
 *       <tr className="border-b border-border">
 *         {['Token', 'Applies to', 'Default', 'Compact'].map((h) => (
 *           <th key={h} className="px-3 py-2 text-left font-semibold text-foreground first:pl-0">{h}</th>
 *         ))}
 *       </tr>
 *     </thead>
 *     <tbody>
 *       {[
 *         ['control', 'Controls and rows — shared so menu rows line up with their trigger', 'h-9 · 36px', 'h-7 · 28px'],
 *         ['segmentItem + segmentPad', 'Segmented tabs inside their padded list', '28px + 4px = 36px', '24px + 2px = 28px'],
 *         ['text', 'Labels inside controls', '13px', '12px'],
 *         ['icon', 'Leading/trailing icons, checkbox square, radio circle', '16px', '14px'],
 *         ['px / itemPx', 'Control / row horizontal padding', '12px / 8px', '10px / 6px'],
 *         ['gap', 'Icon-to-label and control-to-control gap', '8px', '4px'],
 *       ].map(([token, applies, def, compact]) => (
 *         <tr key={token} className="border-b border-border/50">
 *           <td className="px-3 py-2 first:pl-0"><code className="text-caption">{token}</code></td>
 *           <td className="px-3 py-2 text-muted-foreground">{applies}</td>
 *           <td className="whitespace-nowrap px-3 py-2 text-foreground">{def}</td>
 *           <td className="whitespace-nowrap px-3 py-2 text-foreground">{compact}</td>
 *         </tr>
 *       ))}
 *     </tbody>
 *   </table>
 * </div>
 * ```
 */
export default function SizeProvider({ size, defaultSize = 'default', children }: SizeProviderProps) {
  return (
    <FluidSizeProvider size={size} defaultSize={defaultSize}>
      {children}
    </FluidSizeProvider>
  )
}

export { SizeProvider }
export {
  useSize,
  useSizeVariant,
  useSizeContext,
  useTypeScale,
  sizeMap,
  typeScale,
} from '../../_fluid/lib/size-context'
export type { SizeVariant, SizeClasses, TypeScaleRole, TypeScaleStep } from '../../_fluid/lib/size-context'
export type { SizeProviderProps }
