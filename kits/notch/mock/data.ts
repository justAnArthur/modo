/*
 * Mock data for the docs: what a notch app's activities would report. Pages
 * and examples read it; nothing here ships.
 */

import { CalendarDays, Gauge, Headphones, Layers, Music, Timer } from 'lucide-react'
import type { IslandTab } from '../components/island-tabs'

export interface Track {
  title: string
  artist: string
  album: string
  source: string
  /** Seconds. */
  duration: number
  /** Seconds. */
  position: number
}

export const TRACK: Track = {
  title: 'Midnight City',
  artist: 'M83',
  album: "Hurry Up, We're Dreaming",
  source: 'Music',
  duration: 243,
  position: 71,
}

export const TRACKS: Track[] = [
  TRACK,
  { title: 'Teardrop', artist: 'Massive Attack', album: 'Mezzanine', source: 'Spotify', duration: 330, position: 12 },
  { title: 'Nightcall', artist: 'Kavinsky', album: 'OutRun', source: 'Safari', duration: 258, position: 190 },
]

export const POWER = { level: 82, charging: true, untilFull: '38 min until full' }

export const TIMER = { label: 'Focus', minutes: 25 }

export interface CalendarEvent {
  title: string
  time: string
  place?: string
}

export const EVENTS: CalendarEvent[] = [
  { title: 'Design review', time: '10:30', place: 'Studio 2' },
  { title: 'Lunch with Ana', time: '12:45' },
  { title: 'Ship the island kit', time: '16:00', place: 'Online' },
]

export const DEVICES = [
  { name: 'AirPods Pro', level: 74, charging: false },
  { name: 'Magic Keyboard', level: 18, charging: false },
  { name: 'iPhone', level: 56, charging: true },
]

/** The open island's tabs: one per widget. */
export const TABS: IslandTab[] = [
  { value: 'now-playing', label: 'Now Playing', icon: Music },
  { value: 'timer', label: 'Timer', icon: Timer },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'shelf', label: 'Shelf', icon: Layers },
  { value: 'devices', label: 'Devices', icon: Headphones },
  { value: 'stats', label: 'Stats', icon: Gauge },
]

export const MENUS = ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help']
