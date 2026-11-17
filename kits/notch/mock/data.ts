/*
 * Mock data for the docs: what a notch app's activities would report. Pages
 * and examples read it; nothing here ships in the barrel.
 */

import { Activity, CalendarDays, ClipboardList, Clock3, CloudSun, FolderDown, Music } from 'lucide-react'
import type { AgendaEvent } from '../blocks/activities/agenda'
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

/** The open island's tabs: one per widget. */
export const TABS: IslandTab[] = [
  { value: 'now-playing', label: 'Now Playing', icon: Music },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'weather', label: 'Weather', icon: CloudSun },
  { value: 'clock', label: 'Clock', icon: Clock3 },
  { value: 'system', label: 'System', icon: Activity },
  { value: 'clipboard', label: 'Clipboard', icon: ClipboardList },
  { value: 'files', label: 'Recent files', icon: FolderDown },
]

export const MENUS = ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help']
