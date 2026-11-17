/*!
 * Local addition: a notch app's calendar, the next event and the rest of
 * today and tomorrow, with the countdown to the next one. Rebuilt from Just
 * Notch's calendar plugin (`Agenda`, `Upcoming`, `Starting`, `Ring`,
 * `Countdown`) as presentational parts: events, access and actions come in
 * as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import type { SizeVariant } from '@justanarthur/modo-ui/lib/size-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { CalendarCheck, CalendarDays, ChevronDown, ChevronUp, Clock, Lock, MapPin, Video } from 'lucide-react'
import IslandFlash from '../../../components/island/island-flash'
import Widget from '../../../components/island/widget'
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
  /** Its calendar's color, any CSS color: data, so it paints the dot, the mark and the ring inline. */
  color: string
}

interface AgendaProps {
  /** The events, in any order. */
  events: AgendaEvent[]
  /** Whether the calendar may be read: undetermined asks, denied points to the system's settings. Defaults to `'granted'`. */
  access?: AgendaAccess
  /** The moment the agenda is read at, in epoch ms. Defaults to now, re-read on each minute. */
  now?: number
  /** Formats the times and the date. Defaults to the browser's locale. */
  locale?: Intl.LocalesArgument
  /** Tomorrow's events are unfolded (controlled); folded, only its first shows. */
  tomorrowOpen?: boolean
  /** Tomorrow's events are unfolded at first (uncontrolled). Defaults to `false`. */
  defaultTomorrowOpen?: boolean
  /** Called with the new state when tomorrow's fold is pressed. */
  onTomorrowOpenChange?: (open: boolean) => void
  /** Called by Connect calendar while access is undetermined. */
  onRequestAccess?: () => void
  /** Called by Open System Settings while access is denied. */
  onOpenSettings?: () => void
  /** Called by the next event's Join button. */
  onJoin?: (event: AgendaEvent) => void
  /** Classes for the root, which fills its container. */
  className?: string
}

/** Rows the timeline lists per day before it says how many more. */
const ROWS = 3

const time = (ms: number, locale?: Intl.LocalesArgument) =>
  new Date(ms).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })

/** A time split into its figure and its day period: `4:00` and `PM`, or `16:00` alone. */
function timeParts(ms: number, locale?: Intl.LocalesArgument) {
  const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).formatToParts(ms)
  const period = parts.find(part => part.type === 'dayPeriod')?.value
  const value = parts
    .filter(part => part.type !== 'dayPeriod')
    .map(part => part.value)
    .join('')
    .trim()
  return { value, period }
}

const range = (event: AgendaEvent, locale?: Intl.LocalesArgument) =>
  `${time(event.start, locale)} – ${time(event.end, locale)}`

