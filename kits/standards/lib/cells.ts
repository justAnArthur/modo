/*!
 * Local addition: the pure arithmetic of the grids: which items a business
 * has, what a cell shows, coverage, and the small formatters the cells share.
 */

import type { Asset, Business, CellStatus, LoadedItem, LoadedPack, ShownState } from './types'

export const cellKey = (asset: string, item: string) => `${asset}:${item}`

/** What the cell shows: a check under way wins over a run, a run over the check's state. */
export const shownState = (cell: CellStatus): ShownState =>
  cell.checking ? 'checking' : (cell.run?.state ?? cell.state)

/** The version of `pack` the business follows, or `undefined` when it hasn't adopted it. */
export function adoptedVersion(business: Business, pack: LoadedPack) {
  for (const ref of business.packs) {
    const [id, pinned] = ref.split('@')
    if (id === pack.id) return pinned ? Number(pinned) : pack.version
  }
}

/** The pack's items at the adopted version that apply to at least one of the business's assets. */
export function itemsOf(business: Business, pack: LoadedPack): LoadedItem[] {
  const version = adoptedVersion(business, pack)
  if (version === undefined) return []
  const kinds = new Set(business.assets.map(asset => asset.kind))
  return pack.entries.filter(item => item.since <= version && item.applies_to.some(kind => kinds.has(kind)))
}

export interface Coverage {
  /** Passing over counted, or `null` with nothing counted. */
  value: number | null
  passing: number
  /** Every cell but the waived ones. */
  counted: number
  /** Failing cells nobody is on yet. */
  fails: number
  /** Cells a worker is on, or with a PR open. */
  inFlight: number
  /** Cells being checked; every other figure counts them as their last state. */
  checking: number
}

/**
 * Pass and pass-older count as passing; waived cells don't count; error, stale and unchecked count against.
 * A cell being checked counts as its last state until its new result lands, so the figures hold still during a run.
 */
export function coverageOf(cells: CellStatus[]): Coverage {
  const counted = cells.filter(cell => cell.state !== 'waived')
  const passing = counted.filter(cell => cell.state === 'pass' || cell.state === 'pass-older').length
  return {
    value: counted.length ? passing / counted.length : null,
    passing,
    counted: counted.length,
    fails: cells.filter(cell => cell.state === 'fail' && !cell.run).length,
    inFlight: cells.filter(cell => cell.run).length,
    checking: cells.filter(cell => cell.checking).length,
  }
}

/** The cells of one pack, from their `pack/item` keys. */
export const cellsOfPack = (cells: CellStatus[], pack: string) => cells.filter(cell => cell.item.startsWith(`${pack}/`))

/** `sonnet-fixer` → `SF`. */
export const initialsOf = (id: string) =>
  id
    .split(/[-_\s]+/)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)

/** The name an asset goes by: its URL's host and path, else its repo, else its id. */
export function assetName(asset: Asset) {
  if (asset.url) return asset.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return asset.repo ?? asset.id
}

const UNITS = [
  { ms: 86_400_000, unit: 'd' },
  { ms: 3_600_000, unit: 'h' },
  { ms: 60_000, unit: 'm' },
]

/** `12m ago`, `3h ago`, `2d ago`; `just now` under a minute. */
export function ago(iso: string, now: number) {
  const elapsed = now - Date.parse(iso)
  const step = UNITS.find(({ ms }) => elapsed >= ms)
  return step ? `${Math.floor(elapsed / step.ms)}${step.unit} ago` : 'just now'
}

function scalar(value: unknown) {
  if (typeof value !== 'string') return String(value)
  if (/^[\w./:@-]+$/.test(value)) return value
  return value.includes("'") ? JSON.stringify(value) : `'${value}'`
}

/** A check (or any plain data) written out as YAML, the way it reads in `item.yml`. */
export function toYaml(value: unknown, indent = ''): string {
  if (Array.isArray(value))
    return value.map(entry => `${indent}- ${toYaml(entry, `${indent}  `).trimStart()}`).join('\n')

  if (value && typeof value === 'object')
    return Object.entries(value)
      .map(([key, entry]) => {
        if (typeof entry === 'string' && entry.includes('\n'))
          return `${indent}${key}: |\n${entry
            .trimEnd()
            .split('\n')
            .map(line => `${indent}  ${line}`)
            .join('\n')}`
        return entry && typeof entry === 'object'
          ? `${indent}${key}:\n${toYaml(entry, `${indent}  `)}`
          : `${indent}${key}: ${scalar(entry)}`
      })
      .join('\n')

  return `${indent}${scalar(value)}`
}
