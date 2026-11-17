/*!
 * Local addition: a notch app's clock, the time, the date and a few world
 * clocks, with a Pomodoro cycle that takes the widget over while it runs.
 * The run is a value the host may own and persist.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  CalendarDays,
  Check,
  Clock3,
  Coffee,
  Moon,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  SkipForward,
  Sun,
  Target,
  Timer,
} from 'lucide-react'
import { useEffect } from 'react'
import IslandFlash from '../../../components/island/island-flash'
import Widget, { type WidgetLayout } from '../../../components/island/widget'
import { formatClock, MINUTE, SECOND, useEdgeClock } from '../../../lib/clock'

type PomodoroPhase = 'focus' | 'short-break' | 'long-break'

/** A Pomodoro cycle's lengths, in minutes, and how many focus rounds come before the long break. */
interface PomodoroSettings {
  focus: number
  shortBreak: number
  longBreak: number
  rounds: number
}

/** A Pomodoro phase: running while it has `endsAt`, paused while it has `remaining`. */
interface PomodoroRun {
  phase: PomodoroPhase
  /** The focus round it belongs to, from 1: a break follows its round. */
  round: number
  /** The phase's whole length, in ms. */
  total: number
  /** When it ends, in epoch ms, while it runs. */
  endsAt?: number
  /** The time left, in ms, while it is paused. */
  remaining?: number
}

/** A world clock: a city and its IANA time zone. */
interface ClockZone {
  city: string
  /** An IANA time zone: `America/Chicago`. */
  timeZone: string
}

interface ClockProps {
  /** The world clocks beside the time, two or three. */
  zones?: ClockZone[]
  /** Shows the seconds, re-rendering on each second's edge instead of each minute's. Defaults to `false`. */
  seconds?: boolean
  /** A 12-hour clock (`true`) or a 24-hour one (`false`). Defaults to the locale's. */
  hour12?: boolean
  /** The time zone of the main clock. Defaults to the system's. */
  timeZone?: string
  /** Formats the time and the date. Defaults to the browser's locale. */
  locale?: Intl.LocalesArgument
  /** The moment the clock shows, in epoch ms. Defaults to now, re-read on each minute (or second). */
  now?: number
  /** The Pomodoro cycle's lengths, merged over 25 / 5 / 15 minutes and 4 rounds; `false` leaves the Pomodoro out. */
  pomodoro?: Partial<PomodoroSettings> | false
  /** The Pomodoro run (controlled); `null` shows the clock. */
  value?: PomodoroRun | null
  /** The run at first (uncontrolled). Defaults to `null`. */
  defaultValue?: PomodoroRun | null
  /** Called with the run a start, pause, resume, skip, +1 min or reset leaves (`null` after a reset). */
  onValueChange?: (run: PomodoroRun | null) => void
  /** Called when a phase reaches zero, with the next one, which waits paused to be started: show `Clock.PhaseDone`. */
  onPhaseEnd?: (ended: PomodoroRun, next: PomodoroRun) => void
  /** The focus rounds finished today, shown at the tall snap as a row of dots and the time focused. Left out, the tall view leaves the line out. */
  completedToday?: number
  /** `tall` is the open island's tall snap: the time larger, every world clock as a column, the Pomodoro's whole cycle as a strip and its lengths, today's finished rounds; a run lists every phase of its cycle. Defaults to `'fit'`. */
  layout?: WidgetLayout
  /** Classes for the root, which fills its container. */
  className?: string
}

const DEFAULTS: PomodoroSettings = { focus: 25, shortBreak: 5, longBreak: 15, rounds: 4 }

