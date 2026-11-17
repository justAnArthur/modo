/*!
 * Local addition: a notch app's system load, the busiest figure as the hero
 * with its trend, the rest as facts and the busiest processes beside it.
 * Rebuilt from Just Notch's stats plugin (`System`, `Tile`, `Measuring`,
 * `CpuLoad`) on the kit's Widget frame and modo-ui's Sparkline and Meter:
 * the readings come in as props.
 */

'use client'

import Sparkline, { type SparklineTone } from '@justanarthur/modo-ui/components/data-display/sparkline'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import type { SizeVariant } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Cpu,
  HardDrive,
  MemoryStick,
} from 'lucide-react'
import Widget from '../../../components/island/widget'

/** One reading of the system. */
interface StatsSample {
  /** CPU load, from 0 to 1. */
  cpu: number
  /** Memory in use, in bytes. */
  memoryUsed: number
  /** All the memory, in bytes. */
  memoryTotal: number
  /** Memory pressure, from 0 to 1, as the system judges it; without it the share in use stands in. */
  memoryPressure?: number
  /** Network in, in bytes per second. */
  netIn: number
  /** Network out, in bytes per second. */
  netOut: number
}

interface StatsBattery {
  /** The charge, in percent (0 to 100). */
  level: number
  /** A charger is connected. */
  charging?: boolean
  /** Minutes until full while charging, else until empty. */
  minutesLeft?: number
}

interface StatsDisk {
  /** Free space on the startup disk, in bytes. */
  free: number
  /** The disk's size, in bytes. */
  total: number
}

interface StatsProcess {
  /** What tells it apart: its pid. */
  id: string
  /** The app or process name. */
  name: string
  /** Its share of the CPU, from 0 to 1. */
  cpu: number
  /** The memory it holds, in bytes. */
  memory?: number
}

type StatsHero = 'cpu' | 'memory'

interface SystemStatsProps {
  /** The readings so far, oldest first; the latest is the figure, all of them the trend. Without any, it is still measuring. */
  samples: StatsSample[]
  /** Which figure is the hero: the CPU load, or memory pressure when memory is what's tight. Defaults to `'cpu'`. */
  hero?: StatsHero
  /** The battery, on a laptop. */
  battery?: StatsBattery
  /** The startup disk's free space. */
  disk?: StatsDisk
  /** Seconds since the last boot. */
  uptime?: number
  /** The busiest processes, in any order: the top three list beside the hero, by CPU. */
  processes?: StatsProcess[]
  /** Step on the size ladder. Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root, which fills its container. */
  className?: string
}

/** Processes listed before the count of the rest. */
const ROWS = 3

const percent = (v: number) => `${Math.round(v * 100)}%`
const share = (v: number) => (v < 0.1 ? `${(v * 100).toFixed(1)}%` : percent(v))

/** Bytes as `11.4 GB`, `640 MB` or `212 GB`. */
function bytes(n: number) {
  if (n >= 100e9) return `${Math.round(n / 1e9)} GB`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  return `${Math.round(n / 1e6)} MB`
}

/** Bytes per second as `2.4 MB/s`, `512 KB/s` or `80 B/s`. */
function rate(bps: number) {
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} MB/s`
  if (bps >= 1e3) return `${Math.round(bps / 1e3)} KB/s`
  return `${Math.round(bps)} B/s`
}

/** Seconds as `3 d 4 h`, `5 h 12 min` or `12 min`. */
function span(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days) return `${days} d ${hours % 24} h`
  if (hours) return `${hours} h ${minutes % 60} min`
  return `${minutes} min`
}

/** Minutes as `3:40`. */
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, '0')}`

/** The status a load reads as: calm, then the warning hue, then the error hue. */
function toneOf(load: number): SparklineTone {
  if (load >= 0.9) return 'error'
  if (load >= 0.75) return 'warning'
  return 'current'
}

function verdict(load: number) {
  if (load >= 0.9) return 'Under strain'
  if (load >= 0.6) return 'Busy'
  if (load >= 0.2) return 'Steady'
  return 'Idle'
}

const pressureOf = (sample: StatsSample) => sample.memoryPressure ?? sample.memoryUsed / sample.memoryTotal

function batteryIcon({ level, charging }: StatsBattery) {
  if (charging) return BatteryCharging
  if (level <= 20) return BatteryLow
  if (level <= 70) return BatteryMedium
  return BatteryFull
}

function BatteryItem({ battery }: { battery: StatsBattery }) {
  const left = battery.minutesLeft === undefined ? undefined : clock(battery.minutesLeft)
  return (
    <Widget.MetaItem icon={batteryIcon(battery)}>
      {battery.level}%{left && ` · ${left} ${battery.charging ? 'to full' : 'left'}`}
    </Widget.MetaItem>
  )
}

interface FactsProps {
  last?: StatsSample
  hero: StatsHero
  battery?: StatsBattery
  disk?: StatsDisk
}

/** Everything but the hero, as two rows of glyph and words. */
function Facts({ last, hero, battery, disk }: FactsProps) {
  const dash = '–'
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Widget.Meta>
        {hero === 'cpu' ? (
          <Widget.MetaItem icon={MemoryStick}>
            {last ? `${bytes(last.memoryUsed)} of ${bytes(last.memoryTotal)}` : dash}
          </Widget.MetaItem>
        ) : (
          <Widget.MetaItem icon={Cpu}>{last ? `${percent(last.cpu)} CPU` : dash}</Widget.MetaItem>
        )}
        <Widget.MetaItem icon={ArrowDown}>{last ? rate(last.netIn) : dash}</Widget.MetaItem>
        <Widget.MetaItem icon={ArrowUp}>{last ? rate(last.netOut) : dash}</Widget.MetaItem>
      </Widget.Meta>
      {(battery || disk) && (
        <Widget.Meta>
          {battery && <BatteryItem battery={battery} />}
          {disk && <Widget.MetaItem icon={HardDrive}>{bytes(disk.free)} free</Widget.MetaItem>}
        </Widget.Meta>
      )}
    </div>
  )
}

