/*!
 * Mock: a forecast in Open-Meteo's shape for the weather's docs, read at
 * today 14:20, and the island scenes around it. Nothing here ships in the
 * barrel.
 */

'use client'

import { CloudSun } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import Weather, { type WeatherDay, type WeatherHour, type WeatherNow } from '../blocks/activities/weather'
import { FlashIsland, WingsIsland } from './island-content'
import { TabIsland } from './tab-island'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const today = (hours: number, minutes = 0) => new Date().setHours(hours, minutes, 0, 0)

/** The moment the forecast is read at: today, 14:20. */
export const WEATHER_NOW = today(14, 20)

export const WEATHER_LOCATION = 'Bratislava'

export const CURRENT: WeatherNow = {
  time: WEATHER_NOW - 5 * MINUTE,
  temperature: 18.4,
  apparent: 16.2,
  condition: 'partly-cloudy',
  isDay: true,
  wind: 12,
  humidity: 64,
  uv: 4,
}

// Temperature, condition and chance of rain from 14:00 on: a dry afternoon that turns wet by evening.
const AFTERNOON: [number, WeatherHour['condition'], number][] = [
  [18.4, 'partly-cloudy', 5],
  [19.1, 'partly-cloudy', 10],
  [18.6, 'cloudy', 20],
  [17.2, 'cloudy', 45],
  [15.8, 'rain', 70],
  [14.9, 'rain', 80],
  [14.1, 'drizzle', 40],
  [13.5, 'cloudy', 20],
]

export const HOURS: WeatherHour[] = AFTERNOON.map(([temperature, condition, precipitation], i) => ({
  time: today(14) + i * HOUR,
  temperature,
  condition,
  isDay: 14 + i < 17,
  precipitation,
}))

/** A clear night: the same strip, read at 22:00. */
export const NIGHT: { current: WeatherNow; hours: WeatherHour[] } = {
  current: { ...CURRENT, time: today(22), temperature: 9.2, apparent: 7.4, condition: 'clear', isDay: false, uv: 0 },
  hours: Array.from({ length: 6 }, (_, i) => ({
    time: today(22) + i * HOUR,
    temperature: 9 - i * 0.6,
    condition: i < 3 ? 'clear' : 'partly-cloudy',
    isDay: false,
    precipitation: 0,
  })),
}

export const DAYS: WeatherDay[] = [
  { date: today(0), condition: 'rain', high: 19.6, low: 11.2, precipitation: 80 },
  { date: today(24), condition: 'drizzle', high: 16.1, low: 9.4, precipitation: 40 },
]

/** The forecast for `Weather`'s props. */
export const FORECAST = { location: WEATHER_LOCATION, current: CURRENT, hours: HOURS, days: DAYS, now: WEATHER_NOW }

const TAB = { value: 'weather', label: 'Weather', icon: CloudSun }

/** The open island on a Weather tab, after the calendar. */
export function WeatherIsland({ children }: { children: ReactNode }) {
  return <TabIsland tab={TAB}>{children}</TabIsland>
}

/** The weather in the compact island's wings. */
export function WeatherWings() {
  return (
    <WingsIsland leading={<Weather.Leading current={CURRENT} />} trailing={<Weather.Trailing current={CURRENT} />} />
  )
}

/** The weather in the wings, a clear night's glyph on the bubble. */
export function WeatherSplit() {
  return (
    <WingsIsland
      leading={<Weather.Leading current={CURRENT} />}
      trailing={<Weather.Trailing current={CURRENT} />}
      minimal={<Weather.Minimal current={NIGHT.current} />}
    />
  )
}

/** Rain a quarter of an hour out, made once. */
export function RainSoonFlash() {
  const startsAt = useState(() => Date.now() + 15 * MINUTE)[0]
  return (
    <FlashIsland>
      <Weather.Alert
        condition="rain"
        startsAt={startsAt}
        caption="Light rain for about an hour · 70%"
        onAction={() => {}}
      />
    </FlashIsland>
  )
}
