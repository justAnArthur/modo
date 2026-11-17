/*
 * Mock: a Downloads folder and a Screenshots folder for the recent-files
 * widget, read at a pinned moment so the times hold, and a download under
 * way. Nothing here ships in the barrel.
 */

import type { RecentDownload, RecentFile } from '../blocks/system/recent-files'
import { MockArtwork } from './artwork'

const MINUTE = 60_000

/** The moment the folders are read at. */
export const FILES_NOW = new Date(2026, 10, 17, 15, 42).getTime()

const ago = (minutes: number) => FILES_NOW - minutes * MINUTE

export const DOWNLOADS: RecentFile[] = [
  {
    id: 'report',
    name: 'Quarterly report.pdf',
    size: 2.4e6,
    addedAt: ago(0),
    source: 'downloads',
    from: 'drive.google.com',
  },
  { id: 'kit', name: 'modo-ui-notch-0.2.0.tgz', size: 84e3, addedAt: ago(12), source: 'downloads', from: 'npmjs.com' },
  { id: 'demo', name: 'Demo.mov', size: 182e6, addedAt: ago(48), source: 'downloads', from: 'wetransfer.com' },
  {
    id: 'cover',
    name: 'Cover.png',
    size: 1.1e6,
    addedAt: ago(130),
    source: 'downloads',
    thumbnail: <MockArtwork variant="dusk" />,
  },
  { id: 'assets', name: 'Assets.zip', size: 36e6, addedAt: ago(26 * 60), source: 'downloads' },
  { id: 'inter', name: 'Inter-4.1.zip', size: 18e6, addedAt: ago(3 * 24 * 60), source: 'downloads' },
  {
    id: 'poster',
    name: 'Poster draft.jpg',
    size: 3.2e6,
    addedAt: ago(4 * 24 * 60),
    source: 'downloads',
    thumbnail: <MockArtwork variant="aurora" />,
    from: 'dribbble.com',
  },
  { id: 'invoice', name: 'Invoice 2026-11.pdf', size: 210e3, addedAt: ago(5 * 24 * 60), source: 'downloads' },
  { id: 'track', name: 'Interview take 2.m4a', size: 14e6, addedAt: ago(6 * 24 * 60), source: 'downloads' },
  { id: 'xcode', name: 'Xcode_17.xip', size: 3.4e9, addedAt: ago(8 * 24 * 60), source: 'downloads' },
  { id: 'config', name: 'island.config.json', size: 2e3, addedAt: ago(9 * 24 * 60), source: 'downloads' },
]

const pad = (n: number) => String(n).padStart(2, '0')

/** The name macOS gives a screenshot: `Screenshot 2026-11-17 at 15.39.00.png`. */
function shotName(ms: number) {
  const d = new Date(ms)
  return `Screenshot ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} at ${d.getHours()}.${pad(d.getMinutes())}.${pad(d.getSeconds())}.png`
}

const VARIANTS = ['aurora', 'dusk', 'night'] as const

export const SCREENSHOTS: RecentFile[] = [3, 15, 22, 64, 140, 300, 1500, 1620, 2900, 4400, 7300].map((minutes, i) => ({
  id: `shot-${i}`,
  name: shotName(ago(minutes)),
  size: (1.2 + i * 0.35) * 1e6,
  addedAt: ago(minutes),
  source: 'screenshots',
  thumbnail: <MockArtwork variant={VARIANTS[i % VARIANTS.length]} />,
}))

/** Both folders. */
export const RECENT_FILES: RecentFile[] = [...DOWNLOADS, ...SCREENSHOTS]

/** A download under way: 40% in, 6.2 MB/s. */
export const DOWNLOAD: RecentDownload = {
  id: 'wallpapers',
  name: 'Wallpapers 4K.zip',
  received: 48e6,
  total: 120e6,
  rate: 6.2e6,
  from: 'unsplash.com',
}
