/*!
 * Local addition: one business's grid, its assets × its adopted packs'
 * items in a card, with a legend behind an info button and a multi-cell fix.
 * Presentational: the business, packs, cells, workers and the callbacks come
 * in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Card from '@justanarthur/modo-ui/components/containers/card'
import Checkbox from '@justanarthur/modo-ui/components/inputs/checkbox'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useIcon } from '@justanarthur/modo-ui/lib/icon-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useSurface } from '@justanarthur/modo-ui/lib/surface-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { MouseEvent } from 'react'
import CoverageMeter from '../../components/status/coverage-meter'
import StateCell from '../../components/status/state-cell'
import WorkerPicker from '../../components/workers/worker-picker'
import { adoptedVersion, assetName, cellKey, cellsOfPack, coverageOf, itemsOf, shownState } from '../../lib/cells'
import { SHOWN_STATES, STATE_LABEL } from '../../lib/states'
import type { Asset, AssetKind, Business, CellStatus, LoadedPack, Worker } from '../../lib/types'

const KIND_LABEL: Record<AssetKind, string> = {
  website: 'website',
  webapp: 'web app',
  mobile: 'mobile app',
  repo: 'repo',
  social: 'social account',
  newsletter: 'newsletter',
  api: 'API',
}

const isRed = (cell: CellStatus) => shownState(cell) === 'fail'

function groupByKind(assets: Asset[]) {
  const groups = new Map<AssetKind, Asset[]>()
  for (const asset of assets) groups.set(asset.kind, [...(groups.get(asset.kind) ?? []), asset])
  return [...groups]
}

function Legend() {
  const Info = useIcon('info')
  return (
    <Popover>
      <Popover.Trigger
        openOnHover
        delay={150}
        render={
          <Button variant="ghost" size="icon-compact" aria-label="Legend">
            <Info />
          </Button>
        }
      />
      <Popover.Content className="gap-3">
        <Popover.Title>Legend</Popover.Title>
        <ul className="flex flex-col gap-2">
          {SHOWN_STATES.map(state => (
            <li key={state} className="flex items-center gap-2 text-caption text-foreground">
              <StateCell.Glyph state={state} size="small" worker="sonnet-fixer" />
              {STATE_LABEL[state]}
            </li>
          ))}
          <li className="flex items-center gap-2 text-caption text-foreground">
            <span className="flex size-4 items-center justify-center">
              <span className="size-1 rounded-full bg-border" />
            </span>
            Doesn't apply
          </li>
        </ul>
        <Popover.Description>
          ⌘- or Shift-click failing cells on one asset, or tick its box, to fix them in one run.
        </Popover.Description>
      </Popover.Content>
    </Popover>
  )
}

interface BusinessGridProps {
  /** The business: its assets (rows) and adopted packs. */
  business: Business
  /** The loaded packs; the business's adopted ones become the columns, at the version it follows. */
  packs: LoadedPack[]
  /** The business's cells (`standards status <business>`). */
  cells: CellStatus[]
  /** The worker presets for Fix with. */
  workers: Worker[]
  /** The cells picked for a fix, as `asset:pack/item` keys (controlled). Pair with `onSelectedChange`. */
  selected?: string[]
  /** The cells picked at first, for an uncontrolled grid. Defaults to none. */
  defaultSelected?: string[]
  /** Called with the picked keys whenever the selection changes. */
  onSelectedChange?: (keys: string[]) => void
  /** The key of the cell open in the drawer: its row and column head are lit. */
  active?: string
  /** Called on a plain press of a cell: open its drawer. */
  onOpenCell?: (cell: CellStatus) => void
  /** Called with the picked cells and the worker on Fix. */
  onFix?: (cells: CellStatus[], worker: string) => void
  /** Disables Fix N with ▾ worker; cells can still be picked. Defaults to `false`. */
  fixDisabled?: boolean
  /** Why Fix is disabled, in a tooltip over it while `fixDisabled`. */
  fixDisabledReason?: string
  /** The time the cards' "12m ago" counts from, in epoch ms. Defaults to now. */
  now?: number
  /** Classes for the root. Give it a height (or a flex parent) so the grid scrolls under its sticky head. */
  className?: string
}