function Processes({ processes }: { processes: StatsProcess[] }) {
  const top = [...processes].sort((a, b) => b.cpu - a.cpu)
  const more = top.length - ROWS
  return (
    <Widget.Section label="Top processes" trailing={<span>CPU · memory</span>}>
      {top.slice(0, ROWS).map(process => (
        <Widget.Row
          key={process.id}
          leading={share(process.cpu)}
          trailing={process.memory !== undefined && bytes(process.memory)}
        >
          {process.name}
        </Widget.Row>
      ))}
      {more > 0 && (
        <span className="flex h-6 items-center pl-17.5 text-caption text-muted-foreground">{more} more</span>
      )}
    </Widget.Section>
  )
}

/** The compact island's left wing: the CPU glyph. */
function SystemStatsLeading() {
  return <Cpu size={16} strokeWidth={1.5} className="text-muted-foreground" />
}

/** The compact island's right wing: the CPU load, a dash until the first reading. */
function SystemStatsTrailing({ sample }: { sample?: StatsSample }) {
  if (!sample) return <span className="text-caption weight-semibold text-muted-foreground">–</span>
  return <span className="text-caption weight-semibold tabular-nums text-foreground">{percent(sample.cpu)}</span>
}

/** The split island's bubble: the CPU load as a ring, in the warning hue from 75% and the error hue from 90%. */
function SystemStatsMinimal({ sample }: { sample?: StatsSample }) {
  const load = sample?.cpu ?? 0
  return (
    <Meter
      variant="ring"
      className="size-5.5"
      size="compact"
      value={load}
      label={sample ? `CPU, ${percent(load)}` : 'CPU, measuring'}
    />
  )
}

/**
 * A notch app's system load: the busiest figure as the hero with its trend,
 * the rest as facts, and the processes behind it.
 *
 * The hero is the CPU load, set large, with every reading so far as a
 * modo-ui Sparkline beside it (it spans the width however many readings
 * there are: the island stays open for seconds, too short to fill a fixed
 * window). The line turns to the warning hue from 75% and the error hue
 * from 90%, so the color comes from the load. When memory is what's tight,
 * `hero="memory"` makes memory pressure the figure and its trend instead.
 * Under it one word for how the machine is doing and who's busiest, then
 * the facts: memory in use of all of it (or the CPU), the network's in and
 * out rates, and, when given, the battery with its time left and the
 * startup disk's free space. The uptime sits on the context line.
 *
 * Beside it, past a hairline, the busiest processes by CPU with the memory
 * they hold, three at most and a count of the rest.
 *
 * CPU and network are rates between two readings, so before the first one
 * lands (about a second after opening) the figures are dashes over the
 * Sparkline's baseline.
 *
 * `SystemStats.Leading` and `SystemStats.Trailing` show the CPU load in the
 * compact island's wings, `SystemStats.Minimal` as a ring in the split
 * island's bubble.
 *
 * @example {@include ./examples.mdx}
 */
const SystemStats = Object.assign(
  function SystemStats({ samples, hero = 'cpu', battery, disk, uptime, processes, size, className }: SystemStatsProps) {
    const last = samples.at(-1)
    const series = hero === 'cpu' ? samples.map(s => s.cpu) : samples.map(pressureOf)
    const load = last ? (hero === 'cpu' ? last.cpu : pressureOf(last)) : 0
    const name = hero === 'cpu' ? 'CPU' : 'Memory pressure'
    const busiest = processes?.length ? processes.reduce((a, b) => (b.cpu > a.cpu ? b : a)).name : undefined

    return (
      <Widget
        size={size}
        className={cn('h-full', className)}
        aside={processes?.length ? <Processes processes={processes} /> : undefined}
      >
        <Widget.Header icon={Activity}>{uptime === undefined ? 'System' : `System · up ${span(uptime)}`}</Widget.Header>
        <div className="flex min-w-0 items-end gap-4" aria-busy={!last}>
          <Widget.Figure
            value={last ? percent(load) : '–'}
            unit={hero === 'cpu' ? 'CPU' : 'pressure'}
            className="shrink-0"
          />
          <Sparkline
            values={series}
            max={1}
            area
            tone={toneOf(load)}
            label={last ? `${name}, ${percent(load)}` : `${name}, measuring`}
            className={cn('mb-1.5 h-9 min-w-0 flex-1', !last && 'text-muted-foreground')}
          />
        </div>
        <Widget.Subtitle className="mb-1">
          {last ? [verdict(load), busiest && `${busiest} is busiest`].filter(Boolean).join(' · ') : 'Measuring…'}
        </Widget.Subtitle>
        <Facts last={last} hero={hero} battery={battery} disk={disk} />
      </Widget>
    )
  },
  {
    Leading: SystemStatsLeading,
    Trailing: SystemStatsTrailing,
    Minimal: SystemStatsMinimal,
  },
)

export default SystemStats

export type { StatsBattery, StatsDisk, StatsHero, StatsProcess, StatsSample, SystemStatsProps }
export { SystemStats, SystemStatsLeading, SystemStatsMinimal, SystemStatsTrailing }