// Literal tables: UnoCSS only generates the classes it can read whole. Focus is warm, a break green.
const RING: Record<PomodoroPhase, string> = {
  focus: '[&_circle:last-child]:text-status-warning',
  'short-break': '[&_circle:last-child]:text-status-success',
  'long-break': '[&_circle:last-child]:text-status-success',
}
const DOT: Record<PomodoroPhase, string> = {
  focus: 'bg-status-warning',
  'short-break': 'bg-status-success',
  'long-break': 'bg-status-success',
}
const TILE: Record<PomodoroPhase, string> = {
  focus: 'bg-status-warning/16 text-status-warning',
  'short-break': 'bg-status-success/16 text-status-success',
  'long-break': 'bg-status-success/16 text-status-success',
}
const MARK: Record<PomodoroPhase, string> = {
  focus: 'var(--status-warning)',
  'short-break': 'var(--status-success)',
  'long-break': 'var(--status-success)',
}
const WASH: Record<PomodoroPhase, string> = {
  focus: 'bg-status-warning/16',
  'short-break': 'bg-status-success/16',
  'long-break': 'bg-status-success/16',
}
const GLYPH = { focus: Target, 'short-break': Coffee, 'long-break': Coffee }
const PHASES: PomodoroPhase[] = ['focus', 'short-break', 'long-break']

const settingsOf = (pomodoro?: Partial<PomodoroSettings> | false): PomodoroSettings => ({
  ...DEFAULTS,
  ...(pomodoro || {}),
})

const lengthOf = (phase: PomodoroPhase, settings: PomodoroSettings) =>
  (phase === 'focus' ? settings.focus : phase === 'short-break' ? settings.shortBreak : settings.longBreak) * MINUTE

/** The phase after `run`'s and its round: a break after focus (the long one after the last round), then the next round. */
function following(run: Pick<PomodoroRun, 'phase' | 'round'>, settings: PomodoroSettings) {
  if (run.phase === 'focus')
    return { phase: run.round >= settings.rounds ? 'long-break' : 'short-break', round: run.round } as const
  return { phase: 'focus', round: run.phase === 'long-break' ? 1 : run.round + 1 } as const
}

/** The first focus round, running from now. */
function startPomodoro(pomodoro?: Partial<PomodoroSettings>): PomodoroRun {
  const total = lengthOf('focus', settingsOf(pomodoro))
  return { phase: 'focus', round: 1, total, endsAt: Date.now() + total }
}

/** The phase after `run`, paused at its whole length until it is started: what a phase reaching zero leaves. */
function advancePomodoro(run: PomodoroRun, pomodoro?: Partial<PomodoroSettings>): PomodoroRun {
  const settings = settingsOf(pomodoro)
  const next = following(run, settings)
  const total = lengthOf(next.phase, settings)
  return { ...next, total, remaining: total }
}

/** `run` running from now, from the time it had left. */
function resumePomodoro(run: PomodoroRun): PomodoroRun {
  return { phase: run.phase, round: run.round, total: run.total, endsAt: Date.now() + (run.remaining ?? run.total) }
}

const pause = (run: PomodoroRun, left: number): PomodoroRun => ({
  phase: run.phase,
  round: run.round,
  total: run.total,
  remaining: left,
})

const addMinute = (run: PomodoroRun): PomodoroRun =>
  run.endsAt === undefined
    ? { ...run, total: run.total + MINUTE, remaining: (run.remaining ?? run.total) + MINUTE }
    : { ...run, total: run.total + MINUTE, endsAt: run.endsAt + MINUTE }

/** The time `run` has left, re-read on each second's edge while it runs, never in between. */
function useLeft(run: PomodoroRun) {
  const end = run.endsAt ?? 0
  const now = useEdgeClock(end, run.endsAt !== undefined && Date.now() < end + SECOND)
  return run.endsAt === undefined ? (run.remaining ?? run.total) : Math.max(0, end - now)
}

/** Every phase of one cycle, in order: each focus round and the break after it, the last one long. */
function cycleOf(settings: PomodoroSettings) {
  return Array.from({ length: settings.rounds }, (_, i) => [
    { phase: 'focus' as const, round: i + 1 },
    { phase: i + 1 === settings.rounds ? ('long-break' as const) : ('short-break' as const), round: i + 1 },
  ]).flat()
}

/** Where `run` sits in its cycle. */
const indexIn = (run: Pick<PomodoroRun, 'phase' | 'round'>, settings: PomodoroSettings) =>
  Math.min(settings.rounds * 2 - 1, (run.round - 1) * 2 + (run.phase === 'focus' ? 0 : 1))

