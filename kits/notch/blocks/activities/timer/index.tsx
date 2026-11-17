/*!
 * Local addition: a notch app's timer, from picking a length to "Time's up".
 * Rebuilt from Just Notch's timer plugin (`Picker`, `Running`, `Ring`,
 * `TimeUp`) as presentational parts: the run is a value the host may own.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import NumberInput from '@justanarthur/modo-ui/components/inputs/number-input'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Pause, Play, Plus, Timer as TimerIcon, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Countdown from '../../../components/indicators/countdown'
import IslandFlash from '../../../components/island/island-flash'
import { formatClock, MINUTE, SECOND, useEdgeClock } from '../../../lib/clock'

type TimerKind = 'focus' | 'break' | 'custom'

/** A run: running while it has `endsAt`, paused while it has `remaining`. */
interface TimerRun {
  kind: TimerKind
  /** Its whole length, in ms. */
  total: number
  /** When it ends, in epoch ms, while it runs. */
  endsAt?: number
  /** The time left, in ms, while it is paused. */
  remaining?: number
}

interface TimerProps {
  /** The run (controlled); `null` shows the picker. */
  value?: TimerRun | null
  /** The run at first (uncontrolled). Defaults to `null`. */
  defaultValue?: TimerRun | null
  /** Called with the run a start, pause, resume, +1 min or cancel leaves, and `null` when it ends. */
  onValueChange?: (run: TimerRun | null) => void
  /** Called when a run reaches zero, with the kind that starts next in a Pomodoro cycle. */
  onEnd?: (run: TimerRun, next?: TimerKind) => void
  /** The picker's quick lengths, in minutes, before the Pomodoro preset. Defaults to `[1, 5, 10]`. */
  presets?: number[]
  /** Pomodoro cycles: when a focus run ends a break starts on its own, then focus again. Defaults to `false`. */
  pomodoro?: boolean
  /** A focus run's length, in minutes. Defaults to `25`. */
  focusMinutes?: number
  /** A break's length, in minutes. Defaults to `5`. */
  breakMinutes?: number
  /** Classes for the root, which fills its container. */
  className?: string
}

const LABEL: Record<TimerKind, string> = { focus: 'Focus', break: 'Break', custom: 'Timer' }

const start = (minutes: number, kind: TimerKind): TimerRun => ({
  kind,
  total: minutes * MINUTE,
  endsAt: Date.now() + minutes * MINUTE,
})
const pause = (run: TimerRun): TimerRun => ({ kind: run.kind, total: run.total, remaining: timeLeft(run, Date.now()) })
const resume = (run: TimerRun): TimerRun => ({
  kind: run.kind,
  total: run.total,
  endsAt: Date.now() + (run.remaining ?? 0),
})
const addMinute = (run: TimerRun): TimerRun =>
  run.endsAt === undefined
    ? { ...run, total: run.total + MINUTE, remaining: (run.remaining ?? 0) + MINUTE }
    : { ...run, total: run.total + MINUTE, endsAt: run.endsAt + MINUTE }

/** The time a run has left at `now`, in ms. */
function timeLeft(run: TimerRun, now: number) {
  return run.endsAt === undefined ? (run.remaining ?? 0) : Math.max(0, run.endsAt - now)
}

/** The time left, re-read on each second's edge while the run runs, never in between. */
function useTimeLeft(run: TimerRun) {
  const end = run.endsAt ?? 0
  const now = useEdgeClock(end, run.endsAt !== undefined && Date.now() < end + SECOND)
  return timeLeft(run, now)
}

function Ring({ run, className }: { run: TimerRun; className: string }) {
  const left = useTimeLeft(run)
  return (
    <Meter
      variant="ring"
      label={`${LABEL[run.kind]}, ${formatClock(Math.ceil(left / SECOND))} left`}
      value={run.total ? left / run.total : 0}
      tone="default"
      animate={false}
      className={className}
    />
  )
}

function Clock({ run, className, onEnd }: { run: TimerRun; className: string; onEnd?: () => void }) {
  const paused = run.endsAt === undefined
  return (
    <Countdown
      endsAt={run.endsAt}
      paused={paused}
      remaining={run.remaining}
      onEnd={onEnd}
      className={cn(className, paused ? 'text-muted-foreground' : 'text-status-warning')}
    />
  )
}

/** The compact island's left wing: the timer's glyph. */
function TimerLeading() {
  return <TimerIcon size={16} strokeWidth={1.5} className="text-status-warning" />
}

/** The compact island's right wing: the time left, muted while paused. */
function TimerTrailing({ run }: { run: TimerRun }) {
  return <Clock run={run} className="text-caption weight-medium" />
}

/** The split island's bubble: a ring of the time left. */
function TimerMinimal({ run }: { run: TimerRun }) {
  return <Ring run={run} className="size-5.5" />
}

interface TimerDoneProps {
  /** The run that ended. Defaults to `'custom'`. */
  kind?: TimerKind
  /** The kind a Pomodoro cycle starts next. */
  next?: TimerKind
  /** The next run's length, in minutes. */
  minutes?: number
}

