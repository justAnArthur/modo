/*!
 * Local addition: a notch app's weather, the temperature now, the next
 * hours and tomorrow, with the location and loading states around it and a
 * flash before rain. Presentational: the forecast comes in as props, shaped
 * so a host can fill it from Open-Meteo (`conditionFromCode` reads its WMO
 * weather codes).
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Sparkline from '@justanarthur/modo-ui/components/data-display/sparkline'
import { type SizeVariant, useSize } from '@justanarthur/modo-ui/lib/size-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useLift } from '@justanarthur/modo-ui/lib/surface-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Skeleton from '@justanarthur/modo-ui/primitives/content/skeleton'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import {
  ArrowDown,
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudOff,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Droplets,
  LocateOff,
  type LucideIcon,
  MapPin,
  Moon,
  RotateCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  WifiOff,
  Wind,
} from 'lucide-react'
import type { ReactNode } from 'react'
import IslandFlash from '../../../components/island/island-flash'
import Widget, { type WidgetLayout } from '../../../components/island/widget'
import { MINUTE, useEdgeClock } from '../../../lib/clock'

type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'sleet'
  | 'snow'
  | 'thunderstorm'

type WeatherUnit = 'celsius' | 'fahrenheit'
type WeatherAccess = 'granted' | 'undetermined' | 'denied'
type WeatherStatus = 'ready' | 'loading' | 'error' | 'offline'

/** The weather now: Open-Meteo's `current` block. Temperatures in °C, wind in km/h. */
interface WeatherNow {
  /** When it was read, in epoch ms: the "updated" line counts from it. */
  time: number
  temperature: number
  /** How warm it feels, in °C: `apparent_temperature`. */
  apparent?: number
  condition: WeatherCondition
  /** Daylight, for the sun or the moon in the glyph: `is_day`. Defaults to `true`. */
  isDay?: boolean
  /** Wind speed in km/h. */
  wind?: number
  /** Relative humidity, 0–100. */
  humidity?: number
  /** The UV index. */
  uv?: number
}

/** One hour of the forecast: Open-Meteo's `hourly` arrays, zipped. */
interface WeatherHour {
  /** The hour's start, in epoch ms. */
  time: number
  temperature: number
  condition: WeatherCondition
  /** Defaults to `true`. */
  isDay?: boolean
  /** The chance of rain or snow, 0–100: `precipitation_probability`. */
  precipitation?: number
}

/** One day of the forecast: Open-Meteo's `daily` arrays, zipped. */
interface WeatherDay {
  /** The day's start, in epoch ms. */
  date: number
  condition: WeatherCondition
  high: number
  low: number
  /** The day's highest chance of rain or snow, 0–100: `precipitation_probability_max`. */
  precipitation?: number
  /** When the sun rises, in epoch ms: `sunrise`. The tall layout lists today's. */
  sunrise?: number
  /** When the sun sets, in epoch ms: `sunset`. The tall layout lists today's. */
  sunset?: number
}

interface WeatherProps {
  /** Where the forecast is for: a city's name. */
  location?: string
  /** The weather now; without it the widget shows its state (`status`, `access`) or loads. */
  current?: WeatherNow | null
  /** The hourly forecast, in any order: the hours from now on fill the strip. */
  hours?: WeatherHour[]
  /** The daily forecast, today first: today gives the high and low, the next day the Tomorrow row. */
  days?: WeatherDay[]
  /** Shows temperatures in this unit (and wind in mph for `'fahrenheit'`); the data stays in °C and km/h. Defaults to `'celsius'`. */
  unit?: WeatherUnit
  /** Whether the location may be read: undetermined asks, denied points to the system's settings. Defaults to `'granted'`. */
  access?: WeatherAccess
  /** How the last fetch went. `loading` shows placeholders until there is a `current`; `error` and `offline` keep the last forecast up and say so, or explain without one. Defaults to `'ready'`. */
  status?: WeatherStatus
  /** The moment the forecast is read at, in epoch ms. Defaults to now, re-read on each minute. */
  now?: number
  /** Formats the hours. Defaults to the browser's locale. */
  locale?: Intl.LocalesArgument
  /** Called by the refresh button, and by Try again after an error; without it neither shows. */
  onRefresh?: () => void
  /** Called by Allow location while access is undetermined. */
  onRequestAccess?: () => void
  /** Called by Open System Settings while access is denied. */
  onOpenSettings?: () => void
  /** `tall` is the open island's tall snap: the hero larger, the next 24 hours as a scrolling strip with a temperature curve and the chance of rain, the week as rows with a range bar, and the wind, humidity, UV and the sun's times as details. Defaults to `'fit'`. */
  layout?: WidgetLayout
  /** Classes for the root, which fills its container. */
  className?: string
}