/**
 * One business: its assets as rows, grouped by kind, against the items of
 * the packs it adopted as columns, grouped by pack, every cell in its state,
 * in a card.
 *
 * Only the items at the pack version the business follows show (a business
 * on `website@1` doesn't get the items `website@2` added), and only those
 * that apply to one of its asset kinds; a cell whose item doesn't apply to
 * its asset is a faint dot. The column heads are the items' short names,
 * turned on their side to keep the columns 28px wide, with the full title on
 * hover; each pack's head carries its coverage, each row its own. The info
 * button by the title opens the legend: every state and how to pick cells.
 *
 * Hover a cell for its evidence; press it to open its drawer. ⌘- or
 * Shift-press failing cells on one asset (or tick the asset's box for all of
 * them) to pick them, then Fix N with ▾ worker, at the head's end, sends them
 * as one run and one PR. Picking a cell on another asset starts the selection
 * over. `fixDisabled` (with a `fixDisabledReason` for its tooltip) keeps the
 * picking but dims the fix. A cell being checked shows the spinner and can't
 * be picked until its result lands; coverage counts it as its last state.
 * The head and the asset column stay put while the grid scrolls; the card is
 * as tall as its rows, up to the block's height.
 *
 * @example {@include ./examples.mdx}
 */
export default function BusinessGrid({
  business,
  packs,
  cells,
  workers,
  selected,
  defaultSelected = [],
  onSelectedChange,
  active,
  onOpenCell,
  onFix,
  fixDisabled = false,
  fixDisabledReason,
  now = Date.now(),
  className,
}: BusinessGridProps) {
  const [picked, setPicked] = useControllableState(selected, defaultSelected, onSelectedChange)
  const surface = SURFACE_BG[useSurface()]
  const byKey = new Map(cells.map(cell => [cellKey(cell.asset, cell.item), cell]))
  const columns = packs.map(pack => ({ pack, items: itemsOf(business, pack) })).filter(({ items }) => items.length)
  const itemCount = columns.reduce((sum, { items }) => sum + items.length, 0)
  const pickedCells = picked.map(key => byKey.get(key)).filter(cell => cell !== undefined)
  const pickedAsset = business.assets.find(asset => asset.id === pickedCells[0]?.asset)
  const [activeAsset, activeItem] = active?.split(':') ?? []
  const groups = groupByKind(business.assets)
  const lastAsset = groups.at(-1)?.[1].at(-1)

  const redOf = (asset: string) => cells.filter(cell => cell.asset === asset && isRed(cell))

  function press(cell: CellStatus, event: MouseEvent<HTMLButtonElement>) {
    if (!(event.metaKey || event.ctrlKey || event.shiftKey) || !isRed(cell)) return onOpenCell?.(cell)

    const key = cellKey(cell.asset, cell.item)
    if (pickedCells[0] && pickedCells[0].asset !== cell.asset) return setPicked([key])
    setPicked(picked.includes(key) ? picked.filter(k => k !== key) : [...picked, key])
  }

  const sticky = cn('sticky border-border', surface)
  // A pack's items sit inset from its dividers; every pack after the first opens with one.
  const itemEdge = (pack: number, index: number, count: number) =>
    cn(index === 0 && 'pl-2.5', index === 0 && pack > 0 && 'border-l', index === count - 1 && 'pr-2.5')

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-3', className)}>
      <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-subtitle text-foreground">Assets × pack items</span>
        <span className="text-caption text-muted-foreground">
          {itemCount} items from {columns.length} {columns.length === 1 ? 'pack' : 'packs'} over{' '}
          {business.assets.length} {business.assets.length === 1 ? 'asset' : 'assets'}
        </span>
        <Legend />
        {pickedCells.length > 0 && pickedAsset && (
          <span className="ml-auto flex items-center gap-3">
            <span className="text-body text-foreground">
              {pickedCells.length} failing on {assetName(pickedAsset)}
            </span>
            <WorkerPicker
              workers={workers}
              defaultValue={business.worker}
              count={pickedCells.length}
              size="compact"
              onFix={worker => onFix?.(pickedCells, worker)}
              disabled={fixDisabled}
              disabledReason={fixDisabledReason}
            />
            <Button variant="ghost" size="compact" onClick={() => setPicked([])}>
              Clear
            </Button>
          </span>
        )}
      </div>

      <Card border="outlined" className="min-h-0 pb-0">
        <div className="min-h-0 overflow-auto">
          <table className="w-max min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  scope="col"
                  rowSpan={2}
                  className={cn(
                    sticky,
                    'top-0 left-0 z-30 min-w-52 border-r border-b pr-3 pl-4 text-left align-bottom text-caption weight-normal text-muted-foreground',
                  )}
                >
                  <span className="flex h-9 items-center">Asset</span>
                </th>
                {columns.map(({ pack, items }, index) => {
                  const coverage = coverageOf(cellsOfPack(cells, pack.id))
                  return (
                    <th
                      key={pack.id}
                      scope="colgroup"
                      colSpan={items.length}
                      className={cn(
                        sticky,
                        'top-0 z-20 h-9 px-3 text-left text-body weight-normal',
                        index > 0 && 'border-l',
                      )}
                    >
                      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                        <span className="weight-semibold text-foreground">{pack.title}</span>
                        <span className="text-caption text-muted-foreground">
                          v{adoptedVersion(business, pack)}
                          {coverage.value !== null && ` · ${Math.round(coverage.value * 100)}%`}
                        </span>
                      </span>
                    </th>
                  )
                })}
                <th
                  scope="col"
                  rowSpan={2}
                  className={cn(
                    sticky,
                    'top-0 z-20 w-full min-w-32 border-b pr-4 pl-3 text-left align-bottom text-caption weight-normal text-muted-foreground',
                  )}
                >
                  <span className="flex h-9 items-center">Coverage</span>
                </th>
              </tr>
              <tr>
                {columns.flatMap(({ items }, pack) =>
                  items.map((item, index) => (
                    <th
                      key={item.key}
                      scope="col"
                      className={cn(
                        sticky,
                        'top-9 z-20 border-b p-0 align-bottom',
                        itemEdge(pack, index, items.length),
                      )}
                    >
                      <span className="sr-only">
                        {item.title} v{item.version}
                      </span>
                      <span className="flex w-7 justify-center">
                        <Tooltip content={`${item.title} · v${item.version}`} side="top">
                          {/* Spacing is logical: in vertical writing px (padding-inline) is the top and bottom. */}
                          <span
                            aria-hidden
                            className={cn(
                              'block max-h-32 rotate-180 truncate px-2 text-caption weight-normal [writing-mode:vertical-rl]',
                              activeItem === item.key ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {item.label ?? item.title} <span className="text-micro">v{item.version}</span>
                          </span>
                        </Tooltip>
                      </span>
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {groups.map(([kind, assets]) => [
                <tr key={`kind:${kind}`}>
                  <th
                    scope="rowgroup"
                    className={cn(
                      sticky,
                      'left-0 z-10 h-8 border-r pr-3 pb-1 pl-4 text-left align-bottom text-caption weight-normal text-muted-foreground',
                    )}
                  >
                    {KIND_LABEL[kind]} · {assets.length}
                  </th>
                  {columns.map(({ pack, items }, index) => (
                    <td key={pack.id} colSpan={items.length} className={cn('border-border', index > 0 && 'border-l')} />
                  ))}
                  <td />
                </tr>,
                ...assets.map(asset => {
                  const red = redOf(asset.id)
                  const pickedHere = red.filter(cell => picked.includes(cellKey(cell.asset, cell.item))).length
                  const rowCells = cells.filter(cell => cell.asset === asset.id)
                  const fill = cn('group-hover/row:bg-hover', activeAsset === asset.id && 'bg-hover')
                  const divider = asset !== lastAsset && 'border-b'
                  return (
                    <tr key={asset.id} className="group/row">
                      <th
                        scope="row"
                        className={cn(sticky, 'left-0 z-10 border-r p-0 text-left weight-normal', divider)}
                      >
                        <div className={cn(fill, 'flex h-9 items-center gap-2 whitespace-nowrap pr-3 pl-4')}>
                          {red.length > 0 && (
                            <Checkbox
                              size="compact"
                              aria-label={`Pick the ${red.length} failing cells on ${assetName(asset)}`}
                              checked={pickedHere === red.length}
                              indeterminate={pickedHere > 0 && pickedHere < red.length}
                              onCheckedChange={on =>
                                setPicked(on ? red.map(cell => cellKey(cell.asset, cell.item)) : [])
                              }
                            />
                          )}
                          <span className="text-body text-foreground">{assetName(asset)}</span>
                          {asset.stack && (
                            <span className="ml-auto text-caption text-muted-foreground">{asset.stack}</span>
                          )}
                        </div>
                      </th>
                      {columns.flatMap(({ items }, pack) =>
                        items.map((item, index) => {
                          const cell: CellStatus = byKey.get(cellKey(asset.id, item.key)) ?? {
                            asset: asset.id,
                            item: item.key,
                            title: item.title,
                            state: 'unchecked',
                          }
                          return (
                            <td
                              key={item.key}
                              className={cn(fill, 'border-border p-0', divider, itemEdge(pack, index, items.length))}
                            >
                              <div className="flex h-9 w-7 items-center justify-center">
                                {item.applies_to.includes(asset.kind) ? (
                                  <StateCell
                                    cell={cell}
                                    asset={assetName(asset)}
                                    selected={picked.includes(cellKey(asset.id, item.key))}
                                    onClick={event => press(cell, event)}
                                    now={now}
                                  />
                                ) : (
                                  <span aria-hidden className="size-1 rounded-full bg-border" />
                                )}
                              </div>
                            </td>
                          )
                        }),
                      )}
                      <td className={cn(fill, 'border-border py-0 pr-4 pl-3 text-body', divider)}>
                        <CoverageMeter value={coverageOf(rowCells).value} label={`${assetName(asset)} coverage`} />
                      </td>
                    </tr>
                  )
                }),
              ])}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export type { BusinessGridProps }
export { BusinessGrid }
