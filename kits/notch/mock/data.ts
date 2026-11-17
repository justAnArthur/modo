/*
 * Mock data for the docs: what a notch app's activities would report. Pages
 * and examples read it; nothing here ships in the barrel.
 */

import { Activity, CalendarDays, Files, Headphones, Music, SlidersHorizontal, Timer } from 'lucide-react'
import type { AgendaEvent } from '../blocks/activities/agenda'
import type { ShelfFile } from '../blocks/activities/shelf'
import type { DeviceInfo } from '../blocks/system/devices'
import type { StatsSample } from '../blocks/system/system-stats'
import type { IslandTab } from '../components/island/island-tabs'

export interface Track {
  title: string
  artist: string
  album: string
  source: string
  output: string
  outputKind: 'built-in' | 'headphones' | 'speaker' | 'airplay'
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
  output: 'AirPods Pro',
  outputKind: 'headphones',
  duration: 243,
  position: 71,
}

export const TRACKS: Track[] = [
  TRACK,
  {
    title: 'Teardrop',
    artist: 'Massive Attack',
    album: 'Mezzanine',
    source: 'Spotify',
    output: 'Living room',
    outputKind: 'airplay',
    duration: 330,
    position: 12,
  },
  {
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    source: 'Safari',
    output: 'MacBook Pro Speakers',
    outputKind: 'built-in',
    duration: 258,
    position: 190,
  },
]

export const POWER = { level: 82, charging: true, untilFull: 38, remaining: 252 }

export const TIMER = { label: 'Focus', minutes: 25 }

const MINUTE = 60_000
const at = (day: number, hours: number, minutes: number) => {
  const date = new Date()
  date.setDate(date.getDate() + day)
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

/** The moment the agenda is read at: today, 9:40. */
export const AGENDA_NOW = at(0, 9, 40)

// A calendar's color is data; here it reads modo-ui's badge palette, so it follows the theme.
export const EVENTS: AgendaEvent[] = [
  {
    id: 'offsite',
    title: 'Team offsite',
    start: at(0, 0, 0),
    end: at(1, 0, 0),
    allDay: true,
    color: 'var(--badge-green)',
  },
  {
    id: 'review',
    title: 'Design review',
    start: at(0, 10, 30),
    end: at(0, 11, 15),
    location: 'Studio 2',
    color: 'var(--badge-blue)',
  },
  { id: 'lunch', title: 'Lunch with Ana', start: at(0, 12, 45), end: at(0, 13, 45), color: 'var(--badge-orange)' },
  {
    id: 'ship',
    title: 'Ship the island kit',
    start: at(0, 16, 0),
    end: at(0, 16, 30),
    meetingUrl: 'https://meet.example.com/ship',
    color: 'var(--badge-violet)',
  },
  {
    id: 'standup',
    title: 'Standup',
    start: at(1, 9, 30),
    end: at(1, 9, 45),
    meetingUrl: 'https://meet.example.com/standup',
    color: 'var(--badge-blue)',
  },
  {
    id: 'dentist',
    title: 'Dentist',
    start: at(1, 14, 0),
    end: at(1, 15, 0),
    location: 'Main St 12',
    color: 'var(--badge-rose)',
  },
]

/** An event a few minutes out, for the "Up next" activity: it counts down for real. */
export function soonEvent(minutes = 4): AgendaEvent {
  const start = Date.now() + minutes * MINUTE
  return {
    id: `soon-${minutes}`,
    title: 'Design review',
    start,
    end: start + 45 * MINUTE,
    location: 'Studio 2',
    meetingUrl: 'https://meet.example.com/review',
    color: 'var(--badge-blue)',
  }
}

export const DEVICES: DeviceInfo[] = [
  { id: 'airpods', name: 'AirPods Pro', kind: 'headphones', connected: true, battery: 74 },
  { id: 'keyboard', name: 'Magic Keyboard', kind: 'keyboard', connected: true, battery: 18 },
  { id: 'mouse', name: 'Magic Mouse', kind: 'mouse', connected: false },
  { id: 'controller', name: 'DualSense', kind: 'gamepad', connected: true, battery: 56, charging: true },
  { id: 'speaker', name: 'Living room', kind: 'speaker', connected: false },
]

export const FILES: ShelfFile[] = [
  { id: 'brief', name: 'Island brief.pdf' },
  { id: 'cover', name: 'Cover.png' },
  { id: 'notes', name: 'Notes.md' },
  { id: 'demo', name: 'Demo.mov' },
  { id: 'archive', name: 'Assets.zip' },
  { id: 'theme', name: 'theme.ts' },
]

const wave = (i: number, base: number, swing: number) =>
  base + swing * Math.sin(i / 2.4) + swing * 0.4 * Math.sin(i * 1.7)

/** Thirty seconds of samples, oldest first. */
export const SAMPLES: StatsSample[] = Array.from({ length: 30 }, (_, i) => ({
  cpu: Math.min(1, Math.max(0.02, wave(i, 0.32, 0.14))),
  memoryUsed: wave(i, 11.2e9, 0.25e9),
  memoryTotal: 16e9,
  netIn: Math.max(0, wave(i, 2.4e6, 1.6e6)),
  netOut: Math.max(0, wave(i + 5, 0.4e6, 0.3e6)),
}))

/** The open island's tabs: one per widget. */
export const TABS: IslandTab[] = [
  { value: 'now-playing', label: 'Now Playing', icon: Music },
  { value: 'timer', label: 'Timer', icon: Timer },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'shelf', label: 'Shelf', icon: Files },
  { value: 'controls', label: 'Controls', icon: SlidersHorizontal },
  { value: 'devices', label: 'Devices', icon: Headphones },
  { value: 'stats', label: 'System', icon: Activity },
]

export const MENUS = ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help']
