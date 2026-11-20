/*!
 * Local addition: a notch app's system load, the busiest figure as the hero
 * with its trend, the rest as facts and the busiest processes beside it.
 * Rebuilt from Just Notch's stats plugin (`System`, `Tile`, `Measuring`,
 * `CpuLoad`) on the kit's Widget frame and modo-ui's Sparkline and Meter:
 * the readings come in as props.
 */

'use client'

import Sparkline, { type SparklineTone } from '@justanarthur/modo-ui/components/data-display/sparkline'
import Table from '@justanarthur/modo-ui/components/data-display/table'
import Meter, { type MeterTone } from '@justanarthur/modo-ui/components/feedback/meter'
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
  type LucideIcon,
  MemoryStick,
  Network,
} from 'lucide-react'
import type { ReactNode } from 'react'
import Widget, { type WidgetLayout } from '../../../components/island/widget'

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
  /** The busiest processes, in any order: the top three by CPU, beside the hero or, at the tall snap, as a table. */
  processes?: StatsProcess[]
  /** Step on the size ladder. Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** `tall` is the open island's tall snap: CPU and memory side by side, each with its trend; the network's in and out as one graph beside the battery and the disk as gauges; and the top eight processes as a table. Defaults to `'fit'`. */
  layout?: WidgetLayout
  /** Classes for the root, which fills its container. */
  className?: string
}

/** Processes listed before the count of the rest. */
const ROWS = 3
/** Processes in the tall snap's table: as many as the short island lists, so the sheet never clips. */
const SHEET_ROWS = 3
/** The least top a share's trend draws to, so an idle machine's few percent still read as a line, not the floor. */
const TREND_FLOOR = 0.2
/** Headroom over a trend's peak. */
const HEADROOM = 1.25
/** A series that moves less than this share of its peak is flat: a line, no fill under it. */
const FLAT = 0.05

/** A share trend's top: its peak with headroom, at least `TREND_FLOOR`, at most 1. */
const ceilingOf = (series: number[]) => Math.min(1, Math.max(TREND_FLOOR, Math.max(0, ...series) * HEADROOM))

function isFlat(series: number[]) {
  const peak = Math.max(0, ...series)
  return peak === 0 || peak - Math.min(...series) < peak * FLAT
}

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

interface TrendProps {
  label: string
  icon: LucideIcon
  /** The latest share, from 0 to 1; left out while measuring. */
  value?: number
  unit?: string
  /** Every reading, drawn as a trend; left out, the value shows as one meter (memory pressure, which reads as a level, not a history). */
  series?: number[]
  /** The line under the trend. */
  caption: ReactNode
  className?: string
}

/** One figure at the tall snap: its share large, its trend (or its meter) under it, one line on what it means. */
function Trend({ label, icon: Icon, value, unit, series, caption, className }: TrendProps) {
  const name = value === undefined ? `${label}, measuring` : `${label}, ${percent(value)}`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)} aria-busy={value === undefined}>
      <Widget.Header icon={Icon}>{label}</Widget.Header>
      <Widget.Figure value={value === undefined ? '–' : percent(value)} unit={unit} />
      {series ? (
        <Sparkline
          values={series}
          max={ceilingOf(series)}
          area={!isFlat(series)}
          tone={toneOf(value ?? 0)}
          label={name}
          className={cn('my-1 h-10 w-full', value === undefined && 'text-muted-foreground')}
        />
      ) : (
        <span className="my-1 flex h-10 items-center">
          <Meter variant="line" value={value ?? 0} label={name} className="w-full" />
        </span>
      )}
      <Widget.Subtitle>{caption}</Widget.Subtitle>
    </div>
  )
}

interface GaugeProps {
  icon: LucideIcon
  label: string
  /** The share used, from 0 to 1. */
  value: number
  tone?: MeterTone
  caption: string
}

