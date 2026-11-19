/*!
 * Docs-only mock data: the real cells with a few invented ones laid over
 * them, so every state shows (a worker on a cell, a PR open, a stale and an
 * older-version pass), a fixed "now" for the relative times, invented
 * history for the cell drawer, and 25 clearly fake businesses for density.
 */

import { cellKey, itemsOf } from '../lib/cells'
import type { Asset, Business, CellState, CellStatus, Result } from '../lib/types'
import { PACKS } from './packs'
import { BUSINESSES, REAL_STATUS } from './real'

/** The pages' clock: 40 minutes after the real check run. */
export const NOW = Date.parse('2026-11-19T11:32:00.000Z')

/** Invented: each patch replaces one real cell's state or adds a run to it. */
const INVENTED: Record<string, Record<string, Partial<CellStatus>>> = {
  camasys: {
    'site:website/security-headers': { run: { state: 'running', worker: 'sonnet-fixer' } },
    'site:website/robots-sitemap': {
      state: 'pass-older',
      result: {
        business: 'camasys',
        asset: 'site',
        item: 'website/robots-sitemap',
        item_version: 1,
        state: 'pass',
        evidence: 'https://www.camasys.com/robots.txt',
        checked_at: '2026-11-19T10:52:05.301Z',
        ms: 412,
      },
    },
    'site:website/sitemap-health': {
      state: 'stale',
      result: {
        business: 'camasys',
        asset: 'site',
        item: 'website/sitemap-health',
        item_version: 1,
        state: 'pass',
        evidence: 'https://www.camasys.com/sitemap.xml: 431 URLs, 20 sampled, all 200',
        checked_at: '2026-11-09T05:00:12.000Z',
        ms: 711,
      },
    },
  },
  acadsys: {
    'site:website/security-headers': {
      run: { state: 'pr-open', url: 'https://github.com/utegsk/acadsys-www/pull/18', number: 18 },
    },
  },
  uteg: {
    'site:website/robots-sitemap': { run: { state: 'running', worker: 'opus-fixer' } },
  },
}

const withInvented = (business: string, cells: CellStatus[]) =>
  cells.map(cell => ({ ...cell, ...INVENTED[business]?.[cellKey(cell.asset, cell.item)] }))

/** The real businesses' cells, by business id. */
export const STATUS: Record<string, CellStatus[]> = Object.fromEntries(
  Object.entries(REAL_STATUS).map(([business, cells]) => [business, withInvented(business, cells)]),
)

export const statusOf = (business: string, asset: string, item: string) =>
  STATUS[business]!.find(cell => cell.asset === asset && cell.item === item)!

const earlier = (result: Result, days: number, patch: Partial<Result> = {}): Result => ({
  ...result,
  checked_at: new Date(Date.parse(result.checked_at) - days * 86_400_000).toISOString(),
  ...patch,
})

/** Invented: the checks before the last one, newest first, for the cells the drawer pages open. */
export function historyOf(cell: CellStatus): Result[] {
  const last = cell.result
  if (!last) return []
  return [
    last,
    earlier(last, 1),
    earlier(last, 4, { state: 'error', evidence: `${last.evidence.split(';')[0]}: timed out after 15s` }),
    earlier(last, 8),
  ]
}

const FAKE_NAMES = [
  'Acme Rentals',
  'Globex Docs',
  'Initech Payroll',
  'Hooli Mail',
  'Vandelay Imports',
  'Wonka Sweets',
  'Soylent Foods',
  'Tyrell Labs',
  'Cyberdyne Cloud',
  'Wayne Logistics',
  'Oscorp Health',
  'Pied Piper',
  'Dunder Paper',
  'Prestige Worldwide',
  'Bluth Homes',
  'Gringotts Bank',
  'Monsters Energy',
  'Massive Dynamic',
  'Aperture Science',
  'Black Mesa',
  'Virtucon',
  'Nakatomi Trading',
  'Sirius Cybernetics',
  'Krusty Krab',
  'Los Pollos',
]

// A seeded generator, so the fake grid looks the same on every load.
function random(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
    return seed / 2_147_483_648
  }
}

const STATES: [CellState, number][] = [
  ['pass', 0.62],
  ['fail', 0.82],
  ['error', 0.86],
  ['unchecked', 0.92],
  ['stale', 0.96],
  ['waived', 1],
]

const pick = (roll: number) => STATES.find(([, upTo]) => roll < upTo)![0]

function fakeBusiness(name: string, index: number): Business {
  const slug = name.toLowerCase().replace(/\s+/g, '-')
  const assets: Asset[] = [{ id: 'site', kind: 'website', url: `https://${slug}.example`, stack: 'static' }]
  const hasRepo = index % 3 !== 1
  if (hasRepo) assets.push({ id: 'repo', kind: 'repo', repo: `example/${slug}` })
  const website = index % 4 === 3 ? 'website@1' : 'website'
  return {
    id: `fake-${slug}`,
    name,
    assets,
    packs: hasRepo ? [website, 'repo@1'] : [website],
    worker: 'sonnet-fixer',
    waivers: [],
  }
}

function fakeCells(business: Business, roll: () => number): CellStatus[] {
  const checkedAt = new Date(NOW - 3_600_000).toISOString()
  return PACKS.flatMap(pack =>
    itemsOf(business, pack).flatMap(item =>
      business.assets
        .filter(asset => item.applies_to.includes(asset.kind))
        .map(asset => {
          const state = pick(roll())
          const base = { asset: asset.id, item: item.key, title: item.title, state }
          if (state === 'unchecked') return base
          if (state === 'waived') return { ...base, waiver: { item: item.key, reason: 'invented for the demo' } }
          const verdict = state === 'error' ? 'error' : state === 'fail' ? 'fail' : 'pass'
          const evidence = `invented: ${verdict} on ${asset.url ?? asset.repo}`
          return {
            ...base,
            result: {
              business: business.id,
              asset: asset.id,
              item: item.key,
              item_version: item.version,
              state: verdict,
              evidence,
              checked_at: state === 'stale' ? new Date(NOW - 12 * 86_400_000).toISOString() : checkedAt,
              ms: 300,
            },
          } satisfies CellStatus
        }),
    ),
  )
}

/** 25 clearly fake businesses on `.example` hosts, to show the overview's density. */
export const FAKE_BUSINESSES: Business[] = FAKE_NAMES.map(fakeBusiness)

export const FAKE_STATUS: Record<string, CellStatus[]> = Object.fromEntries(
  FAKE_BUSINESSES.map((business, index) => [business.id, fakeCells(business, random(index + 7))]),
)

export { WORKERS } from './real'
export { BUSINESSES, PACKS }
