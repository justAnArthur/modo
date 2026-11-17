/*!
 * Mock: the open island with a tab the shared mock tabs don't list yet, so a
 * new widget's examples show it in place. Nothing here ships in the barrel.
 */

'use client'

import type { ReactNode } from 'react'
import ExpandedIsland from '../blocks/app/expanded-island'
import Island from '../components/island/island'
import type { IslandTab } from '../components/island/island-tabs'
import { panelTabs, ScreenEdge } from './island-content'

interface TabIslandProps {
  /** The new tab. */
  tab: IslandTab
  /** Its view. */
  children: ReactNode
  /** The mock tab it takes the place of, else it goes after `after`. */
  replace?: string
  /** The mock tab it follows. Defaults to `'calendar'`. */
  after?: string
  /** The strip of screen's height. Defaults to `260`. */
  height?: number
}

/** The open island on a new tab, among the mock ones. */
export function TabIsland({ tab, children, replace, after = 'calendar', height = 260 }: TabIslandProps) {
  const mine = { ...tab, content: children }
  const others = panelTabs()
  const at = others.findIndex(other => other.value === after) + 1
  const tabs = replace
    ? others.map(other => (other.value === replace ? mine : other))
    : [...others.slice(0, at), mine, ...others.slice(at)]
  return (
    <ScreenEdge height={height}>
      <Island
        defaultState="expanded"
        collapsedState="idle"
        expanded={<ExpandedIsland tabs={tabs} defaultValue={tab.value} onSettings={() => {}} />}
      />
    </ScreenEdge>
  )
}