/** Minutes as `2 h 10 min`, `1 h` or `50 min`. */
function minutesLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

function phaseName(run: Pick<PomodoroRun, 'phase' | 'round'>, rounds: number) {
  if (run.phase === 'focus') return `Focus ${run.round} of ${rounds}`
  return run.phase === 'long-break' ? 'Long break' : 'Short break'
}

/** A time split into its figure and its day period: `4:05` and `PM`, or `16:05` alone. */
function timeParts(
  ms: number,
  { locale, hour12, timeZone, seconds }: Pick<ClockProps, 'locale' | 'hour12' | 'timeZone' | 'seconds'>,
) {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: seconds ? '2-digit' : undefined,
    hour12,
    timeZone,
  }).formatToParts(ms)
  const period = parts.find(part => part.type === 'dayPeriod')?.value
  const text = parts
    .filter(part => part.type !== 'dayPeriod')
    .map(part => part.value)
    .join('')
    .trim()
  return { text, period }
}

const shortTime = (ms: number, options: Pick<ClockProps, 'locale' | 'hour12' | 'timeZone'>) =>
  new Date(ms).toLocaleTimeString(options.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: options.hour12,
    timeZone: options.timeZone,
  })

/** A zone's offset from UTC at `ms`, in minutes; the system's without a zone. */
function offsetOf(ms: number, timeZone?: string) {
  if (!timeZone) return -new Date(ms).getTimezoneOffset()
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(ms)
    .find(part => part.type === 'timeZoneName')?.value
  const match = name?.match(/([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

/** An offset difference as `+9h`, `−6h`, `+5:30`. */
function offsetLabel(minutes: number) {
  if (minutes === 0) return 'Same time'
  const sign = minutes > 0 ? '+' : '−'
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  return m ? `${sign}${h}:${String(m).padStart(2, '0')}` : `${sign}${h}h`
}

const dayKey = (ms: number, timeZone?: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)

const hourIn = (ms: number, timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(ms))

interface ZoneRowProps extends Pick<ClockProps, 'locale' | 'hour12' | 'timeZone'> {
  zone: ClockZone
  now: number
}

/** How a zone differs from here at `now`: its day if not today, its offset, and whether it's day there. */
function zoneFacts(zone: ClockZone, now: number, timeZone?: string) {
  const there = dayKey(now, zone.timeZone)
  const here = dayKey(now, timeZone)
  const hour = hourIn(now, zone.timeZone)
  return {
    day: there > here ? 'Tomorrow' : there < here ? 'Yesterday' : undefined,
    offset: offsetLabel(offsetOf(now, zone.timeZone) - offsetOf(now, timeZone)),
    DayGlyph: hour >= 6 && hour < 18 ? Sun : Moon,
  }
}

function ZoneRow({ zone, now, locale, hour12, timeZone }: ZoneRowProps) {
  const { day, offset, DayGlyph } = zoneFacts(zone, now, timeZone)
  return (
    <Widget.Row
      leading={shortTime(now, { locale, hour12, timeZone: zone.timeZone })}
      trailing={
        <>
          {day && <span>{day} ·</span>}
          <span className="tabular-nums">{offset}</span>
          <DayGlyph size={12} strokeWidth={1.5} aria-label={DayGlyph === Sun ? 'Day' : 'Night'} className="ml-1" />
        </>
      }
    >
      {zone.city}
    </Widget.Row>
  )
}

/** A world clock at the tall snap, a column: the city, the time large, its day and offset. */
function ZoneTile({ zone, now, locale, hour12, timeZone }: ZoneRowProps) {
  const { day, offset, DayGlyph } = zoneFacts(zone, now, timeZone)
  const time = timeParts(now, { locale, hour12, timeZone: zone.timeZone })
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-5 first:pl-0 last:pr-0">
      <span className="truncate text-body text-foreground">{zone.city}</span>
      <span className="flex items-baseline gap-1 whitespace-nowrap tabular-nums">
        <span className="text-title weight-semibold text-foreground">{time.text}</span>
        {time.period && <span className="text-caption text-muted-foreground">{time.period}</span>}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
        <DayGlyph size={12} strokeWidth={1.5} aria-label={DayGlyph === Sun ? 'Day' : 'Night'} className="shrink-0" />
        <span className="truncate tabular-nums">
          {day ?? 'Today'}, {offset}
        </span>
      </span>
    </div>
  )
}

interface WorldClocksProps extends Pick<ClockProps, 'locale' | 'hour12' | 'timeZone'> {
  zones: ClockZone[]
  now: number
}

/** The tall snap's world clocks: every zone, a column each, split by hairlines. */
function WorldClocks({ zones, ...rest }: WorldClocksProps) {
  return (
    <Widget.Section label="World clock">
      <div className="grid auto-cols-fr grid-flow-col divide-x divide-border pt-1">
        {zones.map(zone => (
          <ZoneTile key={zone.timeZone + zone.city} zone={zone} {...rest} />
        ))}
      </div>
    </Widget.Section>
  )
}

interface CycleStripProps {
  settings: PomodoroSettings
  /** The phase running, by its place in the cycle: those before it fill, it fills to `progress`. Left out, nothing has run. */
  at?: number
  /** How far the phase at `at` has run, from 0 to 1. */
  progress?: number
}

/** One cycle as a strip, each phase as long as its minutes, in its hue. */
function CycleStrip({ settings, at = -1, progress = 0 }: CycleStripProps) {
  return (
    <div aria-hidden className="flex h-1.5 w-full gap-1">
      {cycleOf(settings).map((step, i) => (
        <span
          key={`${step.phase}-${step.round}`}
          className={cn('relative basis-0 overflow-hidden rounded-full', i < at ? DOT[step.phase] : WASH[step.phase])}
          style={{ flexGrow: lengthOf(step.phase, settings) }}
        >
          {i === at && (
            <span
              className={cn('absolute inset-y-0 left-0', DOT[step.phase])}
              style={{ width: `${progress * 100}%` }}
            />
          )}
        </span>
      ))}
    </div>
  )
}

/** Today's finished focus rounds: a dot for each, the cycle's open ones washed, and the time focused. */
function Today({ completed, settings }: { completed: number; settings: PomodoroSettings }) {
  const slots = Math.min(24, Math.max(1, Math.ceil(completed / settings.rounds)) * settings.rounds)
  return (
    <Widget.Section
      label="Today"
      trailing={
        <span className="tabular-nums">
          {completed} {completed === 1 ? 'round' : 'rounds'} · {minutesLabel(completed * settings.focus)} focused
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5 py-1">
        {Array.from({ length: slots }, (_, slot) => slot).map(slot => (
          <span
            key={slot}
            aria-hidden
            className={cn('size-2.5 rounded-full', slot < completed ? DOT.focus : WASH.focus)}
          />
        ))}
      </div>
    </Widget.Section>
  )
}

interface RingProps {
  run: PomodoroRun
  rounds?: number
  className: string
}

/** The time left as a Meter ring in the phase's hue. */
function PhaseRing({ run, rounds = DEFAULTS.rounds, className }: RingProps) {
  const left = useLeft(run)
  return (
    <Meter
      variant="ring"
      label={`${phaseName(run, rounds)}, ${formatClock(Math.ceil(left / SECOND))} left`}
      value={run.total ? left / run.total : 0}
      tone="default"
      animate={false}
      className={cn(RING[run.phase], className)}
    />
  )
}

interface PartProps {
  /** The Pomodoro run; without one the part shows nothing. */
  run?: PomodoroRun | null
}

/** The compact island's left wing: the ring of the phase's time left. */
function ClockLeading({ run }: PartProps) {
  if (!run) return null
  return <PhaseRing run={run} className="size-4" />
}

function TimeLeft({ run }: { run: PomodoroRun }) {
  const left = useLeft(run)
  return (
    <span
      className={cn(
        'text-caption weight-semibold tabular-nums',
        run.endsAt === undefined ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      {formatClock(Math.ceil(left / SECOND))}
    </span>
  )
}

/** The compact island's right wing: the phase's time left as `mm:ss`, muted while paused. */
function ClockTrailing({ run }: PartProps) {
  if (!run) return null
  return <TimeLeft run={run} />
}

/** The split island's bubble: the ring of the phase's time left. */
function ClockMinimal({ run }: PartProps) {
  if (!run) return null
  return <PhaseRing run={run} className="size-5.5" />
}

interface ClockPhaseDoneProps {
  /** The phase that reached zero. */
  ended: Pick<PomodoroRun, 'phase' | 'round'>
  /** The cycle's lengths, as given to the Clock. */
  pomodoro?: Partial<PomodoroSettings>
  /** Called by the button that starts the next phase; without it the button hides. */
  onStart?: () => void
}

/** The island's flash when a phase reaches zero: "Focus done — break time" or "Break over", and a button to start the next. */
function ClockPhaseDone({ ended, pomodoro, onStart }: ClockPhaseDoneProps) {
  const settings = settingsOf(pomodoro)
  const next = following(ended, settings)
  const minutes = lengthOf(next.phase, settings) / MINUTE
  const Glyph = GLYPH[next.phase]
  const breakNext = next.phase !== 'focus'
  const title = !breakNext
    ? 'Break over'
    : next.phase === 'long-break'
      ? 'Focus done — long break'
      : 'Focus done — break time'
  const caption = !breakNext
    ? `${phaseName(next, settings.rounds)} · ${minutes} min`
    : next.phase === 'long-break'
      ? `${minutes} min break · all ${settings.rounds} rounds done`
      : `${minutes} min break · ${ended.round} of ${settings.rounds} rounds done`
  return (
    <IslandFlash
      icon={
        <span className={cn('flex size-9 items-center justify-center rounded-lg', TILE[next.phase])}>
          <Glyph size={16} strokeWidth={1.5} />
        </span>
      }
      title={title}
      caption={caption}
      action={
        onStart && (
          <Button variant="secondary" size="compact" onClick={onStart}>
            {breakNext ? 'Start break' : 'Start focus'}
          </Button>
        )
      }
    />
  )
}

interface RunningProps
  extends Pick<
    ClockProps,
    'zones' | 'locale' | 'hour12' | 'timeZone' | 'onPhaseEnd' | 'completedToday' | 'layout' | 'className'
  > {
  run: PomodoroRun
  settings: PomodoroSettings
  onChange: (run: PomodoroRun | null) => void
}

/** The coming phases from `run`'s end, each with when it starts. */
function schedule(run: PomodoroRun, start: number, settings: PomodoroSettings, count: number) {
  const phases: { phase: PomodoroPhase; round: number; start: number; length: number }[] = []
  let at: Pick<PomodoroRun, 'phase' | 'round'> = run
  let when = start
  for (let i = 0; i < count; i++) {
    at = following(at, settings)
    const length = lengthOf(at.phase, settings)
    phases.push({ ...at, start: when, length })
    when += length
  }
  return phases
}

function Running({
  run,
  settings,
  onChange,
  onPhaseEnd,
  zones = [],
  locale,
  hour12,
  timeZone,
  completedToday,
  layout = 'fit',
  className,
}: RunningProps) {
  const left = useLeft(run)
  const running = run.endsAt !== undefined
  const now = running ? (run.endsAt ?? 0) - left : Date.now()

  useEffect(() => {
    if (!running || left > 0) return
    const next = advancePomodoro(run, settings)
    onPhaseEnd?.(run, next)
    onChange(next)
  }, [running, left, run, settings, onChange, onPhaseEnd])

  const ends = now + left
  const ready = !running && left === run.total
  const next = following(run, settings)
  const options = { locale, hour12, timeZone }
  const status = running
    ? `Until ${shortTime(ends, options)}`
    : ready
      ? `Ready · ${Math.round(run.total / MINUTE)} min`
      : 'Paused'
  const nextLabel =
    next.phase === 'focus'
      ? `${phaseName(next, settings.rounds)} next`
      : `${lengthOf(next.phase, settings) / MINUTE} min ${next.phase === 'long-break' ? 'long break' : 'break'} next`
  const figure = <Widget.Figure value={formatClock(Math.ceil(left / SECOND))} />
  const controls = (
    <div className="-mr-1 flex shrink-0 items-center gap-1">
      <Widget.Action icon={Plus} label="Add a minute" onClick={() => onChange(addMinute(run))} />
      <Widget.Action
        icon={running ? Pause : Play}
        label={running ? 'Pause' : ready ? 'Start' : 'Resume'}
        emphasis="primary"
        filled
        onClick={() => onChange(running ? pause(run, left) : resumePomodoro(run))}
      />
      <Widget.Action
        icon={SkipForward}
        label={next.phase === 'focus' ? 'Skip to focus' : 'Skip to break'}
        filled
        onClick={() => onChange(resumePomodoro(advancePomodoro(run, settings)))}
      />
    </div>
  )
  const header = (
    <Widget.Header
      icon={Timer}
      trailing={<Widget.Action icon={RotateCcw} label="Reset" onClick={() => onChange(null)} />}
    >
      Pomodoro
    </Widget.Header>
  )
  const phase = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Widget.Title leading={<span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', DOT[run.phase])} />}>
        {phaseName(run, settings.rounds)}
      </Widget.Title>
      <Widget.Meta className="pl-4.5">
        <Widget.MetaItem icon={running ? Clock3 : Pause}>{status}</Widget.MetaItem>
        <Widget.MetaItem icon={GLYPH[next.phase]}>{nextLabel}</Widget.MetaItem>
      </Widget.Meta>
    </div>
  )

  if (layout === 'tall') {
    const cycle = cycleOf(settings)
    const at = indexIn(run, settings)
    const starts: number[] = []
    let when = ends
    for (const step of cycle.slice(at + 1)) {
      starts.push(when)
      when += lengthOf(step.phase, settings)
    }
    return (
      <Widget.Sheet className={className}>
        <div className="flex min-w-0 items-center gap-8">
          <PhaseRing run={run} rounds={settings.rounds} className="size-36 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {header}
            <div className="flex min-w-0 items-center justify-between gap-3">
              {figure}
              {controls}
            </div>
            {phase}
          </div>
        </div>

        <Widget.Section
          label="This cycle"
          trailing={<span className="tabular-nums">Ends at {shortTime(when, options)}</span>}
        >
          <div className="pt-1 pb-2">
            <CycleStrip settings={settings} at={at} progress={run.total ? 1 - left / run.total : 0} />
          </div>
          <div className="grid grid-cols-2 gap-x-8">
            {cycle.map((step, i) => (
              <Widget.Row
                key={`${step.phase}-${step.round}`}
                leading={i < at ? 'Done' : i === at ? 'Now' : shortTime(starts[i - at - 1] ?? when, options)}
                color={MARK[step.phase]}
                trailing={
                  i < at ? (
                    <Check size={14} strokeWidth={1.5} aria-label="Done" />
                  ) : i === at ? (
                    `${formatClock(Math.ceil(left / SECOND))} left`
                  ) : (
                    `${lengthOf(step.phase, settings) / MINUTE} min`
                  )
                }
              >
                {phaseName(step, settings.rounds)}
              </Widget.Row>
            ))}
          </div>
        </Widget.Section>

        {completedToday !== undefined && <Today completed={completedToday} settings={settings} />}
        {zones.length > 0 && (
          <WorldClocks zones={zones} now={now} locale={locale} hour12={hour12} timeZone={timeZone} />
        )}
      </Widget.Sheet>
    )
  }

  return (
    <Widget
      className={className}
      media={<PhaseRing run={run} rounds={settings.rounds} className="size-24" />}
      aside={
        <Widget.Section
          label="Up next"
          trailing={<span className="tabular-nums">{shortTime(Date.now(), options)}</span>}
        >
          {schedule(run, ends, settings, 3).map(phase => (
            <Widget.Row
              key={`${phase.phase}-${phase.round}-${phase.start}`}
              leading={shortTime(phase.start, options)}
              color={MARK[phase.phase]}
              trailing={`${phase.length / MINUTE} min`}
            >
              {phaseName(phase, settings.rounds)}
            </Widget.Row>
          ))}
        </Widget.Section>
      }
    >
      {header}
      <div className="flex min-w-0 items-center justify-between gap-3">
        {figure}
        {controls}
      </div>
      {phase}
    </Widget>
  )
}

/**
 * A notch app's clock: the time as the hero, the date above it, the world
 * clocks beside it, and a Pomodoro cycle that takes over while it runs.
 *
 * The time is set large in hours and minutes (`seconds` adds them, muted,
 * and a tick on each second), on the locale's clock or the one `hour12`
 * picks, with the time zone's name under it and the date on the line above.
 * Beside it, past a hairline, the world clocks (`zones`): each city's time,
 * how far it is from here (`−6h`), whether it's day or night there, and
 * `Tomorrow` or `Yesterday` when its date differs. Nothing ticks between
 * minutes; `now` pins the moment.
 *
 * Under the time the Pomodoro waits with its lengths (`pomodoro`: focus,
 * short and long break in minutes, and the rounds before the long one) and
 * a Start focus button. A run takes the widget over: the phase's ring in
 * its hue (focus warm, a break green) as the picture, the time left as the
 * hero, its round (`Focus 2 of 4`), when it ends and what comes next, and
 * the next phases with their start times beside it. Pause / resume is the
 * main action, with +1 min and skip beside it and reset at the top.
 *
 * The run is a value (`value` / `onValueChange`, or kept here from
 * `defaultValue`): a running phase carries when it ends, a paused one the
 * time it had left, so a host can persist it and pick it up after a
 * reload. When a phase reaches zero the next one waits paused at its whole
 * length and `onPhaseEnd` is called; the helpers `startPomodoro`,
 * `advancePomodoro` and `resumePomodoro` build the same runs for a host
 * that keeps time itself.
 *
 * At the open island's tall snap (`layout="tall"`) it becomes a sheet: the
 * time and the date as the hero with Start focus beside them; every world
 * clock as a column, the city, the time large, and its day, offset and
 * whether it's day or night there; the Pomodoro's whole cycle as a strip, each phase
 * as long as its minutes in its hue, over its three lengths in columns;
 * and today's finished rounds (`completedToday`) as dots with the time
 * focused. A run puts its ring large beside the time left and the
 * controls, then lists every phase of its cycle, done, now and when each
 * starts, under the strip filling as it goes.
 *
 * The other forms are parts: `Clock.Leading` and `Clock.Trailing` for the
 * compact island's wings (the ring and `mm:ss`, nothing without a run),
 * `Clock.Minimal`, the ring, for the split island's bubble, and
 * `Clock.PhaseDone`, the flash at a phase's end with a button to start the
 * next.
 *
 * @example {@include ./examples.mdx}
 */
const Clock = Object.assign(
  function Clock({
    zones = [],
    seconds = false,
    hour12,
    timeZone,
    locale,
    now: nowProp,
    pomodoro,
    value,
    defaultValue = null,
    onValueChange,
    onPhaseEnd,
    completedToday,
    layout = 'fit',
    className,
  }: ClockProps) {
    const [run, setRun] = useControllableState(value, defaultValue, onValueChange)
    const ticking = useEdgeClock(0, nowProp === undefined && !run, seconds ? SECOND : MINUTE)
    const settings = settingsOf(pomodoro)

    if (run)
      return (
        <Running
          run={run}
          settings={settings}
          onChange={setRun}
          onPhaseEnd={onPhaseEnd}
          zones={zones}
          completedToday={completedToday}
          layout={layout}
          locale={locale}
          hour12={hour12}
          timeZone={timeZone}
          className={className}
        />
      )

    const now = nowProp ?? ticking
    const time = timeParts(now, { locale, hour12, timeZone })
    const second = seconds && new Intl.DateTimeFormat('en-US', { second: '2-digit', timeZone }).format(now)
    const date = new Date(now).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', timeZone })
    const zoneName = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'long' })
      .formatToParts(now)
      .find(part => part.type === 'timeZoneName')?.value
    const figure = (
      <Widget.Figure
        value={
          <>
            {time.text}
            {second && <span className="text-muted-foreground">:{second.padStart(2, '0')}</span>}
          </>
        }
        unit={time.period}
      />
    )
    const start = pomodoro !== false && (
      <Button
        variant="secondary"
        size="compact"
        leadingIcon={Play}
        className="mb-1"
        onClick={() => setRun(startPomodoro(settings))}
      >
        Start focus
      </Button>
    )

    if (layout === 'tall')
      return (
        <Widget.Sheet className={className}>
          <div className="flex min-w-0 items-end justify-between gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <Widget.Header icon={CalendarDays}>{date}</Widget.Header>
              {figure}
              {zoneName && <Widget.Subtitle>{zoneName}</Widget.Subtitle>}
            </div>
            {start}
          </div>

          {zones.length > 0 && (
            <WorldClocks zones={zones} now={now} locale={locale} hour12={hour12} timeZone={timeZone} />
          )}

          {pomodoro !== false && (
            <Widget.Section
              label="Pomodoro"
              trailing={
                <span className="tabular-nums">
                  {minutesLabel(
                    cycleOf(settings).reduce((sum, step) => sum + lengthOf(step.phase, settings), 0) / MINUTE,
                  )}{' '}
                  a cycle
                </span>
              }
            >
              <div className="pt-1 pb-3">
                <CycleStrip settings={settings} />
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                {PHASES.map(phase => (
                  <div key={phase} className="flex min-w-0 flex-col gap-0.5 px-5 first:pl-0">
                    <span className="flex items-center gap-2 text-caption text-muted-foreground">
                      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[phase])} />
                      {phase === 'focus' ? 'Focus' : phase === 'long-break' ? 'Long break' : 'Short break'}
                    </span>
                    <span className="text-title weight-semibold tabular-nums text-foreground">
                      {lengthOf(phase, settings) / MINUTE} min
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {phase === 'focus'
                        ? `${settings.rounds} rounds`
                        : phase === 'long-break'
                          ? `After round ${settings.rounds}`
                          : `Between rounds`}
                    </span>
                  </div>
                ))}
              </div>
            </Widget.Section>
          )}

          {pomodoro !== false && completedToday !== undefined && (
            <Today completed={completedToday} settings={settings} />
          )}
        </Widget.Sheet>
      )

    return (
      <Widget
        className={className}
        aside={
          zones.length > 0 && (
            <Widget.Section label="World clock">
              {zones.slice(0, 3).map(zone => (
                <ZoneRow
                  key={zone.timeZone + zone.city}
                  zone={zone}
                  now={now}
                  locale={locale}
                  hour12={hour12}
                  timeZone={timeZone}
                />
              ))}
            </Widget.Section>
          )
        }
      >
        <Widget.Header icon={CalendarDays}>{date}</Widget.Header>
        <div className="flex min-w-0 items-end justify-between gap-3">
          {figure}
          {start}
        </div>
        {zoneName && <Widget.Subtitle>{zoneName}</Widget.Subtitle>}
        {pomodoro !== false && (
          <Widget.Meta className="mt-1">
            <Widget.MetaItem icon={Target}>{settings.focus} min focus</Widget.MetaItem>
            <Widget.MetaItem icon={Coffee}>
              {settings.shortBreak} / {settings.longBreak} min breaks
            </Widget.MetaItem>
            <Widget.MetaItem icon={Repeat}>{settings.rounds} rounds</Widget.MetaItem>
          </Widget.Meta>
        )}
      </Widget>
    )
  },
  {
    Leading: ClockLeading,
    Trailing: ClockTrailing,
    Minimal: ClockMinimal,
    PhaseDone: ClockPhaseDone,
  },
)

export default Clock

export type { ClockPhaseDoneProps, ClockProps, ClockZone, PomodoroPhase, PomodoroRun, PomodoroSettings }
export {
  advancePomodoro,
  Clock,
  ClockLeading,
  ClockMinimal,
  ClockPhaseDone,
  ClockTrailing,
  resumePomodoro,
  startPomodoro,
}
