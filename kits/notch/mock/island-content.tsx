/*!
 * Mock: what the docs put in the island, on the kit's components and mock
 * data: a now-playing wing glyph, a timer bubble, a charging flash and the
 * open panel with its tabs. Pages and blocks can start from these; nothing
 * here ships.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Meter from '@justanarthur/modo-ui/components/meter'
import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/sizes'
import { Music, Pause, Play, Settings, SkipBack, SkipForward, Zap } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import BatteryGlyph from '../components/battery-glyph'
import Countdown from '../components/countdown'
import Equalizer from '../components/equalizer'
import Island from '../components/island'
import IslandFlash from '../components/island-flash'
import IslandTabs from '../components/island-tabs'
import MediaScrubber from '../components/media-scrubber'
import { INSET, ISLAND_STATES, type IslandState } from '../lib/geometry'
import { useIsland } from '../lib/island-context'
import { EVENTS, POWER, TABS, TIMER, TRACK } from './data'
import { useFitScale } from './fit'

/** A square standing in for a track's artwork: no image, a tile one surface up. */
export function ArtworkTile({ className = 'size-5.5 rounded-glyph' }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center bg-surface-3 text-muted-foreground ${className}`}>
      <Music size={12} strokeWidth={1.5} />
    </span>
  )
}

/** The timer's ring for the split bubble. */
export function TimerBubble() {
  return <Meter variant="ring" label="Focus" value={0.62} tone="default" animate={false} className="size-5" />
}

/** The charging alert, for the island's `flash`. */
export function ChargingFlash() {
  return (
    <IslandFlash
      icon={<Zap size={18} strokeWidth={1.5} fill="currentColor" />}
      tone="success"
      title="Charging"
      caption={POWER.untilFull}
      value={`${POWER.level}%`}
      trailing={<BatteryGlyph level={POWER.level} charging />}
    />
  )
}

function Player() {
  const [playing, setPlaying] = useState(true)
  return (
    <div className="flex size-full items-center gap-5">
      <ArtworkTile className="size-24 rounded-2xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-subtitle weight-semibold text-foreground">{TRACK.title}</span>
            <span className="truncate text-caption text-muted-foreground">{TRACK.artist}</span>
          </div>
          <Equalizer playing={playing} />
        </div>
        <MediaScrubber position={TRACK.position} duration={TRACK.duration} playing={playing} />
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Previous">
            <SkipBack size={16} strokeWidth={1.5} fill="currentColor" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? (
              <Pause size={18} strokeWidth={1.5} fill="currentColor" />
            ) : (
              <Play size={18} strokeWidth={1.5} fill="currentColor" />
            )}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next">
            <SkipForward size={16} strokeWidth={1.5} fill="currentColor" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function TimerWidget() {
  return (
    <div className="flex size-full items-center justify-center gap-5">
      <Meter
        variant="ring"
        label={TIMER.label}
        value={0.62}
        tone="default"
        animate={false}
        className="size-20 text-subtitle"
      >
        <Countdown duration={TIMER.minutes * 60_000 * 0.62} />
      </Meter>
      <div className="flex flex-col">
        <span className="text-subtitle weight-semibold text-foreground">{TIMER.label}</span>
        <span className="text-caption text-muted-foreground">{TIMER.minutes} min session</span>
      </div>
    </div>
  )
}

function CalendarWidget() {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {EVENTS.map(event => (
        <li key={event.title} className="flex items-center gap-3 rounded-box bg-surface-2 px-3 py-2">
          <span className="w-10 shrink-0 text-caption tabular-nums text-muted-foreground">{event.time}</span>
          <span className="min-w-0 flex-1 truncate text-body text-foreground">{event.title}</span>
          {event.place && <span className="shrink-0 text-caption text-muted-foreground">{event.place}</span>}
        </li>
      ))}
    </ul>
  )
}

const WIDGETS: Record<string, () => ReactNode> = {
  'now-playing': Player,
  timer: TimerWidget,
  calendar: CalendarWidget,
}

/**
 * The open island: icon tabs in the wings with settings at the far right, the
 * tab's title (the hovered one's as a preview) and its widget.
 */
export function ExpandedPanel({ defaultTab = 'now-playing' }: { defaultTab?: string }) {
  const island = useIsland()
  const [tab, setTab] = useState(defaultTab)
  const [hovered, setHovered] = useState<string | null>(null)
  const title = TABS.find(t => t.value === (hovered ?? tab))?.label
  const Widget = WIDGETS[tab]
  const notch = island?.geometry.notch.height ?? 32

  return (
    <div className="flex size-full flex-col">
      <SizeProvider size="compact">
        <div className="flex shrink-0 items-center" style={{ height: notch, paddingInline: INSET }}>
          <IslandTabs
            tabs={TABS}
            value={tab}
            onValueChange={setTab}
            onHoverChange={setHovered}
            trailing={
              <Button variant="ghost" size="icon-compact" aria-label="Settings">
                <Settings size={14} strokeWidth={1.5} />
              </Button>
            }
          />
        </div>
      </SizeProvider>
      <div className="flex min-h-0 flex-1 flex-col pb-3" style={{ paddingInline: INSET }}>
        <div className="flex h-6 shrink-0 items-end">
          <span className="truncate text-caption weight-medium text-muted-foreground">{title}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {Widget ? (
            <Widget />
          ) : (
            <div className="flex size-full items-center justify-center text-caption text-muted-foreground">
              Nothing here yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Every slot filled, so any state shows something: the docs' island. */
export function DemoIsland(
  props: Omit<React.ComponentProps<typeof Island>, 'leading' | 'trailing' | 'minimal' | 'flash' | 'expanded'>,
) {
  return (
    <Island
      leading={<ArtworkTile />}
      trailing={<Equalizer />}
      minimal={<TimerBubble />}
      flash={<ChargingFlash />}
      expanded={<ExpandedPanel />}
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
        <Tabs.List>
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
