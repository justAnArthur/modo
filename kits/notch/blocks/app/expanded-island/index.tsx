/*!
 * Local addition: the open island's layout, tabs in the wings, the tab's
 * title and its view. Rebuilt from Just Notch's runtime
 * (`island/expanded.tsx`) as a presentational block: tabs and their views
 * come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/systems/sizes'
import { Settings } from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import IslandTabs, { type IslandTab } from '../../../components/island/island-tabs'
import { DEFAULT_NOTCH, INSET } from '../../../lib/geometry'
import { useIsland } from '../../../lib/island-context'
import { contentEnter, contentHidden, contentShown } from '../../../lib/motion'

interface ExpandedIslandTab extends IslandTab {
  /** The tab's view, in the content area. */
  content: ReactNode
}

interface ExpandedIslandProps {
  /** The tabs, in order, each with its view. */
  tabs: ExpandedIslandTab[]
  /** The selected tab's value (controlled). */
  value?: string
  /** The tab selected at first (uncontrolled). Defaults to the first tab. */
  defaultValue?: string
  /** Called with the value of the tab a press or an arrow key selects. */
  onValueChange?: (value: string) => void
  /** Called by the settings button at the right wing's far end; without it the button hides. */
  onSettings?: () => void
  /** The settings button's accessible name. Defaults to `'Settings'`. */
  settingsLabel?: string
  /** What the content area says without tabs. Defaults to `'Nothing here yet'`. */
  empty?: ReactNode
  /** Classes for the root, which fills the open island. */
  className?: string
}

/**
 * The open island's layout: icon tabs in the wings around the notch, the
 * tab's title under them, and its view in a content area of fixed height.
 *
 * The header is the notch's height, so the tabs sit in the wings beside the
 * hardware notch: the kit's IslandTabs at the compact step, with a settings
 * button at the right wing's far end when `onSettings` is given. Under it
 * the selected tab's title, or the hovered tab's as a preview. The view
 * fills the rest: the area keeps its height whatever the view holds, and a
 * taller view scrolls inside it, its edges fading with `scroll-fade` (a
 * modo-ui ScrollArea), back at the top on each new tab, where the new view
 * sharpens in the way the island swaps its content. Every part starts at
 * the island's one inset, clear of its rounded bottom corners.
 *
 * The views are made for the area the default panel leaves (about 680 × 165
 * at 720 × 240): build each one on the kit's Widget frame, so every tab has
 * one hero set large, a muted line, its facts and quiet actions in the same
 * places.
 *
 * Pass it as the Island's `expanded`; it reads the notch from the Island.
 * Selection runs through `value` / `onValueChange`, or is kept here from
 * `defaultValue`.
 *
 * @example {@include ./examples.mdx}
 */
export default function ExpandedIsland({
  tabs,
  value: valueProp,
  defaultValue,
  onValueChange,
  onSettings,
  settingsLabel = 'Settings',
  empty = 'Nothing here yet',
  className,
}: ExpandedIslandProps) {
  const island = useIsland()
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? tabs[0]?.value, onValueChange)
  const [hovered, setHovered] = useState<string | null>(null)
  const tab = tabs.find(t => t.value === value) ?? tabs[0]
  const title = tabs.find(t => t.value === hovered)?.label ?? tab?.label
  const notch = island?.geometry.notch.height ?? DEFAULT_NOTCH.height
  const reduced = useReduceMotion()

  return (
    <div className={cn('flex size-full flex-col', className)}>
      <SizeProvider size="compact">
        <div className="flex shrink-0 items-center" style={{ height: notch, paddingInline: INSET }}>
          {tabs.length > 0 ? (
            <IslandTabs
              tabs={tabs}
              value={tab?.value}
              onValueChange={setValue}
              onHoverChange={setHovered}
              trailing={
                onSettings && (
                  <Button variant="ghost" size="icon-compact" aria-label={settingsLabel} onClick={onSettings}>
                    <Settings size={14} strokeWidth={1.5} />
                  </Button>
                )
              }
            />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </SizeProvider>
      <div className="flex min-h-0 flex-1 flex-col pb-3">
        <div className="flex h-6 shrink-0 items-end" style={{ paddingInline: INSET }}>
          <span className="truncate text-caption weight-medium text-muted-foreground">{title}</span>
        </div>
        <ScrollArea
          key={tab?.value}
          className="min-h-0 flex-1"
          viewportClassName="scroll-fade [&>div]:flex [&>div]:min-h-full [&>div]:flex-col"
        >
          <motion.div
            className="flex flex-1 flex-col py-1 [&>*]:flex-1"
            style={{ paddingInline: INSET }}
            initial={reduced ? { opacity: 0 } : contentHidden}
            animate={reduced ? { opacity: 1 } : contentShown}
            transition={contentEnter}
          >
            {tab ? (
              tab.content
            ) : (
              <div className="flex items-center justify-center text-caption text-muted-foreground">{empty}</div>
            )}
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  )
}

export type { ExpandedIslandProps, ExpandedIslandTab }
export { ExpandedIsland }
