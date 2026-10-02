/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/size-context.tsx` + docs `app/docs/sizes/page.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The implementation stays in `lib/size-context.tsx` (vendored, shared by
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
import { SizeProvider as FluidSizeProvider } from '../../lib/size-context'

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
 * @example {@include ./examples.mdx}
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
} from '../../lib/size-context'
export type { SizeVariant, SizeClasses, TypeScaleRole, TypeScaleStep } from '../../lib/size-context'
export type { SizeProviderProps }