/** The island's flash when a run reaches zero: "Time's up", and what starts next in a Pomodoro cycle. */
function TimerDone({ kind = 'custom', next, minutes }: TimerDoneProps) {
  const detail = next ? `${LABEL[next]} starts now${minutes ? ` · ${minutes} min` : ''}` : `${LABEL[kind]} finished`
  return (
    <IslandFlash icon={<TimerIcon size={20} strokeWidth={1.5} />} tone="warning" title="Time's up" caption={detail} />
  )
}

interface PickerProps {
  presets: number[]
  focusMinutes: number
  onStart: (run: TimerRun) => void
}

function Picker({ presets, focusMinutes, onStart }: PickerProps) {
  const [minutes, setMinutes] = useState<number | null>(null)
  const valid = minutes !== null && Number.isInteger(minutes) && minutes >= 1 && minutes <= 99
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) onStart(start(minutes, 'custom'))
  }
  return (
    <div className="flex size-full flex-col justify-center gap-3">
      <div className="grid grid-cols-4 gap-2">
        {presets.map(m => (
          <Button key={m} variant="tertiary" onClick={() => onStart(start(m, 'custom'))}>
            {m} min
          </Button>
        ))}
        <Button variant="tertiary" onClick={() => onStart(start(focusMinutes, 'focus'))}>
          Pomodoro
        </Button>
      </div>
      <form className="flex items-center gap-2" onSubmit={submit}>
        <div className="min-w-0 flex-1">
          <NumberInput
            className="w-full"
            variant="bordered"
            min={1}
            max={99}
            placeholder="Custom minutes"
            aria-label="Custom minutes"
            endAdornment="min"
            value={minutes}
            onValueChange={setMinutes}
          />
        </div>
        <Button type="submit" variant="primary" leadingIcon={Play} disabled={!valid}>
          Start
        </Button>
      </form>
    </div>
  )
}

interface RunningProps {
  run: TimerRun
  onChange: (run: TimerRun | null) => void
  onEnd: () => void
}

function Running({ run, onChange, onEnd }: RunningProps) {
  const paused = run.endsAt === undefined
  return (
    <div className="flex size-full items-center gap-5">
      <Ring run={run} className="size-16" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-caption text-muted-foreground">
          {LABEL[run.kind]} · {Math.round(run.total / MINUTE)} min{paused ? ' · Paused' : ''}
        </span>
        <Clock run={run} className="text-display" onEnd={onEnd} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="tertiary" leadingIcon={Plus} onClick={() => onChange(addMinute(run))}>
          1 min
        </Button>
        <Button
          variant="tertiary"
          size="icon"
          className="text-status-warning"
          aria-label={paused ? 'Resume' : 'Pause'}
          onClick={() => onChange(paused ? resume(run) : pause(run))}
        >
          {paused ? (
            <Play size={16} strokeWidth={1.5} fill="currentColor" />
          ) : (
            <Pause size={16} strokeWidth={1.5} fill="currentColor" />
          )}
        </Button>
        <Button variant="tertiary" size="icon" aria-label="Cancel" onClick={() => onChange(null)}>
          <X size={16} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  )
}

/**
 * A notch app's timer: pick a length, watch it run down, hear when it's up.
 *
 * Without a run it shows the picker: quick lengths (`presets`), a Pomodoro
 * focus run and a custom length in minutes on a NumberInput. A run shows a
 * Meter ring of the time left beside the time itself in display type, with
 * +1 min, pause / resume and cancel. The run is a value (`value` /
 * `onValueChange`, or kept here from `defaultValue`): a running one carries
 * when it ends, a paused one the time it had left, so a host can persist it
 * and resume after a reload. The time re-renders once a second, on the
 * second's edge, and nothing runs while it is paused.
 *
 * At zero it calls `onEnd` and clears the run, unless `pomodoro` cycles:
 * then a focus run hands over to a break and a break back to focus.
 *
 * The other forms are parts: `Timer.Leading` and `Timer.Trailing` for the
 * compact island's wings (the glyph and the time left), `Timer.Minimal` for
 * the split island's bubble (the ring) and `Timer.Done`, the "Time's up"
 * flash.
 *
 * @example {@include ./examples.mdx}
 */
function Timer({
  value,
  defaultValue = null,
  onValueChange,
  onEnd,
  presets = [1, 5, 10],
  pomodoro = false,
  focusMinutes = 25,
  breakMinutes = 5,
  className,
}: TimerProps) {
  const [run, setRun] = useControllableState(value, defaultValue, onValueChange)

  const complete = (ended: TimerRun) => {
    const next = pomodoro && ended.kind !== 'custom' ? (ended.kind === 'focus' ? 'break' : 'focus') : undefined
    onEnd?.(ended, next)
    setRun(next ? start(next === 'break' ? breakMinutes : focusMinutes, next) : null)
  }

  return (
    <div className={cn('size-full', className)}>
      {run ? (
        <Running run={run} onChange={setRun} onEnd={() => complete(run)} />
      ) : (
        <Picker presets={presets} focusMinutes={focusMinutes} onStart={setRun} />
      )}
    </div>
  )
}

Timer.Leading = TimerLeading
Timer.Trailing = TimerTrailing
Timer.Minimal = TimerMinimal
Timer.Done = TimerDone

export default Timer

export type { TimerDoneProps, TimerKind, TimerProps, TimerRun }
export { Timer, TimerDone, TimerLeading, TimerMinimal, TimerTrailing }
