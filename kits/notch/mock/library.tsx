/*
 * Mock: the plugin library for the docs, an entry in each state, the
 * permissions explained, generated screenshots, and a stateful library that
 * opens a plugin's page and walks an install. Nothing here ships in the
 * barrel.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import { Bitcoin, GitPullRequest, Library, Timer, Train } from 'lucide-react'
import { useEffect, useState } from 'react'
import LibraryListing, {
  type LibraryEntry,
  type LibraryEntryState,
  type LibraryPermission,
} from '../blocks/app/library-listing'
import type { SettingsPage, SettingsPlugin } from '../blocks/app/settings-window'
import { MockArtwork } from './artwork'
import { PLUGINS } from './settings'

export const LIBRARY_PERMISSIONS: Record<string, LibraryPermission> = {
  network: { label: 'Network', description: 'Talks to the hosts listed below, and to no others.' },
  notifications: { label: 'Notifications', description: 'Flashes the island when something needs you.' },
  storage: { label: 'Storage', description: 'Keeps its own settings and a small cache on this Mac.' },
  calendar: { label: 'Calendar', description: 'Reads your events to show what is next; it never changes them.' },
}

const SHOTS = [
  <MockArtwork key="aurora" variant="aurora" />,
  <MockArtwork key="dusk" variant="dusk" />,
  <MockArtwork key="night" variant="night" />,
]

export const LIBRARY: LibraryEntry[] = [
  {
    id: 'github',
    name: 'GitHub',
    version: '1.2.0',
    description: 'Pull requests waiting on you and the checks on your branches.',
    author: 'justAnArthur',
    icon: GitPullRequest,
    permissions: ['network', 'notifications'],
    hosts: ['api.github.com'],
    state: { status: 'update-available', from: '1.1.0', to: '1.2.0' },
    details:
      'The pull requests that wait on your review and the checks on your own branches, in a widget, with a flash when a check fails or a review lands. Sign in once with a token; it stays in the keychain.',
    screenshots: SHOTS,
    source: 'https://github.com/justAnArthur/notch-github',
  },
  {
    id: 'pomodoro',
    name: 'Focus',
    version: '0.4.1',
    description: 'A focus timer with breaks, beside the clock.',
    author: 'notch-community',
    icon: Timer,
    permissions: ['notifications', 'storage'],
    state: { status: 'installed' },
    source: 'https://github.com/notch-community/focus',
  },
  {
    id: 'trains',
    name: 'Departures',
    version: '2.0.0',
    description: 'The next trains from the stations you pick.',
    author: 'railfan',
    icon: Train,
    permissions: ['network'],
    hosts: ['v6.db.transport.rest'],
    state: { status: 'installing', progress: 0.42, phase: 'Downloading' },
  },
  {
    id: 'crypto',
    name: 'Tickers',
    version: '0.9.0',
    description: 'Prices you follow, with a sparkline for the day.',
    author: 'quant',
    icon: Bitcoin,
    permissions: ['network'],
    hosts: ['api.coingecko.com'],
    state: { status: 'incompatible', reason: 'Needs Just Notch 1.6 or later.' },
  },
  {
    id: 'meetings',
    name: 'Meetings',
    version: '1.0.3',
    description: 'Join the next call from the island.',
    author: 'calendarist',
    permissions: ['calendar', 'network'],
    hosts: ['zoom.us', 'meet.google.com'],
    state: { status: 'error', message: "Couldn't verify the download's signature." },
  },
  {
    id: 'reader',
    name: 'Reader',
    version: '0.2.0',
    description: 'The newest posts from your feeds, one at a time.',
    author: 'feedly-fan',
    permissions: ['network', 'storage'],
    hosts: ['*.substack.com'],
    state: { status: 'not-installed' },
  },
]

const PHASES = ['Downloading', 'Verifying', 'Installing']

/** The library on its own: open a plugin's page, and an install that walks its phases. */
export function MockLibrary({ open: initial }: { open?: string }) {
  const [entries, setEntries] = useState(LIBRARY)
  const [open, setOpen] = useState(initial)
  const [running, setRunning] = useState<string>()
  const entry = entries.find(e => e.id === open)

  const set = (id: string, state: LibraryEntryState) =>
    setEntries(list => list.map(e => (e.id === id ? { ...e, state } : e)))

  useEffect(() => {
    if (!running) return
    let progress = 0
    const timer = setInterval(() => {
      progress += 0.1
      if (progress >= 1) {
        clearInterval(timer)
        setRunning(undefined)
        set(running, { status: 'installed' })
        return
      }
      set(running, { status: 'installing', progress, phase: PHASES[Math.floor(progress * PHASES.length)]! })
    }, 300)
    return () => clearInterval(timer)
  }, [running])

  const actions = {
    permissionInfo: LIBRARY_PERMISSIONS,
    onInstall: setRunning,
    onUpdate: setRunning,
    onUninstall: (id: string) => set(id, { status: 'not-installed' }),
  }

  if (entry) return <LibraryListing.Detail entry={entry} onBack={() => setOpen(undefined)} {...actions} />
  return <LibraryListing entries={entries} onOpen={setOpen} {...actions} />
}

/** The library as a page of the settings window, right after Plugins. */
export const LIBRARY_PAGE: SettingsPage = {
  id: 'library',
  label: 'Library',
  lead: 'Plugins to install, from the Just Notch library.',
  icon: Library,
  badge: '1',
  after: 'plugins',
  content: <MockLibrary />,
}

/** The installed plugins with what the library knows: an update on Weather, and GitHub from the library. */
export const LIBRARY_PLUGINS: SettingsPlugin[] = [
  ...PLUGINS.slice(0, 3).map(plugin =>
    plugin.id === 'weather'
      ? {
          ...plugin,
          badge: (
            <Badge size="compact" color="blue">
              Update
            </Badge>
          ),
        }
      : plugin,
  ),
  {
    id: 'github',
    name: 'GitHub',
    description: 'Pull requests waiting on you and the checks on your branches.',
    icon: GitPullRequest,
    badge: <Badge size="compact">Library</Badge>,
    actions: (
      <Button variant="ghost" size="compact">
        Uninstall
      </Button>
    ),
  },
  {
    id: 'legacy',
    name: 'Battery',
    description: 'The old battery widget, from before System.',
    badge: (
      <Badge size="compact" color="amber">
        Incompatible
      </Badge>
    ),
    actions: (
      <Button variant="ghost" size="compact">
        Uninstall
      </Button>
    ),
  },
]