const LABEL: Record<WeatherCondition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  'heavy-rain': 'Heavy rain',
  sleet: 'Sleet',
  snow: 'Snow',
  thunderstorm: 'Thunderstorm',
}

const GLYPH: Record<WeatherCondition, LucideIcon> = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  'heavy-rain': CloudRainWind,
  sleet: CloudHail,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
}

// Literal table: UnoCSS only generates the classes it can read whole. The hue is the condition's: sun, water, the rest plain.
const HUE: Record<WeatherCondition, string> = {
  clear: 'text-status-warning',
  'partly-cloudy': 'text-status-warning',
  cloudy: 'text-foreground',
  fog: 'text-foreground',
  drizzle: 'text-status-info',
  rain: 'text-status-info',
  'heavy-rain': 'text-status-info',
  sleet: 'text-status-info',
  snow: 'text-foreground',
  thunderstorm: 'text-status-info',
}

const HERO_GLYPH: Record<SizeVariant, number> = { default: 30, compact: 24 }
const STRIP_GLYPH: Record<SizeVariant, number> = { default: 16, compact: 14 }

const SHEET_GLYPH: Record<SizeVariant, number> = { default: 44, compact: 36 }

/** A chance of rain worth showing, in %. */
const WET = 30
/** Hours the strip shows. */
const HOURS = 6
/** Hours the tall layout's strip scrolls through. */
const DAY_HOURS = 24
/** Days the tall layout lists. */
const WEEK = 7

/**
 * Open-Meteo's `weather_code` (WMO 4677) as a condition.
 *
 * @example conditionFromCode(61) // 'rain'
 */
function conditionFromCode(code: number): WeatherCondition {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 55) return 'drizzle'
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet'
  if (code === 65 || code === 82) return 'heavy-rain'
  if ((code >= 61 && code <= 63) || code === 80 || code === 81) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunderstorm'
  return 'cloudy'
}

/** The glyph for a condition, the moon's at night. */
function glyphFor(condition: WeatherCondition, isDay = true): LucideIcon {
  if (!isDay && condition === 'clear') return Moon
  if (!isDay && condition === 'partly-cloudy') return CloudMoon
  return GLYPH[condition]
}

/** The hue for a condition: the sun's only by day. */
function hueFor(condition: WeatherCondition, isDay = true) {
  if (!isDay && (condition === 'clear' || condition === 'partly-cloudy')) return 'text-foreground'
  return HUE[condition]
}

const degrees = (celsius: number, unit: WeatherUnit) =>
  Math.round(unit === 'fahrenheit' ? (celsius * 9) / 5 + 32 : celsius)

const temp = (celsius: number, unit: WeatherUnit) => `${degrees(celsius, unit)}°`

const speed = (kmh: number, unit: WeatherUnit) =>
  unit === 'fahrenheit' ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`

const hourOf = (ms: number, locale?: Intl.LocalesArgument) =>
  new Date(ms).toLocaleTimeString(locale, { hour: 'numeric' })

const clockOf = (ms: number, locale?: Intl.LocalesArgument) =>
  new Date(ms).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })

/** The UV index in the WHO's words. */
function uvLevel(uv: number) {
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very high'
  return 'Extreme'
}

function ago(ms: number) {
  const minutes = Math.floor(ms / MINUTE)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} h ago`
}

