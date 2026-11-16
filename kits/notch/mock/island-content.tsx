/*!
 * Mock: what the docs put in the island, on the kit's blocks and mock data:
 * the now-playing wings, a timer bubble, a charging flash and the open
 * island with a tab per widget. Pages and examples start from these; nothing
 * here ships in the barrel.
 */

'use client'

import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { type ReactNode, useState } from 'react'
import Agenda from '../blocks/agenda'
import Controls from '../blocks/controls'
import Devices from '../blocks/devices'
import ExpandedIsland, { type ExpandedIslandTab } from '../blocks/expanded-island'
import NowPlaying, { type NowPlayingTrack } from '../blocks/now-playing'
import PowerAlert from '../blocks/power-alert'
import Shelf, { type ShelfFile } from '../blocks/shelf'
import SystemStats from '../blocks/system-stats'
import Timer, { type TimerRun } from '../blocks/timer'
import Island from '../components/island'
import { ISLAND_STATES, type IslandState } from '../lib/geometry'
import { MockArtwork } from './artwork'
import { AGENDA_NOW, DEVICES, EVENTS, FILES, POWER, SAMPLES, TABS, TIMER, TRACK } from './data'
import { useFitScale } from './fit'

const MINUTE = 60_000

/** The mock track, with generated artwork. */
export const PLAYING: NowPlayingTrack = { ...TRACK, artwork: <MockArtwork /> }

/** The mock shelf, two files with previews. */
export const SHELF: ShelfFile[] = FILES.map(file =>
  file.id === 'cover'
    ? { ...file, thumbnail: <MockArtwork variant="dusk" /> }
    : file.id === 'demo'
      ? { ...file, thumbnail: <MockArtwork variant="night" /> }
      : file,
)

/** A focus run with `left` of its length to go, from now. */
export function focusRun(left = 0.62, minutes = TIMER.minutes): TimerRun {
  return { kind: 'focus', total: minutes * MINUTE, endsAt: Date.now() + left * minutes * MINUTE }
}

/** A run made once, when the component mounts, so it keeps counting down across renders. */
export function useRun(left?: number) {
  return useState(() => focusRun(left))[0]
}

/** The now-playing glyph for the compact island's left wing. */
export function ArtworkTile() {
  return <NowPlaying.Leading track={PLAYING} />
}

/** The timer's ring for the split bubble. */
export function TimerBubble() {
  return <Timer.Minimal run={useRun()} />
}

/** The charging alert, for the island's `flash`. */
export function ChargingFlash() {
  return <PowerAlert kind="charging" level={POWER.level} minutes={POWER.untilFull} />
}

/** Every widget of the open island, by tab value. */
export function widgetFor(tab: string): ReactNode {
  if (tab === 'now-playing') return <NowPlaying track={PLAYING} />
  if (tab === 'timer') return <Timer />
  if (tab === 'calendar') return <Agenda events={EVENTS} now={AGENDA_NOW} />
  if (tab === 'shelf') return <Shelf defaultValue={SHELF} onAirDrop={() => {}} />
  if (tab === 'controls')
    return <Controls defaultValue={{ volume: 0.6, brightness: 0.8, keyboard: 0.35 }} output="MacBook Pro Speakers" />
  if (tab === 'devices') return <Devices devices={DEVICES} />
  if (tab === 'stats') return <SystemStats samples={SAMPLES} />
  return null
}

const WIDGET_TABS: ExpandedIslandTab[] = TABS.map(tab => ({ ...tab, content: widgetFor(tab.value) }))

/** The open island's tabs, a view per widget, with `views` in place of the mock ones. */
export function panelTabs(views: Record<string, ReactNode> = {}): ExpandedIslandTab[] {
  return WIDGET_TABS.map(tab => (tab.value in views ? { ...tab, content: views[tab.value] } : tab))
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
      trailing={<NowPlaying.Trailing />}
      minimal={<TimerBubble />}
      flash={<ChargingFlash />}
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

/**
 * The top of a screen: a band the island hangs from, tall enough for what it
 * shows. Narrower than `width`, it scales down whole, so the island keeps the
 * proportions it has on a Mac.
 */
export function ScreenEdge({
  children,
  height = 360,
  width = 760,
}: {
  children: ReactNode
  height?: number
  width?: number
}) {
  const { outer, scale } = useFitScale(width)
  return (
    <div ref={outer} className="w-full" style={{ height: height * scale }}>
      <div
        className="relative mx-auto overflow-hidden rounded-box bg-sunken"
        style={{ width: scale < 1 ? width : '100%', maxWidth: width, height, zoom: scale }}
      >
        {children}
      </div>
    </div>
  )
}

/** The open island on a strip of screen, on `tab`, its view replaced by `children` when given. */
export function WidgetIsland({ tab, children, height = 340 }: { tab: string; children?: ReactNode; height?: number }) {
  const tabs = panelTabs(children ? { [tab]: children } : {})
  return (
    <ScreenEdge height={height}>
      <Island
        defaultState="expanded"
        collapsedState="idle"
        expanded={<ExpandedIsland tabs={tabs} defaultValue={tab} onSettings={() => {}} />}
      />
    </ScreenEdge>
  )
}

/** A flash below the notch, on a strip of screen. */
export function FlashIsland({ children, activity }: { children: ReactNode; activity?: string }) {
  return (
    <ScreenEdge height={112}>
      <Island defaultState="flash" collapsedState="idle" flash={children} activity={activity} />
    </ScreenEdge>
  )
}

/** An activity in the compact island's wings, with a second one's bubble when `minimal` is given. */
export function WingsIsland({
  leading,
  trailing,
  minimal,
}: {
  leading: ReactNode
  trailing: ReactNode
  minimal?: ReactNode
}) {
  return (
    <ScreenEdge height={64}>
      <Island defaultState={minimal ? 'split' : 'compact'} leading={leading} trailing={trailing} minimal={minimal} />
    </ScreenEdge>
  )
}

/** Lays `children` out at `width` and scales them down whole when the column is narrower. */
export function Fit({ width, children }: { width: number; children: ReactNode }) {
  const { outer, scale } = useFitScale(width)
  return (
    <div ref={outer} className="flex w-full justify-center">
      <div className="shrink-0" style={{ width: scale < 1 ? width : '100%', maxWidth: width, zoom: scale }}>
        {children}
      </div>
    </div>
  )
}
