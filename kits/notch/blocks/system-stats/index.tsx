/*!
 * Local addition: a notch app's system load, CPU, memory and network as
 * tiles with their trends. Rebuilt from Just Notch's stats plugin (`System`,
 * `Tile`, `Measuring`, `CpuLoad`) on modo-ui's Sparkline: the samples come
 * in as props.
 */

'use client'

import Sparkline from '@justanarthur/modo-ui/components/sparkline'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { ArrowDown, ArrowUp, Cpu, type LucideIcon, MemoryStick, Network } from 'lucide-react'
import type { ReactNode } from 'react'

/** One reading of the system. */
interface StatsSample {
  /** CPU load, from 0 to 1. */
  cpu: number
  /** Memory in use, in bytes. */
  memoryUsed: number
  /** All the memory, in bytes. */
  memoryTotal: number
  /** Network in, in bytes per second. */
  netIn: number
  /** Network out, in bytes per second. */
  netOut: number
}

interface SystemStatsProps {
  /** The readings so far, oldest first; the latest is the figure, all of them the trend. Without any, it is still measuring. */
  samples: StatsSample[]
  /** Classes for the root, which fills its container. */
  className?: string
}

const percent = (v: number) => `${Math.round(v * 100)}%`
const gigabytes = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`

/** Bytes per second as `2.4 MB/s`, `512 KB/s` or `80 B/s`. */
function rate(bps: number) {
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} MB/s`
  if (bps >= 1e3) return `${Math.round(bps / 1e3)} KB/s`
  return `${Math.round(bps)} B/s`
}

interface TileProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  children: ReactNode
}

function Tile({ icon: Icon, label, value, children }: TileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-surface-2 p-3">
      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Icon size={14} strokeWidth={1.5} />
        {label}
      </span>
      <div className="flex min-w-0 items-baseline gap-2 text-subtitle weight-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

/** CPU and network are rates between two readings: the first lands about a second after opening. */
function Measuring({ className }: { className?: string }) {
  const tiles = [
    { icon: Cpu, label: 'CPU' },
    { icon: MemoryStick, label: 'Memory' },
    { icon: Network, label: 'Network' },
  ]
  return (
    <div className={cn('grid size-full grid-cols-3 content-center gap-3', className)} aria-busy>
      {tiles.map(({ icon, label }) => (
        <Tile key={label} icon={icon} label={label} value={<span className="text-muted-foreground">–</span>}>
          <Sparkline values={[]} label={`${label}, measuring`} className="h-10" />
        </Tile>
      ))}
    </div>
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

/**
 * A notch app's system load: CPU, memory and network, each a tile with its
 * figure and its trend.
 *
 * The latest reading is the figure: the CPU load, the memory in use of all
 * of it, and the network's in and out rates. Every reading so far is the
 * trend, a modo-ui Sparkline that spans the tile however many readings there
 * are, since the island stays open for seconds, too short to fill a fixed
 * window; network out runs muted under network in, on one scale. Before the
 * first reading the tiles show a dash over the Sparkline's baseline.
 *
 * `SystemStats.Leading` and `SystemStats.Trailing` show the CPU load in the
 * compact island's wings.
 *
 * @example {@include ./examples.mdx}
 */
function SystemStats({ samples, className }: SystemStatsProps) {
  const last = samples.at(-1)
  if (!last) return <Measuring className={className} />

  const cpu = samples.map(s => s.cpu)
  const memory = samples.map(s => s.memoryUsed)
  const netIn = samples.map(s => s.netIn)
  const netOut = samples.map(s => s.netOut)
  return (
    <div className={cn('grid size-full grid-cols-3 content-center gap-3', className)}>
      <Tile icon={Cpu} label="CPU" value={percent(last.cpu)}>
        <Sparkline values={cpu} max={1} label={`CPU, ${percent(last.cpu)}`} className="h-10" />
      </Tile>
      <Tile
        icon={MemoryStick}
        label="Memory"
        value={
          <>
            {gigabytes(last.memoryUsed)}
            <span className="truncate text-caption weight-normal text-muted-foreground">
              of {gigabytes(last.memoryTotal)}
            </span>
          </>
        }
      >
        <Sparkline
          values={memory}
          max={last.memoryTotal}
          label={`Memory, ${gigabytes(last.memoryUsed)}`}
          className="h-10"
        />
      </Tile>
      <Tile
        icon={Network}
        label="Network"
        value={
          <>
            <span className="flex items-center gap-0.5">
              <ArrowDown size={12} strokeWidth={2} aria-label="In" />
              {rate(last.netIn)}
            </span>
            <span className="flex min-w-0 items-center gap-0.5 truncate text-caption weight-normal text-muted-foreground">
              <ArrowUp size={12} strokeWidth={2} aria-label="Out" />
              {rate(last.netOut)}
            </span>
          </>
        }
      >
        <Sparkline
          values={netIn}
          secondary={netOut}
          label={`Network, ${rate(last.netIn)} in, ${rate(last.netOut)} out`}
          className="h-10"
        />
      </Tile>
    </div>
  )
}

SystemStats.Leading = SystemStatsLeading
SystemStats.Trailing = SystemStatsTrailing

export default SystemStats

export type { StatsSample, SystemStatsProps }
export { SystemStats, SystemStatsLeading, SystemStatsTrailing }
