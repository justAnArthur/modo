/*
 * Mock: the open island on a tab the docs' panel doesn't have yet, after
 * the usual ones. Nothing here ships in the barrel.
 */

'use client'

import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import type { ReactNode } from 'react'
import ExpandedIsland from '../blocks/app/expanded-island'
import Island from '../components/island/island'
import { panelTabs, ScreenEdge } from './island-content'

interface TabIslandProps {
  /** The tab's value. */
  value: string
  /** The tab's title. */
  label: string
  /** The tab's glyph. */
  icon: IconComponent
  /** The tab's view. */
  children: ReactNode
}

/** The open island on a tab of its own, added after the docs' usual ones. */
export function TabIsland({ value, label, icon, children }: TabIslandProps) {
  const tabs = [...panelTabs(), { value, label, icon, content: children }]
  return (
    <ScreenEdge height={260}>
      <Island
        defaultState="expanded"
        collapsedState="idle"
        expanded={<ExpandedIsland tabs={tabs} defaultValue={value} onSettings={() => {}} />}
      />
    </ScreenEdge>
  )
}