function length(ms: number) {
  const minutes = Math.round(ms / MINUTE)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`
}

/** The time until `start`, re-read on each `unit` edge before it, never in between. */
function useUntil(start: number, unit = MINUTE) {
  const now = useEdgeClock(start, Date.now() < start + SECOND, unit)
  return start - now
}

function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
  )
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
    <Button variant="primary" size={size} leadingIcon={Video} onClick={() => onJoin?.(event)}>
      Join
    </Button>
  )
}

interface HeroProps {
  event: AgendaEvent
  now: number
  midnight: number
  locale?: Intl.LocalesArgument
  onJoin?: (event: AgendaEvent) => void
}

/** How soon, as the figure: `in 12 min` within the hour, `Now` while on, else the start time. */
function When({ event, now, midnight, locale }: Omit<HeroProps, 'onJoin'>) {
  if (event.start <= now) return <Widget.Figure value="Now" unit={`${length(event.end - now)} left`} />
  if (event.start - now < 60 * MINUTE)
    return <Widget.Figure prefix="in" value={Math.max(1, Math.ceil((event.start - now) / MINUTE))} unit="min" />
  const { value, period } = timeParts(event.start, locale)
  return <Widget.Figure prefix={event.start >= midnight ? 'Tomorrow' : 'at'} value={value} unit={period} />
}

/** The next event, set as the widget's hero: how soon, its title in its calendar's color, when and where, and Join. */
function Hero({ event, now, midnight, locale, onJoin }: HeroProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-end justify-between gap-3">
        <When event={event} now={now} midnight={midnight} locale={locale} />
        {event.meetingUrl && <Join event={event} size="compact" onJoin={onJoin} />}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title leading={<Dot color={event.color} />}>{event.title}</Widget.Title>
        <Widget.Meta className="pl-4.5">
          <Widget.MetaItem icon={Clock}>{range(event, locale)}</Widget.MetaItem>
          {event.meetingUrl && <Widget.MetaItem icon={Video}>Video call</Widget.MetaItem>}
          {event.location && <Widget.MetaItem icon={MapPin}>{event.location}</Widget.MetaItem>}
        </Widget.Meta>
      </div>
    </div>
  )
}

function Rows({ events, locale }: { events: AgendaEvent[]; locale?: Intl.LocalesArgument }) {
  return events.map(event => (
    <Widget.Row
      key={event.id}
      leading={time(event.start, locale)}
      color={event.color}
      trailing={
        event.meetingUrl ? (
          <Video size={12} strokeWidth={1.5} aria-label="Video call" />
        ) : (
          event.location && <span className="max-w-24 truncate">{event.location}</span>
        )
      }
    >
      {event.title}
    </Widget.Row>
  ))
}

function More({ count }: { count: number }) {
  if (count <= 0) return null
  return <span className="flex h-6 items-center pl-17.5 text-caption text-muted-foreground">{count} more</span>
}

interface PartProps {
  /** The event the activity counts down to. */
  event: AgendaEvent
}

/** The compact island's left wing: the calendar glyph in the event's color. */
function AgendaLeading({ event }: PartProps) {
  return <CalendarDays size={16} strokeWidth={1.5} style={{ color: event.color }} />
}

/** The compact island's right wing: the event's color dot and the time until it starts, `12m` then `45s`. */
function AgendaTrailing({ event }: PartProps) {
  const left = useUntil(event.start)
  return (
    <span className="flex items-center gap-1 text-caption weight-semibold text-foreground tabular-nums">
      <Dot color={event.color} className="size-1.5" />
      {left > 0 ? formatShort(left / SECOND) : 'now'}
    </span>
  )
}

interface MinimalProps extends PartProps {
  /** How long before the start the countdown opens, in ms: the full ring. Defaults to 10 minutes. */
  lead?: number
}

const RING = 2 * Math.PI * 8

/** The split island's bubble: a ring in the event's color that empties as the start nears. */
function AgendaMinimal({ event, lead = 10 * MINUTE }: MinimalProps) {
  const left = Math.max(0, useUntil(event.start, SECOND))
  const share = Math.min(1, left / lead)
  return (
    <svg
      role="img"
      aria-label={`${event.title}, in ${formatShort(left / SECOND)}`}
      viewBox="0 0 20 20"
      className="size-5.5 -rotate-90"
    >
      <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" className="stroke-current text-border" />
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - share)}
        style={{ stroke: event.color }}
      />
    </svg>
  )
}

interface ActivityProps extends PartProps {
  /** Formats the times. Defaults to the browser's locale. */
  locale?: Intl.LocalesArgument
  /** Called by the Join button, shown when the event has a `meetingUrl`. */
  onJoin?: (event: AgendaEvent) => void
}

/** The open island's "Up next" view: the next event alone, as the agenda's hero. */
function AgendaUpNext({ event, locale, onJoin }: ActivityProps) {
  const now = event.start - useUntil(event.start)
  return (
    <Widget>
      <Hero event={event} now={now} midnight={new Date(now).setHours(24, 0, 0, 0)} locale={locale} onJoin={onJoin} />
    </Widget>
  )
}

/** The island's flash a minute before the start: the calendar's color, the title, how soon and where, and Join. */
function AgendaStarting({ event, onJoin }: Omit<ActivityProps, 'locale'>) {
  const left = useUntil(event.start, SECOND)
  const when = left > 0 ? `Starts in ${formatShort(left / SECOND)}` : 'Starting now'
  return (
    <IslandFlash
      icon={
        <span
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ color: event.color, backgroundColor: `color-mix(in oklab, ${event.color} 22%, transparent)` }}
        >
          {event.meetingUrl ? <Video size={16} strokeWidth={1.5} /> : <CalendarDays size={16} strokeWidth={1.5} />}
        </span>
      }
      title={event.title}
      caption={event.location ? `${when} · ${event.location}` : when}
      action={event.meetingUrl && <Join event={event} size="compact" onJoin={onJoin} />}
    />
  )
}

/**
 * A notch app's calendar: the next event as the hero, the rest of today and
 * tomorrow beside it.
 *
 * The hero is how soon the next event is, set large: `in 12 min` within the
 * hour, `Now` with the time left while it runs, else its start time. Under
 * it the title after its calendar's color, the time range, the place and
 * whether it's a call, and a Join button when it has a `meetingUrl`. Today's
 * all-day events are chips on the date line above. Beside it, past a
 * hairline, the timeline: the rest of today as rows of start time, color
 * mark and title, then tomorrow folded to its first event
 * (`tomorrowOpen` / `onTomorrowOpenChange`, or kept here). Ended events drop
 * off; `now` follows the clock on each minute unless you pin it.
 *
 * Before the calendar may be read it asks to connect
 * (`access="undetermined"`), and when access is off it says where to turn it
 * on (`"denied"`).
 *
 * The countdown to the next event is an activity of parts:
 * `Agenda.Leading` and `Agenda.Trailing` for the compact island's wings (the
 * glyph in the event's color, and its dot with `12m` that turns to seconds
 * in the last minute), `Agenda.Minimal`, a ring in its color that empties
 * toward the start, for the split island's bubble, `Agenda.UpNext` for the
 * open island and `Agenda.Starting`, the flash a minute before. Each
 * re-renders only on the edge of the unit it shows.
 *
 * @example {@include ./examples.mdx}
 */
const Agenda = Object.assign(
  function Agenda({
    events,
    access = 'granted',
    now: nowProp,
    locale,
    tomorrowOpen: tomorrowOpenProp,
    defaultTomorrowOpen = false,
    onTomorrowOpenChange,
    onRequestAccess,
    onOpenSettings,
    onJoin,
    className,
  }: AgendaProps) {
    const ticking = useEdgeClock(0, nowProp === undefined, MINUTE)
    const now = nowProp ?? ticking
    const [tomorrowOpen, setTomorrowOpen] = useControllableState(
      tomorrowOpenProp,
      defaultTomorrowOpen,
      onTomorrowOpenChange,
    )

    if (access === 'undetermined')
      return (
        <Widget.Message
          icon={CalendarDays}
          title="See what's next"
          description="Your next event with a countdown, and the rest of today and tomorrow."
          actions={
            <Button variant="primary" size="compact" onClick={onRequestAccess}>
              Connect calendar
            </Button>
          }
          className={className}
        />
      )

    if (access === 'denied')
      return (
        <Widget.Message
          icon={Lock}
          title="Calendar access is off"
          description="Turn it on in System Settings › Privacy & Security › Calendars."
          actions={
            <Button variant="secondary" size="compact" onClick={onOpenSettings}>
              Open System Settings
            </Button>
          }
          className={className}
        />
      )

    const midnight = new Date(now).setHours(24, 0, 0, 0)
    const next = new Date(midnight).setHours(24, 0, 0, 0)
    const live = events.filter(event => event.end > now && event.start < next).sort((a, b) => a.start - b.start)
    const allDay = live.filter(event => event.allDay && event.start < midnight)
    const timed = live.filter(event => !event.allDay)
    const [hero] = timed

    if (!hero)
      return (
        <Widget.Message
          icon={CalendarCheck}
          title={allDay.length ? allDay.map(event => event.title).join(', ') : 'Nothing planned'}
          description={
            allDay.length ? 'All day today; nothing else on the calendar.' : 'No more events today or tomorrow.'
          }
          className={className}
        />
      )

    const today = timed.filter(event => event !== hero && event.start < midnight)
    const tomorrow = timed.filter(event => event !== hero && event.start >= midnight)
    const tomorrowShown = tomorrowOpen ? tomorrow.slice(0, ROWS) : tomorrow.slice(0, 1)
    const date = new Date(now).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })

    return (
      <Widget
        className={className}
        aside={
          <>
            <Widget.Section label="Later today">
              {today.length ? (
                <Rows events={today.slice(0, ROWS)} locale={locale} />
              ) : (
                <span className="flex h-7 items-center text-body text-muted-foreground">Nothing else today</span>
              )}
              <More count={today.length - ROWS} />
            </Widget.Section>
            {tomorrow.length > 0 && (
              <Widget.Section
                className="mt-1"
                label="Tomorrow"
                trailing={
                  tomorrow.length > 1 && (
                    <Button
                      variant="ghost"
                      size="compact"
                      className="-mr-2 h-6 px-2"
                      aria-expanded={tomorrowOpen}
                      trailingIcon={tomorrowOpen ? ChevronUp : ChevronDown}
                      onClick={() => setTomorrowOpen(!tomorrowOpen)}
                    >
                      {tomorrowOpen ? 'Less' : `${tomorrow.length - 1} more`}
                    </Button>
                  )
                }
              >
                <Rows events={tomorrowShown} locale={locale} />
                {tomorrowOpen && <More count={tomorrow.length - ROWS} />}
              </Widget.Section>
            )}
          </>
        }
      >
        <Widget.Header
          icon={CalendarDays}
          trailing={allDay.map(event => (
            <Widget.Chip key={event.id} color={event.color}>
              {event.title}
            </Widget.Chip>
          ))}
        >
          {date}
        </Widget.Header>
        <Hero event={hero} now={now} midnight={midnight} locale={locale} onJoin={onJoin} />
      </Widget>
    )
  },
  {
    Leading: AgendaLeading,
    Trailing: AgendaTrailing,
    Minimal: AgendaMinimal,
    UpNext: AgendaUpNext,
    Starting: AgendaStarting,
  },
)

export default Agenda

export type { AgendaAccess, AgendaEvent, AgendaProps }
export { Agenda, AgendaLeading, AgendaMinimal, AgendaStarting, AgendaTrailing, AgendaUpNext }
