/*!
 * Mock: a forecast in Open-Meteo's shape for the weather's docs, read at
 * today 14:20, and the island scenes around it. Nothing here ships in the
 * barrel.
 */

'use client'

import { useState } from 'react'
import Weather, { type WeatherDay, type WeatherHour, type WeatherNow } from '../blocks/activities/weather'
import { FlashIsland, WingsIsland } from './screen'

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

// Temperature, condition and chance of rain for a day from 14:00 on: a dry afternoon that turns wet by
// evening, clears overnight and comes up bright.
const DAY_AHEAD: [number, WeatherHour['condition'], number][] = [
  [18.4, 'partly-cloudy', 5],
  [19.1, 'partly-cloudy', 10],
  [18.6, 'cloudy', 20],
  [17.2, 'cloudy', 45],
  [15.8, 'rain', 70],
  [14.9, 'rain', 80],
  [14.1, 'drizzle', 40],
  [13.5, 'cloudy', 20],
  [13.0, 'cloudy', 15],
  [12.6, 'partly-cloudy', 10],
  [12.1, 'partly-cloudy', 5],
  [11.7, 'clear', 0],
  [11.4, 'clear', 0],
  [11.0, 'clear', 0],
  [10.6, 'clear', 0],
  [10.3, 'clear', 0],
  [10.1, 'partly-cloudy', 0],
  [10.4, 'partly-cloudy', 5],
  [11.6, 'partly-cloudy', 5],
  [13.0, 'clear', 0],
  [14.3, 'clear', 0],
  [15.2, 'partly-cloudy', 5],
  [15.9, 'partly-cloudy', 10],
  [16.1, 'cloudy', 20],
]

export const HOURS: WeatherHour[] = DAY_AHEAD.map(([temperature, condition, precipitation], i) => {
  const hour = (14 + i) % 24
  return { time: today(14) + i * HOUR, temperature, condition, isDay: hour >= 7 && hour < 17, precipitation }
})

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

// The week ahead, today first.
const WEEK: [WeatherDay['condition'], number, number, number][] = [
  ['rain', 19.6, 11.2, 80],
  ['drizzle', 16.1, 9.4, 40],
  ['partly-cloudy', 17.3, 8.1, 10],
  ['clear', 19.8, 7.6, 0],
  ['cloudy', 15.4, 9.9, 25],
  ['heavy-rain', 12.2, 8.4, 90],
  ['partly-cloudy', 14.6, 6.3, 15],
]

export const DAYS: WeatherDay[] = WEEK.map(([condition, high, low, precipitation], i) => ({
  date: today(i * 24),
  condition,
  high,
  low,
  precipitation,
  sunrise: today(i * 24 + 6, 58 + i),
  sunset: today(i * 24 + 16, 12 - i),
}))

/** The forecast for `Weather`'s props. */
export const FORECAST = { location: WEATHER_LOCATION, current: CURRENT, hours: HOURS, days: DAYS, now: WEATHER_NOW }

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
