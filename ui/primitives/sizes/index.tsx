/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/size-context.tsx` + docs `app/docs/sizes/page.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { type ReactNode, useMemo } from 'react'
import { SizeContext } from '../../lib/size-context'
import { type SizeVariant, sizeMap } from '../../lib/size-scale'
import { useControllableState } from '../../lib/use-controllable-state'

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
 * Select, Tabs, Dropdown, Checkbox, Radio, Input,
 * InputGroup, Copy, Table, Switch, Slider, Accordion, Card, ColorPicker,
 * Calendar and the date and time pickers all
 * take that per-component `size`. Type follows the ladder too: compact drops
 * each type role one notch.
 *
 * Also exported from this item: `SizeScope` (pins a subtree to a component's
 * own `size` prop, and inherits when there is none), `useSize(override?)`, `useSizeVariant(override?)`,
 * `useSizeContext()` (`{ size, setSize }` inside a provider), `useTypeScale(override?)`,
 * the `sizeMap` and `typeScale` tables, and the `SizeVariant`, `SizeClasses`,
 * `TypeScaleRole`, `TypeScaleStep` types.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/lib/size-context.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
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
  const [resolved, setSize] = useControllableState<SizeVariant>(size, defaultSize)

  const value = useMemo(() => ({ size: resolved, setSize, classes: sizeMap[resolved] }), [resolved, setSize])

  return <SizeContext.Provider value={value}>{children}</SizeContext.Provider>
}

/**
 * Pins its subtree to `size` when one is given, and changes nothing when it
 * isn't: the wrapper for a component's own `size` prop. A bare
 * `SizeProvider` would reset the subtree to its `defaultSize` instead of
 * inheriting.
 */
function SizeScope({ size, children }: { size?: SizeVariant; children: ReactNode }) {
  return size ? <SizeProvider size={size}>{children}</SizeProvider> : children
}

export { useSize, useSizeContext, useSizeVariant, useTypeScale } from '../../lib/size-context'
export type { SizeClasses, SizeVariant, TypeScaleRole, TypeScaleStep } from '../../lib/size-scale'
export { sizeMap, typeScale } from '../../lib/size-scale'
export { SizeProvider, SizeScope }
