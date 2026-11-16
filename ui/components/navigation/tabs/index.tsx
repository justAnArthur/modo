/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tabs.tsx` + `registry/base/tabs-subtle.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
  useMemo,
  useState,
} from 'react'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import { TabsContext, type TabsVariant } from './context'
import { TabItem } from './item'
import { TabsList } from './list'

interface TabsProps
  extends Omit<ComponentPropsWithoutRef<typeof TabsPrimitive.Root>, 'onValueChange' | 'value' | 'defaultValue'> {
  /** The active tab's value. Controlled — pair it with `onValueChange`. */
  value?: string
  /** The tab active on first render when uncontrolled. Defaults to the first tab. */
  defaultValue?: string
  /** Called with the new value when the active tab changes. */
  onValueChange?: (value: string) => void
  /** `segmented`: a padded track with an elevated indicator. `subtle`: a borderless strip with a pill. Defaults to `"segmented"`. */
  variant?: TabsVariant
  /** Collapse every tab to its icon; only the selected one shows its label. Needs icons on the tabs. Defaults to `false`. */
  activeLabel?: boolean
  /** Pins the tabs to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** `Tabs.List` and `Tabs.Panel` children. */
  children?: ReactNode
}

type TabsComponent = ForwardRefExoticComponent<TabsProps & RefAttributes<HTMLDivElement>> & {
  List: typeof TabsList
  Item: typeof TabItem
  Panel: typeof TabPanel
}

/**
 * Tabs with a liquid active indicator, fluid hover and spring animations.
 *
 * Built on Base UI Tabs: `Tabs` owns the selection, `Tabs.List` draws the
 * strip and `Tabs.Panel` shows the active tab's content. The selected
 * indicator melts toward the active tab like a drop (see the liquid
 * indicators in Morph), a translucent hover pill drips out of it, and the
 * active label turns semibold without shifting.
 *
 * The `segmented` variant is a padded track whose indicator is lifted three
 * surface levels above whatever it sits on; arrow keys move and select. The
 * `subtle` variant is a borderless strip with a `bg-active` pill and manual
 * activation: arrows move focus, Enter or Space selects. With `activeLabel`
 * the tabs collapse to their icons and the selected one opens its label to a
 * measured width.
 *
 * Link tabs navigate between routes: give each `Tabs.Item` an `href` (or a
 * router link as `render`) and drive `value` from the current route. They
 * keep the liquid indicator and the tab keys; arrows move focus and Enter
 * follows the link.
 *
 * Statics:
 * - `Tabs.List` — the strip holding the tabs.
 * - `Tabs.Item` — one tab: `value`, `label`, optional `icon`, `href` for a link tab.
 * - `Tabs.Panel` — content shown while the tab with the same `value` is active.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/tabs.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      variant = 'segmented',
      activeLabel = false,
      size,
      children,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
    const [fallback, setFallback] = useState<string>()
    const selectedValue = value ?? fallback
    const ctx = useMemo(
      () => ({ variant, activeLabel, selectedValue, setFallback }),
      [variant, activeLabel, selectedValue],
    )

    return (
      <SizeScope size={size}>
        <TabsContext.Provider value={ctx}>
          {/* Always controlled: Base UI warns when `value` turns defined. The
              list reports the first tab before paint. */}
          <TabsPrimitive.Root
            ref={ref}
            value={selectedValue ?? ''}
            onValueChange={next => setValue(next as string)}
            {...props}
          >
            {children}
          </TabsPrimitive.Root>
        </TabsContext.Provider>
      </SizeScope>
    )
  },
) as TabsComponent

Tabs.displayName = 'Tabs'

interface TabPanelProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Panel> {
  /** The value of the tab that shows this panel. */
  value: string
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(({ className, ...props }, ref) => (
  <TabsPrimitive.Panel ref={ref} className={cn('outline-none', className)} {...props} />
))

TabPanel.displayName = 'TabPanel'

Object.assign(Tabs, { List: TabsList, Item: TabItem, Panel: TabPanel })

export type { TabItemProps } from './item'
export type { TabsListProps } from './list'
export type { TabPanelProps, TabsProps, TabsVariant }
export { TabItem, TabPanel, Tabs, TabsList }
export default Tabs
