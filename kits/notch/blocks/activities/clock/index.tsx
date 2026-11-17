/*!
 * Local addition: a notch app's clock, the time, the date and a few world
 * clocks, with a Pomodoro cycle that takes the widget over while it runs.
 * Replaces the Timer block: the run is a value the host may own and persist.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  CalendarDays,
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
import Widget from '../../../components/island/widget'
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
const GLYPH = { focus: Target, 'short-break': Coffee, 'long-break': Coffee }

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

function ZoneRow({ zone, now, locale, hour12, timeZone }: ZoneRowProps) {
  const there = dayKey(now, zone.timeZone)
  const here = dayKey(now, timeZone)
  const day = there > here ? 'Tomorrow' : there < here ? 'Yesterday' : undefined
  const hour = hourIn(now, zone.timeZone)
  const DayGlyph = hour >= 6 && hour < 18 ? Sun : Moon
  return (
    <Widget.Row
      leading={shortTime(now, { locale, hour12, timeZone: zone.timeZone })}
      trailing={
        <>
          {day && <span>{day} ·</span>}
          <span className="tabular-nums">{offsetLabel(offsetOf(now, zone.timeZone) - offsetOf(now, timeZone))}</span>
          <DayGlyph size={12} strokeWidth={1.5} aria-label={DayGlyph === Sun ? 'Day' : 'Night'} className="ml-1" />
        </>
      }
    >
      {zone.city}
    </Widget.Row>
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

interface RunningProps extends Pick<ClockProps, 'locale' | 'hour12' | 'timeZone' | 'onPhaseEnd' | 'className'> {
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

function Running({ run, settings, onChange, onPhaseEnd, locale, hour12, timeZone, className }: RunningProps) {
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
      <Widget.Header
        icon={Timer}
        trailing={<Widget.Action icon={RotateCcw} label="Reset" onClick={() => onChange(null)} />}
      >
        Pomodoro
      </Widget.Header>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Widget.Figure value={formatClock(Math.ceil(left / SECOND))} />
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
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title leading={<span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', DOT[run.phase])} />}>
          {phaseName(run, settings.rounds)}
        </Widget.Title>
        <Widget.Meta className="pl-4.5">
          <Widget.MetaItem icon={running ? Clock3 : Pause}>{status}</Widget.MetaItem>
          <Widget.MetaItem icon={GLYPH[next.phase]}>{nextLabel}</Widget.MetaItem>
        </Widget.Meta>
      </div>
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
          <Widget.Figure
            value={
              <>
                {time.text}
                {second && <span className="text-muted-foreground">:{second.padStart(2, '0')}</span>}
              </>
            }
            unit={time.period}
          />
          {pomodoro !== false && (
            <Button
              variant="secondary"
              size="compact"
              leadingIcon={Play}
              className="mb-1"
              onClick={() => setRun(startPomodoro(settings))}
            >
              Start focus
            </Button>
          )}
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
