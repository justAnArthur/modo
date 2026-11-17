/*!
 * Local addition: a notch app's calendar, today's and tomorrow's events and
 * the countdown to the next one. Rebuilt from Just Notch's calendar plugin
 * (`Agenda`, `Upcoming`, `Starting`, `Ring`, `Countdown`) as presentational
 * parts: events, access and actions come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import { type SizeVariant, useSize } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { CalendarCheck, CalendarDays, Video } from 'lucide-react'
import Countdown from '../../../components/indicators/countdown'
import IslandFlash from '../../../components/island/island-flash'
import { formatShort, MINUTE, SECOND, useEdgeClock } from '../../../lib/clock'

type AgendaAccess = 'granted' | 'undetermined' | 'denied'

interface AgendaEvent {
  id: string
  title: string
  /** When it starts, in epoch ms. */
  start: number
  /** When it ends, in epoch ms. */
  end: number
  allDay?: boolean
  location?: string
  /** A video call's link: the event gets a Join button. */
  meetingUrl?: string
  /** Its calendar's color, any CSS color: data, so it paints the dot and the countdown inline. */
  color: string
}

interface AgendaProps {
  /** The events, in start order. */
  events: AgendaEvent[]
  /** Whether the calendar may be read: undetermined asks, denied points to the system's settings. Defaults to `'granted'`. */
  access?: AgendaAccess
  /** The moment the agenda is read at, in epoch ms. Defaults to now, re-read on each minute. */
  now?: number
  /** Formats the times. Defaults to the browser's locale. */
  locale?: Intl.LocalesArgument
  /** Called by Connect calendar while access is undetermined. */
  onRequestAccess?: () => void
  /** Called by Open System Settings while access is denied. */
  onOpenSettings?: () => void
  /** Called by an event's Join button. */
  onJoin?: (event: AgendaEvent) => void
  /** Classes for the root, which fills its container. */
  className?: string
}

const clock = (ms: number, locale?: Intl.LocalesArgument) =>
  new Date(ms).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
const span = (event: AgendaEvent, locale?: Intl.LocalesArgument) =>
  event.allDay ? 'All day' : `${clock(event.start, locale)} – ${clock(event.end, locale)}`
const meta = (event: AgendaEvent, locale?: Intl.LocalesArgument) =>
  event.location ? `${span(event, locale)} · ${event.location}` : span(event, locale)

function relative(ms: number) {
  if (ms <= 0) return 'Now'
  if (ms < MINUTE) return 'In less than a minute'
  return `In ${Math.ceil(ms / MINUTE)} min`
}

/** The time until `start`, re-read on each `unit` edge before it, never in between. */
function useUntil(start: number, unit = MINUTE) {
  const now = useEdgeClock(start, Date.now() < start + SECOND, unit)
  return start - now
}

function Join({
  event,
  size,
  onJoin,
}: {
  event: AgendaEvent
  size?: SizeVariant
  onJoin?: (event: AgendaEvent) => void
}) {
  return (
    <Button variant="secondary" size={size} leadingIcon={Video} onClick={() => onJoin?.(event)}>
      Join
    </Button>
  )
}

interface PartProps {
  /** The event the activity counts down to. */
  event: AgendaEvent
}

/** The compact island's left wing: the calendar glyph in the event's color. */
function AgendaLeading({ event }: PartProps) {
  return <CalendarDays size={16} strokeWidth={1.5} style={{ color: event.color }} />
}

/** The compact island's right wing: the time until it starts, `4m` then `45s`. */
function AgendaTrailing({ event }: PartProps) {
  return (
    <span className="text-caption weight-semibold" style={{ color: event.color }}>
      <Countdown endsAt={event.start} format="short" />
    </span>
  )
}

interface MinimalProps extends PartProps {
  /** How long before the start the countdown opens, in ms: the full ring. Defaults to 10 minutes. */
  lead?: number
}

/** The split island's bubble: a ring that empties as the start nears. */
function AgendaMinimal({ event, lead = 10 * MINUTE }: MinimalProps) {
  const left = Math.max(0, useUntil(event.start, SECOND))
  return (
    <Meter
      variant="ring"
      label={`${event.title}, in ${formatShort(left / SECOND)}`}
      value={Math.min(1, left / lead)}
      tone="default"
      animate={false}
      className="size-5.5"
    />
  )
}

interface ActivityProps extends PartProps {
  /** Formats the times. Defaults to the browser's locale. */
  locale?: Intl.LocalesArgument
  /** Called by the Join button, shown when the event has a `meetingUrl`. */
  onJoin?: (event: AgendaEvent) => void
}

/** The open island's "Up next" view: how soon, the title, the time and place, and Join. */
function AgendaUpNext({ event, locale, onJoin }: ActivityProps) {
  const left = useUntil(event.start)
  return (
    <div className="flex size-full items-center gap-4">
      <span className="h-14 w-1 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption weight-semibold tabular-nums" style={{ color: event.color }}>
          {relative(left)}
        </span>
        <span className="truncate text-title weight-semibold text-foreground">{event.title}</span>
        <span className="truncate text-body text-muted-foreground">{meta(event, locale)}</span>
      </div>
      {event.meetingUrl && <Join event={event} size="default" onJoin={onJoin} />}
    </div>
  )
}