/** The first hour, from `now`, with a chance of rain worth saying, while it isn't raining already. */
function rainAhead(current: WeatherNow, hours: WeatherHour[]) {
  if (HUE[current.condition] === 'text-status-info') return undefined
  return hours.find(hour => (hour.precipitation ?? 0) >= 50)
}

interface GlyphProps {
  condition: WeatherCondition
  isDay?: boolean
  size: number
  className?: string
}

function Glyph({ condition, isDay, size, className }: GlyphProps) {
  const Icon = glyphFor(condition, isDay)
  return <Icon aria-hidden size={size} strokeWidth={1.5} className={cn('shrink-0', className)} />
}

function Hours({ hours, unit, locale }: { hours: WeatherHour[]; unit: WeatherUnit; locale?: Intl.LocalesArgument }) {
  const size = useSize()
  const wet = hours.some(hour => (hour.precipitation ?? 0) >= WET)
  return (
    <div className="flex min-w-0 justify-between">
      {hours.map((hour, i) => (
        <div key={hour.time} className="flex min-w-0 flex-1 flex-col items-center gap-1 tabular-nums">
          <span className="whitespace-nowrap text-caption text-muted-foreground">
            {i === 0 ? 'Now' : hourOf(hour.time, locale)}
          </span>
          <Glyph
            condition={hour.condition}
            isDay={hour.isDay}
            size={STRIP_GLYPH[size.variant]}
            className="text-foreground"
          />
          <span className="text-body text-foreground">{temp(hour.temperature, unit)}</span>
          {wet && (
            <span className="h-4 text-caption text-status-info">
              {(hour.precipitation ?? 0) >= WET && `${hour.precipitation}%`}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function Tomorrow({ day, unit }: { day: WeatherDay; unit: WeatherUnit }) {
  return (
    <Widget.Row
      leading="Tomorrow"
      trailing={
        <>
          {(day.precipitation ?? 0) >= WET && <span className="text-status-info">{day.precipitation}%</span>}
          <span className="text-foreground">{temp(day.high, unit)}</span>
          <span>{temp(day.low, unit)}</span>
        </>
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        <Glyph condition={day.condition} size={14} className="text-muted-foreground" />
        <span className="truncate">{LABEL[day.condition]}</span>
      </span>
    </Widget.Row>
  )
}

interface StripProps {
  hours: WeatherHour[]
  unit: WeatherUnit
  locale?: Intl.LocalesArgument
}

/** The tall layout's day ahead: a column per hour (hour, glyph, temperature, chance of rain) with the temperature's curve through them, scrolling sideways. */
function HourStrip({ hours, unit, locale }: StripProps) {
  const size = useSize()
  const temperatures = hours.map(hour => hour.temperature)
  const low = Math.min(...temperatures)
  const wet = hours.some(hour => (hour.precipitation ?? 0) >= WET)
  return (
    <ScrollArea orientation="horizontal" viewportClassName="scroll-fade-x">
      <div className="flex w-max flex-col gap-1.5 pb-3 tabular-nums">
        <div className="flex">
          {hours.map((hour, i) => (
            <div key={hour.time} className="flex w-12 shrink-0 flex-col items-center gap-1.5">
              <span className="whitespace-nowrap text-caption text-muted-foreground">
                {i === 0 ? 'Now' : hourOf(hour.time, locale)}
              </span>
              <Glyph
                condition={hour.condition}
                isDay={hour.isDay}
                size={STRIP_GLYPH[size.variant]}
                className={hueFor(hour.condition, hour.isDay)}
              />
            </div>
          ))}
        </div>
        {/* Inset half a column, so each point sits over its hour. */}
        <div className="px-6">
          <Sparkline
            values={temperatures.map(value => value - low)}
            max={Math.max(...temperatures) - low}
            label={`Temperature over the next ${hours.length} hours`}
            tone="muted"
          />
        </div>
        <div className="flex">
          {hours.map(hour => (
            <div key={hour.time} className="flex w-12 shrink-0 flex-col items-center gap-0.5">
              <span className="text-body text-foreground">{temp(hour.temperature, unit)}</span>
              {wet && (
                <span className="h-4 text-caption text-status-info">
                  {(hour.precipitation ?? 0) >= WET && `${hour.precipitation}%`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}

interface WeekProps {
  days: WeatherDay[]
  unit: WeatherUnit
  locale?: Intl.LocalesArgument
}

/** The tall layout's week: a row per day, its low and high on a bar spanning the week's range. */
function Week({ days, unit, locale }: WeekProps) {
  const low = Math.min(...days.map(day => day.low))
  const span = Math.max(...days.map(day => day.high)) - low || 1
  return days.map((day, i) => (
    <div key={day.date} className="flex h-8 min-w-0 items-center gap-3 text-body tabular-nums">
      <span className="w-12 shrink-0 truncate text-foreground">
        {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString(locale, { weekday: 'short' })}
      </span>
      <Glyph condition={day.condition} size={16} className={hueFor(day.condition)} />
      <span className="w-9 shrink-0 text-caption text-status-info">
        {(day.precipitation ?? 0) >= WET && `${day.precipitation}%`}
      </span>
      <span className="w-8 shrink-0 text-right text-muted-foreground">{temp(day.low, unit)}</span>
      <span className="relative h-1 min-w-12 flex-1 rounded-full bg-active">
        <span
          className="absolute inset-y-0 rounded-full bg-foreground"
          style={{ left: `${((day.low - low) / span) * 100}%`, width: `${((day.high - day.low) / span) * 100}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-foreground">{temp(day.high, unit)}</span>
    </div>
  ))
}

interface DetailProps {
  icon: LucideIcon
  label: string
  children: ReactNode
}

/** One fact of the tall layout's details: a glyph, what it is, muted, and its value. */
function Detail({ icon: Icon, label, children }: DetailProps) {
  return (
    <div className="flex h-8 min-w-0 items-center gap-2 text-body">
      <Icon aria-hidden size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 whitespace-nowrap tabular-nums text-foreground">{children}</span>
    </div>
  )
}

/** The widget's shape while the first forecast loads: the header, the hero and the strip as placeholders. */
function Loading({ location, className }: { location?: string; className?: string }) {
  return (
    <Widget
      className={className}
      aside={
        <div aria-hidden className="flex flex-col gap-3">
          <Skeleton className="h-3 w-20" />
          <div className="flex justify-between">
            {Array.from({ length: HOURS }, (_, i) => (
              <Skeleton key={i} className="h-14 w-7" />
            ))}
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      }
    >
      <div aria-busy className="flex min-w-0 flex-col gap-2">
        <Widget.Header icon={MapPin}>{location ?? 'Finding you…'}</Widget.Header>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
    </Widget>
  )
}

interface PartProps {
  /** The weather now. */
  current: WeatherNow
}

/** The compact island's left wing: the condition's glyph in its hue. */
function WeatherLeading({ current }: PartProps) {
  return (
    <Glyph
      condition={current.condition}
      isDay={current.isDay}
      size={16}
      className={hueFor(current.condition, current.isDay)}
    />
  )
}

/** The compact island's right wing: the temperature. */
function WeatherTrailing({ current, unit = 'celsius' }: PartProps & { unit?: WeatherUnit }) {
  return (
    <span className="text-caption weight-semibold text-foreground tabular-nums">{temp(current.temperature, unit)}</span>
  )
}

/** The split island's bubble: the condition's glyph on a disc. */
function WeatherMinimal({ current }: PartProps) {
  const level = useLift(1)
  return (
    <span
      role="img"
      aria-label={LABEL[current.condition]}
      className={cn(
        'flex size-6 items-center justify-center rounded-full',
        SURFACE_BG[level],
        hueFor(current.condition, current.isDay),
      )}
    >
      <Glyph condition={current.condition} isDay={current.isDay} size={14} />
    </span>
  )
}

type WeatherAlertSeverity = 'notice' | 'warning' | 'severe'

// Literal tables: UnoCSS only generates the classes it can read whole.
const ALERT_TILE: Record<WeatherAlertSeverity, string> = {
  notice: 'bg-status-info/16 text-status-info',
  warning: 'bg-status-warning/16 text-status-warning',
  severe: 'bg-status-error/16 text-status-error',
}

interface WeatherAlertProps {
  /** What is coming: its glyph, and the title's noun. */
  condition: WeatherCondition
  /** When it starts, in epoch ms: the title counts down to it, `Rain in 15 min`, on each minute. */
  startsAt?: number
  /** The title in place of the countdown, for a warning: `Thunderstorm warning`. */
  title?: string
  /** One line more: how long, how much. */
  caption?: string
  /** How serious: the tile's hue, info, warning or error. Defaults to `'notice'`. */
  severity?: WeatherAlertSeverity
  /** The button's label. Defaults to `'Details'`. */
  actionLabel?: string
  /** Called by the button; without it the button hides. */
  onAction?: () => void
}

/** The island's flash before the weather turns: `Rain in 15 min`, or a warning, with one action. */
function WeatherAlert({
  condition,
  startsAt,
  title,
  caption,
  severity = 'notice',
  actionLabel = 'Details',
  onAction,
}: WeatherAlertProps) {
  const now = useEdgeClock(startsAt ?? 0, startsAt !== undefined && title === undefined, MINUTE)
  const left = startsAt === undefined ? 0 : Math.ceil((startsAt - now) / MINUTE)
  const heading = title ?? (left > 0 ? `${LABEL[condition]} in ${left} min` : `${LABEL[condition]} now`)
  return (
    <IslandFlash
      icon={
        <span className={cn('flex size-9 items-center justify-center rounded-lg', ALERT_TILE[severity])}>
          <Glyph condition={condition} size={16} />
        </span>
      }
      title={heading}
      caption={caption}
      action={
        onAction && (
          <Button variant="secondary" size="compact" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      }
    />
  )
}

/**
 * A notch app's weather: the temperature now as the hero, the next hours
 * and tomorrow beside it.
 *
 * The hero is the temperature in display type after the condition's glyph,
 * in its hue (the sun's amber, rain's blue, the rest plain); under it the
 * condition, how warm it feels and, when the next hours turn wet, around
 * when. The meta line carries today's high and low, the chance of rain,
 * the wind, and the humidity and UV index when given, the last giving way
 * first. The header names the place and how long ago the forecast was
 * read, with a refresh button when `onRefresh` is given. Beside it, past a
 * hairline, the next six hours as a strip of hour, glyph and temperature,
 * with the chance of rain under each once any hour is wet, then tomorrow as
 * a row.
 *
 * The data is Open-Meteo's shape, zipped into objects: `current`, `hours`
 * and `days` (today first), in °C and km/h; `unit="fahrenheit"` converts
 * what it shows, wind in mph. `conditionFromCode` turns a WMO weather code
 * into a condition.
 *
 * Before the location may be read it asks for it (`access="undetermined"`),
 * and when access is off it says where to turn it on (`"denied"`). The
 * first fetch shows placeholders (`status="loading"`); a failed one says so
 * with Try again (`"error"`), and offline it says it will update when back
 * (`"offline"`). Once there is a forecast, those keep it up and say so in
 * the header instead.
 *
 * At the open island's tall snap (`layout="tall"`) it becomes a sheet: the
 * hero larger, the condition, how warm it feels and today's high and low
 * beside it; then the next 24 hours as a strip that scrolls sideways, each
 * hour's glyph and temperature with the temperature's curve running through
 * them and the chance of rain under each once any hour is wet; then, split
 * by a hairline, the week as rows of day, glyph, chance of rain and the low
 * and high on a bar spanning the week's range, and beside it the details:
 * how warm it feels, the wind, the humidity, the UV index in words and
 * today's sunrise and sunset (`sunrise` / `sunset` on the day).
 *
 * The other forms are parts: `Weather.Leading` and `Weather.Trailing` for
 * the compact island's wings (the glyph and the temperature),
 * `Weather.Minimal`, the glyph on a disc, for the split island's bubble,
 * and `Weather.Alert`, the flash before rain or a warning. Nothing ticks but
 * the minute of the "updated" line.
 *
 * @example {@include ./examples.mdx}
 */
const Weather = Object.assign(
  function Weather({
    location,
    current,
    hours = [],
    days = [],
    unit = 'celsius',
    access = 'granted',
    status = 'ready',
    now: nowProp,
    locale,
    onRefresh,
    onRequestAccess,
    onOpenSettings,
    layout = 'fit',
    className,
  }: WeatherProps) {
    const size = useSize()
    const ticking = useEdgeClock(current?.time ?? 0, nowProp === undefined, MINUTE)
    const now = nowProp ?? ticking

    if (access === 'undetermined')
      return (
        <Widget.Message
          layout={layout}
          icon={MapPin}
          title="Weather where you are"
          description="The temperature now, the next hours and tomorrow, for your location."
          actions={
            <Button variant="primary" size="compact" onClick={onRequestAccess}>
              Allow location
            </Button>
          }
          className={className}
        />
      )

    if (access === 'denied')
      return (
        <Widget.Message
          layout={layout}
          icon={LocateOff}
          title="Location access is off"
          description="Turn it on in System Settings › Privacy & Security › Location Services."
          actions={
            <Button variant="secondary" size="compact" onClick={onOpenSettings}>
              Open System Settings
            </Button>
          }
          className={className}
        />
      )

    if (!current && status === 'error')
      return (
        <Widget.Message
          layout={layout}
          icon={CloudOff}
          title="Couldn't load the weather"
          description="The forecast service didn't answer. It tries again on its own in a few minutes."
          actions={
            onRefresh && (
              <Button variant="secondary" size="compact" onClick={onRefresh}>
                Try again
              </Button>
            )
          }
          className={className}
        />
      )

    if (!current && status === 'offline')
      return (
        <Widget.Message
          layout={layout}
          icon={WifiOff}
          title="You're offline"
          description="The forecast loads as soon as you're back online."
          className={className}
        />
      )

    if (!current) return <Loading location={location} className={className} />

    const hourStart = new Date(now).setMinutes(0, 0, 0)
    const ahead = hours.filter(hour => hour.time >= hourStart).sort((a, b) => a.time - b.time)
    const [today, tomorrow] = days
    const rain = rainAhead(current, ahead)
    const fresh = ago(Math.max(0, now - current.time))
    const freshness =
      status === 'offline' ? `Offline · ${fresh}` : status === 'error' ? `Not updated · ${fresh}` : fresh
    const feels = current.apparent !== undefined && `Feels like ${temp(current.apparent, unit)}`
    const soon = rain && `${LABEL[rain.condition]} around ${hourOf(rain.time, locale)}`
    const header = (
      <Widget.Header
        icon={MapPin}
        trailing={
          <>
            <span className="whitespace-nowrap pr-1 text-caption">{freshness}</span>
            {onRefresh && <Widget.Action icon={RotateCw} label="Refresh" onClick={onRefresh} />}
          </>
        }
      >
        {location ?? 'Current location'}
      </Widget.Header>
    )

    if (layout === 'tall') {
      const week = days.slice(0, WEEK)
      return (
        <Widget.Sheet className={className}>
          <div className="flex min-w-0 flex-col gap-2">
            {header}
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex shrink-0 items-center gap-3">
                <Glyph
                  condition={current.condition}
                  isDay={current.isDay}
                  size={SHEET_GLYPH[size.variant]}
                  className={hueFor(current.condition, current.isDay)}
                />
                <Widget.Figure value={degrees(current.temperature, unit)} unit={unit === 'fahrenheit' ? '°F' : '°C'} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Widget.Title>{LABEL[current.condition]}</Widget.Title>
                {today && (
                  <Widget.Subtitle>
                    {[`H ${temp(today.high, unit)}`, `L ${temp(today.low, unit)}`, soon].filter(Boolean).join(' · ')}
                  </Widget.Subtitle>
                )}
              </div>
            </div>
          </div>

          {ahead.length > 1 && (
            <Widget.Section label="Next 24 hours">
              <HourStrip hours={ahead.slice(0, DAY_HOURS)} unit={unit} locale={locale} />
            </Widget.Section>
          )}

          <div className="flex min-w-0 items-start gap-5">
            {week.length > 0 && (
              <Widget.Section label={`${week.length}-day forecast`} className="flex-1">
                <Week days={week} unit={unit} locale={locale} />
              </Widget.Section>
            )}
            <Widget.Section label="Details" className="w-[38%] shrink-0 border-l border-border pl-5">
              {current.apparent !== undefined && (
                <Detail icon={Thermometer} label="Feels like">
                  {temp(current.apparent, unit)}
                </Detail>
              )}
              {today?.precipitation !== undefined && (
                <Detail icon={Umbrella} label="Chance of rain">
                  {today.precipitation}%
                </Detail>
              )}
              {current.wind !== undefined && (
                <Detail icon={Wind} label="Wind">
                  {speed(current.wind, unit)}
                </Detail>
              )}
              {current.humidity !== undefined && (
                <Detail icon={Droplets} label="Humidity">
                  {Math.round(current.humidity)}%
                </Detail>
              )}
              {current.uv !== undefined && (
                <Detail icon={Sun} label="UV index">
                  {Math.round(current.uv)} · {uvLevel(current.uv)}
                </Detail>
              )}
              {today?.sunrise !== undefined && (
                <Detail icon={Sunrise} label="Sunrise">
                  {clockOf(today.sunrise, locale)}
                </Detail>
              )}
              {today?.sunset !== undefined && (
                <Detail icon={Sunset} label="Sunset">
                  {clockOf(today.sunset, locale)}
                </Detail>
              )}
            </Widget.Section>
          </div>
        </Widget.Sheet>
      )
    }

    return (
      <Widget
        className={className}
        aside={
          ahead.length > 0 && (
            <>
              <Widget.Section label="Next hours">
                <Hours hours={ahead.slice(0, HOURS)} unit={unit} locale={locale} />
              </Widget.Section>
              {tomorrow && (
                <div className="mt-1.5">
                  <Tomorrow day={tomorrow} unit={unit} />
                </div>
              )}
            </>
          )
        }
      >
        {header}

        <div className="flex min-w-0 items-center gap-2.5">
          <Glyph
            condition={current.condition}
            isDay={current.isDay}
            size={HERO_GLYPH[size.variant]}
            className={hueFor(current.condition, current.isDay)}
          />
          <Widget.Figure value={degrees(current.temperature, unit)} unit={unit === 'fahrenheit' ? '°F' : '°C'} />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <Widget.Title>{LABEL[current.condition]}</Widget.Title>
          {(feels || soon) && <Widget.Subtitle>{[feels, soon].filter(Boolean).join(' · ')}</Widget.Subtitle>}
        </div>

        <Widget.Meta className="mt-1">
          {today && (
            <>
              <Widget.MetaItem icon={ArrowUp}>{temp(today.high, unit)}</Widget.MetaItem>
              <Widget.MetaItem icon={ArrowDown}>{temp(today.low, unit)}</Widget.MetaItem>
            </>
          )}
          {today?.precipitation !== undefined && (
            <Widget.MetaItem icon={Umbrella}>{today.precipitation}%</Widget.MetaItem>
          )}
          {current.wind !== undefined && <Widget.MetaItem icon={Wind}>{speed(current.wind, unit)}</Widget.MetaItem>}
          {current.humidity !== undefined && (
            <Widget.MetaItem icon={Droplets}>{Math.round(current.humidity)}%</Widget.MetaItem>
          )}
          {current.uv !== undefined && <Widget.MetaItem icon={Sun}>UV {Math.round(current.uv)}</Widget.MetaItem>}
        </Widget.Meta>
      </Widget>
    )
  },
  {
    Leading: WeatherLeading,
    Trailing: WeatherTrailing,
    Minimal: WeatherMinimal,
    Alert: WeatherAlert,
  },
)

export default Weather

export type {
  WeatherAccess,
  WeatherAlertProps,
  WeatherAlertSeverity,
  WeatherCondition,
  WeatherDay,
  WeatherHour,
  WeatherNow,
  WeatherProps,
  WeatherStatus,
  WeatherUnit,
}
export { conditionFromCode, Weather, WeatherAlert, WeatherLeading, WeatherMinimal, WeatherTrailing }
