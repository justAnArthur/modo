/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tabs.tsx` + `registry/base/tabs-subtle.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { createContext, type Dispatch, type SetStateAction, useContext } from 'react'

type TabsVariant = 'segmented' | 'subtle'

interface TabsContextValue {
  variant: TabsVariant
  activeLabel: boolean
  selectedValue: string | undefined
  /** The first tab's value: selected while nothing else is. */
  setFallback: Dispatch<SetStateAction<string | undefined>>
}

interface TabsListContextValue {
  registerTab: (index: number, element: HTMLElement | null) => void
  hoveredIndex: number | null
  /** Moves the indicator on press, before a controlled `value` catches up. */
  setOptimisticIndex: (index: number) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)
const TabsListContext = createContext<TabsListContextValue | null>(null)

function useTabs(part: string) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error(`${part} must be used within Tabs`)
  return ctx
}

function useTabsList() {
  const ctx = useContext(TabsListContext)
  if (!ctx) throw new Error('Tabs.Item must be used within Tabs.List')
  return ctx
}

export type { TabsContextValue, TabsListContextValue, TabsVariant }
export { TabsContext, TabsListContext, useTabs, useTabsList }