/** The island's flash a minute before the start: the title, how soon, and Join. */
function AgendaStarting({ event, onJoin }: Omit<ActivityProps, 'locale'>) {
  const left = useUntil(event.start, SECOND)
  return (
    <IslandFlash
      icon={<span className="size-2.5 rounded-full" style={{ backgroundColor: event.color }} />}
      title={event.title}
      caption={relative(left)}
      action={event.meetingUrl && <Join event={event} size="compact" onJoin={onJoin} />}
    />
  )
}

function Row({
  event,
  locale,
  onJoin,
}: {
  event: AgendaEvent
  locale?: Intl.LocalesArgument
  onJoin?: (event: AgendaEvent) => void
}) {
  const size = useSize()
  return (
    <li className={cn('flex items-center gap-3', size.control)}>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
      <span className="w-16 shrink-0 whitespace-nowrap text-caption tabular-nums text-muted-foreground">
        {event.allDay ? 'All day' : clock(event.start, locale)}
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="min-w-0 truncate text-body text-foreground">{event.title}</span>
        {event.location && !event.meetingUrl && (
          <span className="min-w-0 shrink-[100] truncate text-caption text-muted-foreground">{event.location}</span>
        )}
      </span>
      {event.meetingUrl && <Join event={event} size="compact" onJoin={onJoin} />}
    </li>
  )
}

interface DayProps {
  title: string
  events: AgendaEvent[]
  empty: string
  locale?: Intl.LocalesArgument
  onJoin?: (event: AgendaEvent) => void
}

function Day({ title, events, empty, locale, onJoin }: DayProps) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-1 flex-col">
      <h3 className="m-0 flex h-5 items-center text-caption weight-normal text-muted-foreground">{title}</h3>
      {events.length === 0 ? (
        <p className="m-0 flex h-9 items-center text-body text-muted-foreground">{empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {events.map(event => (
            <Row key={event.id} event={event} locale={locale} onJoin={onJoin} />
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * A notch app's calendar: what's left of today and what's on tomorrow, side
 * by side.
 *
 * Each event is a row with its calendar's color as a dot, its start time (or
 * All day), its title and place, and a Join button when it has a video call.
 * Events that have ended drop off; the day boundary is read from `now`, which
 * follows the clock on each minute unless you pin it. Before the calendar may
 * be read it asks to connect (`access="undetermined"`), and when access is
 * off it points to the system's settings (`"denied"`).
 *
 * The countdown to the next event is an activity of parts:
 * `Agenda.Leading` and `Agenda.Trailing` for the compact island's wings (the
 * glyph in the event's color, and `4m` that turns to seconds in the last
 * minute), `Agenda.Minimal`, a ring that empties toward the start, for the
 * split island's bubble, `Agenda.UpNext` for the open island and
 * `Agenda.Starting`, the flash a minute before. Each re-renders only on the
 * edge of the unit it shows.
 *
 * @example {@include ./examples.mdx}
 */
function Agenda({
  events,
  access = 'granted',
  now: nowProp,
  locale,
  onRequestAccess,
  onOpenSettings,
  onJoin,
  className,
}: AgendaProps) {
  const ticking = useEdgeClock(0, nowProp === undefined, MINUTE)
  const now = nowProp ?? ticking

  if (access === 'undetermined')
    return (
      <div className={cn('flex size-full items-center justify-center', className)}>
        <EmptyState
          size="compact"
          icon={CalendarDays}
          title="See what's next"
          description="Today's and tomorrow's events, with a countdown before each one starts."
          actions={
            <Button variant="primary" size="compact" onClick={onRequestAccess}>
              Connect calendar
            </Button>
          }
        />
      </div>
    )

  if (access === 'denied')
    return (
      <div className={cn('flex size-full items-center justify-center', className)}>
        <EmptyState
          size="compact"
          icon={CalendarDays}
          title="Calendar access is off"
          description="Turn it on in Privacy & Security › Calendars."
          actions={
            <Button variant="secondary" size="compact" onClick={onOpenSettings}>
              Open System Settings
            </Button>
          }
        />
      </div>
    )

  const midnight = new Date(now).setHours(24, 0, 0, 0)
  const next = new Date(midnight).setHours(24, 0, 0, 0)
  const live = events.filter(event => event.end > now && event.start < next)
  if (live.length === 0)
    return (
      <div className={cn('flex size-full items-center justify-center', className)}>
        <EmptyState
          size="compact"
          icon={CalendarCheck}
          title="Nothing planned"
          description="No events for the rest of today or tomorrow."
        />
      </div>
    )

  return (
    <div className={cn('flex min-h-full gap-8', className)}>
      <Day
        title="Today"
        events={live.filter(event => event.start < midnight)}
        empty="Nothing else today"
        locale={locale}
        onJoin={onJoin}
      />
      <Day
        title="Tomorrow"
        events={live.filter(event => event.start >= midnight)}
        empty="Nothing planned"
        locale={locale}
        onJoin={onJoin}
      />
    </div>
  )
}

Agenda.Leading = AgendaLeading
Agenda.Trailing = AgendaTrailing
Agenda.Minimal = AgendaMinimal
Agenda.UpNext = AgendaUpNext
Agenda.Starting = AgendaStarting

export default Agenda

export type { AgendaAccess, AgendaEvent, AgendaProps }
export { Agenda, AgendaLeading, AgendaMinimal, AgendaStarting, AgendaTrailing, AgendaUpNext }