/** A level at the tall snap, headed like the trends: glyph and name, the level as a line, the figures under it. */
function Gauge({ icon, label, value, tone, caption }: GaugeProps) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-1">
      <Widget.Header icon={icon}>{label}</Widget.Header>
      <Meter variant="line" value={value} tone={tone} label={`${label}, ${caption}`} className="my-1 w-full" />
      <Widget.Subtitle>{caption}</Widget.Subtitle>
    </div>
  )
}

/** A battery's tone: the warning hue from 20% left, the error hue from 10%, unless it charges. */
function batteryTone({ level, charging }: StatsBattery): MeterTone {
  if (charging) return 'default'
  if (level <= 10) return 'error'
  if (level <= 20) return 'warning'
  return 'default'
}

function ProcessTable({ processes }: { processes: StatsProcess[] }) {
  const top = [...processes].sort((a, b) => b.cpu - a.cpu).slice(0, SHEET_ROWS)
  const head = 'text-caption weight-normal text-muted-foreground'
  return (
    <Widget.Section label="Top processes" trailing={<span>by CPU</span>}>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head className={head}>Name</Table.Head>
            <Table.Head className={cn(head, 'text-right')}>CPU</Table.Head>
            <Table.Head className={cn(head, 'w-24 text-right')}>Memory</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {top.map(process => (
            <Table.Row key={process.id}>
              <Table.Cell className="text-foreground">{process.name}</Table.Cell>
              <Table.Cell>
                <span className="flex items-center justify-end gap-3">
                  <Meter variant="line" value={process.cpu} label={`${process.name}, CPU`} className="w-24" />
                  <span className="w-12 text-right tabular-nums">{share(process.cpu)}</span>
                </span>
              </Table.Cell>
              <Table.Cell className="text-right tabular-nums">
                {process.memory === undefined ? '–' : bytes(process.memory)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Widget.Section>
  )
}

interface SheetProps extends Omit<SystemStatsProps, 'samples' | 'hero' | 'layout'> {
  samples: StatsSample[]
  hero: StatsHero
}

/** The tall snap's sheet. */
function Sheet({ samples, hero, battery, disk, uptime, processes, size, className }: SheetProps) {
  const last = samples.at(-1)
  const busiest = processes?.length ? processes.reduce((a, b) => (b.cpu > a.cpu ? b : a)).name : undefined
  const cpu = (
    <Trend
      key="cpu"
      label="CPU"
      icon={Cpu}
      value={last?.cpu}
      unit="load"
      series={samples.map(s => s.cpu)}
      caption={
        last ? [verdict(last.cpu), busiest && `${busiest} is busiest`].filter(Boolean).join(' · ') : 'Measuring…'
      }
    />
  )
  const memory = (
    <Trend
      key="memory"
      label="Memory"
      icon={MemoryStick}
      value={last && pressureOf(last)}
      unit="pressure"
      caption={last ? `${bytes(last.memoryUsed)} of ${bytes(last.memoryTotal)} in use` : 'Measuring…'}
    />
  )
  const [first, second] = hero === 'cpu' ? [cpu, memory] : [memory, cpu]
  const netIn = samples.map(s => s.netIn)
  const netOut = samples.map(s => s.netOut)
  const left = battery?.minutesLeft === undefined ? undefined : clock(battery.minutesLeft)

  return (
    <Widget.Sheet size={size} className={className}>
      <div className="flex min-w-0 flex-col gap-2">
        <Widget.Header icon={Activity}>{uptime === undefined ? 'System' : `System · up ${span(uptime)}`}</Widget.Header>
        <div className="grid grid-cols-2 divide-x divide-border [&>*]:px-6 [&>*:first-child]:pl-0 [&>*:last-child]:pr-0">
          {first}
          {second}
        </div>
      </div>

      <div className="grid auto-cols-fr grid-flow-col divide-x divide-border [&>*]:px-6 [&>*:first-child]:pl-0 [&>*:last-child]:pr-0">
        <div className="flex min-w-0 flex-col gap-1" aria-busy={!last}>
          <Widget.Header icon={Network}>Network</Widget.Header>
          <div className="flex min-w-0 items-baseline gap-5">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-title weight-semibold tabular-nums text-foreground">
              <ArrowDown size={16} strokeWidth={1.5} aria-label="In" className="text-muted-foreground" />
              {last ? rate(last.netIn) : '–'}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-title weight-semibold tabular-nums text-muted-foreground">
              <ArrowUp size={16} strokeWidth={1.5} aria-label="Out" />
              {last ? rate(last.netOut) : '–'}
            </span>
          </div>
          <Sparkline
            values={netIn}
            secondary={isFlat(netOut) ? undefined : netOut}
            area={!isFlat(netIn)}
            label={last ? `Network, ${rate(last.netIn)} in, ${rate(last.netOut)} out` : 'Network, measuring'}
            className={cn('my-1 h-9 w-full', !last && 'text-muted-foreground')}
          />
        </div>
        {battery && (
          <Gauge
            icon={batteryIcon(battery)}
            label="Battery"
            value={battery.level / 100}
            tone={batteryTone(battery)}
            caption={`${battery.level}%${left ? ` · ${left} ${battery.charging ? 'to full' : 'left'}` : ''}${battery.charging ? ' · charging' : ''}`}
          />
        )}
        {disk && (
          <Gauge
            icon={HardDrive}
            label="Startup disk"
            value={(disk.total - disk.free) / disk.total}
            caption={`${bytes(disk.free)} free of ${bytes(disk.total)}`}
          />
        )}
      </div>

      {processes?.length ? <ProcessTable processes={processes} /> : null}
    </Widget.Sheet>
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
 * window). The trend draws up to its peak with headroom but never under
 * 20%, so an idle machine's few percent still read as a line, and a flat
 * series is a bare line with no fill. The line turns to the warning hue
 * from 75% and the error hue from 90%, so the color comes from the load.
 * When memory is what's tight, `hero="memory"` makes memory pressure the
 * figure, as one meter: pressure is a level, not a history.
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
 * At the open island's tall snap (`layout="tall"`) it becomes a sheet: CPU
 * and memory pressure side by side, each its figure large over its trend
 * (memory over its meter) and a line on what it means (the hero's column
 * first); then the network's in and out as one graph (the out line only
 * once it moves), its rates over it, beside the battery and the startup
 * disk, each headed by its glyph like the others, as a level line; then the
 * top three processes as a table, each with its share of the CPU as a line
 * and the memory it holds.
 *
 * `SystemStats.Leading` and `SystemStats.Trailing` show the CPU load in the
 * compact island's wings, `SystemStats.Minimal` as a ring in the split
 * island's bubble.
 *
 * @example {@include ./examples.mdx}
 */
const SystemStats = Object.assign(
  function SystemStats({
    samples,
    hero = 'cpu',
    battery,
    disk,
    uptime,
    processes,
    size,
    layout = 'fit',
    className,
  }: SystemStatsProps) {
    if (layout === 'tall')
      return (
        <Sheet
          size={size}
          samples={samples}
          hero={hero}
          battery={battery}
          disk={disk}
          uptime={uptime}
          processes={processes}
          className={className}
        />
      )

    const last = samples.at(-1)
    const series = samples.map(s => s.cpu)
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
          {hero === 'cpu' ? (
            <Sparkline
              values={series}
              max={ceilingOf(series)}
              area={!isFlat(series)}
              tone={toneOf(load)}
              label={last ? `${name}, ${percent(load)}` : `${name}, measuring`}
              className={cn('mb-1.5 h-9 min-w-0 flex-1', !last && 'text-muted-foreground')}
            />
          ) : (
            <Meter
              variant="line"
              value={load}
              label={last ? `${name}, ${percent(load)}` : `${name}, measuring`}
              className="mb-3 min-w-0 flex-1"
            />
          )}
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
