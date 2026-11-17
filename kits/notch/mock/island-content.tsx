/*!
 * Mock: what the docs put in the island, on the kit's blocks and mock data:
 * the now-playing wings, a Pomodoro ring in the bubble, a download's flash
 * and the open island with a tab per widget. Pages and examples start from
 * these; nothing here ships in the barrel.
 */

'use client'

import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { type ReactNode, useState } from 'react'
import Agenda from '../blocks/activities/agenda'
import Clock from '../blocks/activities/clock'
import NowPlaying from '../blocks/activities/now-playing'
import Weather from '../blocks/activities/weather'
import ExpandedIsland, { type ExpandedIslandTab } from '../blocks/app/expanded-island'
import ClipboardHistory from '../blocks/system/clipboard'
import RecentFiles from '../blocks/system/recent-files'
import SystemStats from '../blocks/system/system-stats'
import Island from '../components/island/island'
import type { WidgetLayout } from '../components/island/widget'
import { ISLAND_STATES, type IslandState } from '../lib/geometry'
import { PLAYING } from './artwork'
import { CLIP_NOW, CLIPS, PINNED } from './clipboard'
import { useRun, ZONES } from './clock'
import { AGENDA_NOW, EVENTS, TABS } from './data'
import { DOWNLOADS, FILES_NOW, RECENT_FILES } from './files'
import { ScreenEdge } from './screen'
import { BATTERY, DISK, PROCESSES, READINGS, UPTIME } from './system'
import { FORECAST } from './weather'

export { PLAYING } from './artwork'
export { Fit, FlashIsland, ScreenEdge, WingsIsland } from './screen'

/** The now-playing glyph for the compact island's left wing. */
export function ArtworkTile() {
  return <NowPlaying.Leading track={PLAYING} />
}

/** A focus round's ring for the split bubble, 62% to go. */
export function PomodoroBubble() {
  return <Clock.Minimal run={useRun()} />
}

/** A download landing, for the island's `flash`. */
export function DownloadedFlash() {
  return <RecentFiles.Saved file={DOWNLOADS[0]!} onOpen={() => {}} />
}

const noop = () => {}

/** Every widget of the open island, by tab value. */
export function widgetFor(tab: string, layout: WidgetLayout = 'fit'): ReactNode {
  if (tab === 'now-playing')
    return <NowPlaying track={PLAYING} defaultShuffle={false} defaultRepeat="all" defaultLiked layout={layout} />
  if (tab === 'calendar') return <Agenda events={EVENTS} now={AGENDA_NOW} layout={layout} />
  if (tab === 'weather') return <Weather {...FORECAST} onRefresh={noop} layout={layout} />
  if (tab === 'clock') return <Clock zones={ZONES} completedToday={3} layout={layout} />
  if (tab === 'system')
    return (
      <SystemStats
        samples={READINGS}
        battery={BATTERY}
        disk={DISK}
        uptime={UPTIME}
        processes={PROCESSES}
        layout={layout}
      />
    )
  if (tab === 'clipboard')
    return <ClipboardHistory clips={CLIPS} defaultPinned={PINNED} now={CLIP_NOW} onDelete={noop} layout={layout} />
  if (tab === 'files')
    return (
      <RecentFiles
        files={RECENT_FILES}
        now={FILES_NOW}
        onReveal={noop}
        onCopy={noop}
        onDelete={noop}
        onClear={noop}
        layout={layout}
      />
    )
  return null
}

const WIDGET_TABS: ExpandedIslandTab[] = TABS.map(tab => ({ ...tab, content: widgetFor(tab.value) }))
const TALL_TABS: ExpandedIslandTab[] = TABS.map(tab => ({ ...tab, content: widgetFor(tab.value, 'tall') }))

/** The open island's tabs, a view per widget at `layout`, with `views` in place of the mock ones. */
export function panelTabs(views: Record<string, ReactNode> = {}, layout: WidgetLayout = 'fit'): ExpandedIslandTab[] {
  return (layout === 'tall' ? TALL_TABS : WIDGET_TABS).map(tab =>
    tab.value in views ? { ...tab, content: views[tab.value] } : tab,
  )
}

/** The open island: a tab per widget in the wings, settings at the far right. */
export function ExpandedPanel({ defaultTab = 'now-playing' }: { defaultTab?: string }) {
  return <ExpandedIsland tabs={WIDGET_TABS} defaultValue={defaultTab} onSettings={() => {}} />
}

type DemoIslandProps = Omit<
  React.ComponentProps<typeof Island>,
  'leading' | 'trailing' | 'minimal' | 'flash' | 'expanded'
> & { defaultTab?: string }

/** Every slot filled, so any state shows something: the docs' island. */
export function DemoIsland({ defaultTab, ...props }: DemoIslandProps) {
  return (
    <Island
      leading={<ArtworkTile />}
      trailing={<NowPlaying.Trailing track={PLAYING} />}
      minimal={<PomodoroBubble />}
      flash={<DownloadedFlash />}
      expanded={<ExpandedPanel defaultTab={defaultTab} />}
      activity="now-playing"
      {...props}
    />
  )
}

const STATE_LABEL: Record<IslandState, string> = {
  idle: 'Idle',
  compact: 'Compact',
  split: 'Split',
  expanded: 'Expanded',
  flash: 'Flash',
}

/** A strip of screen edge with the island hanging from it, and the five states to pick from below. */
export function IslandPlayground({ defaultState = 'compact' }: { defaultState?: IslandState }) {
  const [state, setState] = useState<IslandState>(defaultState)
  const size = useSize()
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <ScreenEdge>
        <DemoIsland state={state} onStateChange={setState} expandOnHover />
      </ScreenEdge>
      <Tabs variant="subtle" value={state} onValueChange={v => setState(v as IslandState)} size={size.variant}>
        <Tabs.List className="max-w-full overflow-x-auto scrollbar-hide">
          {ISLAND_STATES.map(s => (
            <Tabs.Item key={s} value={s} label={STATE_LABEL[s]} />
          ))}
        </Tabs.List>
      </Tabs>
    </div>
  )
}

/** The open island on a strip of screen, on `tab`, its view replaced by `children` when given; `tall` pulls it down to the 560 px sheet. */
export function WidgetIsland({
  tab,
  children,
  height,
  tall = false,
}: {
  tab: string
  children?: ReactNode
  height?: number
  tall?: boolean
}) {
  const tabs = panelTabs(children ? { [tab]: children } : {}, tall ? 'tall' : 'fit')
  return (
    <ScreenEdge height={height ?? (tall ? 580 : 260)}>
      <Island
        defaultState="expanded"
        collapsedState="idle"
        panelHeight={tall ? 560 : undefined}
        expanded={<ExpandedIsland tabs={tabs} defaultValue={tab} onSettings={() => {}} />}
      />
    </ScreenEdge>
  )
}
