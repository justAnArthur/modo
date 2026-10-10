/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/size-context.tsx` + docs `app/docs/sizes/page.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `SizeProvider` moved here from `lib/size-context.tsx` (which keeps the
 *   context, hooks and maps every sized component reads) so modo documents it;
 *   its props are written inline with docs. Sized components import it from
 *   here. The hooks, maps and types are re-exported.
 * - The docs page's live demos (toolbar ladder, compact-region callout, token
 *   inspector overlay, type-scale specimen) are rewritten as static examples;
 *   Select, TabsSubtle, InputGroup, CheckboxGroup and Dropdown in upstream's demos
 *   are swapped for Button, Badge, Switch and Tabs; the inspector overlay is dropped.
 * - The token table and type scale are written out in the examples (values
 *   mirror `sizeMap` / `typeScale`) instead of being rendered from them.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; inline `fontVariationSettings` → `weight-*`.
 */

import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { SizeContext, type SizeVariant, sizeMap } from '../../lib/size-context'

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
 * the component > nearest `SizeProvider` > `'default'`. Button, Badge,
 * Select, Tabs, TabsSubtle, Dropdown, CheckboxGroup, RadioGroup, Input,
 * InputGroup, InputCopy, InputMessage, Table, Switch, Slider, Accordion, Card,
 * ColorPicker, ThinkingIndicator, Calendar and the date and time pickers all
 * take that per-component `size`. Type follows the ladder too: compact drops
 * each type role one notch.
 *
 * Also exported from this item: `useSize(override?)`, `useSizeVariant(override?)`,
 * `useSizeContext()` (`{ size, setSize }` inside a provider), `useTypeScale(override?)`,
 * the `sizeMap` and `typeScale` tables, and the `SizeVariant`, `SizeClasses`,
 * `TypeScaleRole`, `TypeScaleStep` types.
 *
 * @example {@include ./examples.mdx}
 */
export default function SizeProvider({
  children,
  size,
  defaultSize = 'default',
}: {
  /** The region whose controls follow the step — popups opened from inside it included. */
  children: ReactNode
  /** Controlled variant — pins every control in the subtree to one step, overriding internal state. `'default'` is 36px controls, `'compact'` is 28px. */
  size?: 'default' | 'compact'
  /** Uncontrolled initial variant, switchable via `useSizeContext().setSize`. Defaults to `'default'`. */
  defaultSize?: 'default' | 'compact'
}) {
  const [internalSize, setInternalSize] = useState<SizeVariant>(defaultSize)
  const isControlled = size !== undefined
  const resolved = size ?? internalSize

  // Controlled providers ignore setSize entirely — a background write to the
  // shadowed internal state would pop back out if the size prop were later
  // removed.
  const setSize = useCallback(
    (next: SizeVariant) => {
      if (isControlled) return
      setInternalSize(next)
    },
    [isControlled],
  )

  const value = useMemo(() => ({ size: resolved, setSize, classes: sizeMap[resolved] }), [resolved, setSize])

  return <SizeContext.Provider value={value}>{children}</SizeContext.Provider>
}

export type { SizeClasses, SizeVariant, TypeScaleRole, TypeScaleStep } from '../../lib/size-context'
export {
  sizeMap,
  typeScale,
  useSize,
  useSizeContext,
  useSizeVariant,
  useTypeScale,
} from '../../lib/size-context'
export { SizeProvider }
