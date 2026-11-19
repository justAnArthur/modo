/*!
 * Local addition: the side pane for one item of a pack: what it asks and
 * why, its check and recipe, and its cells across one or more businesses.
 * Presentational: the item, its pack, the businesses, their cells and the
 * callbacks come in as props.
 */

'use client'

import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import Markdown from '@justanarthur/modo-ui/components/data-display/markdown'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import { ChevronRight } from 'lucide-react'
import StateCell from '../../components/status/state-cell'
import { adoptedVersion, ago, assetName, cellKey, coverageOf, shownState } from '../../lib/cells'
import { KIND_LABEL, STATE_LABEL } from '../../lib/states'
import type { Asset, Business, CellStatus, LoadedItem, LoadedPack } from '../../lib/types'
import { CheckSection, PANE, PaneHeader, PaneSection, TEXT_LINK } from '../pane'

interface Standing {
  business: Business
  version: number
  rows: { asset: Asset; cell: CellStatus }[]
}

/** The businesses that have the item, each with its assets it applies to and their cells; and those whose pinned version is older than the item. */
function standings(item: LoadedItem, pack: LoadedPack, businesses: Business[], status: Record<string, CellStatus[]>) {
  const having: Standing[] = []
  const before: Business[] = []
  for (const business of businesses) {
    const version = adoptedVersion(business, pack)
    if (version === undefined) continue
    if (version < item.since) {
      before.push(business)
      continue
    }

    const byKey = new Map((status[business.id] ?? []).map(cell => [cellKey(cell.asset, cell.item), cell]))
    const rows = business.assets
      .filter(asset => item.applies_to.includes(asset.kind))
      .map(asset => ({
        asset,
        cell: byKey.get(cellKey(asset.id, item.key)) ?? {
          asset: asset.id,
          item: item.key,
          title: item.title,
          state: 'unchecked' as const,
        },
      }))
    if (rows.length) having.push({ business, version, rows })
  }
  return { having, before }
}

/** The cell's line under its asset: the waiver's reason, else the evidence, else what its state means. */
function lineOf(cell: CellStatus) {
  if (cell.waiver) return { text: cell.waiver.reason, mono: false }
  if (cell.result) return { text: cell.result.evidence, mono: true }
  return { text: STATE_LABEL[shownState(cell)], mono: false }
}

interface ItemDetailProps {
  /** The item: its title, why, check and recipe. */
  item: LoadedItem
  /** The item's pack. */
  pack: LoadedPack
  /** The businesses whose cells of the item show: one on a business's screen, several on a pack's. */
  businesses: Business[]
  /** Each business's cells, by business id (`standards status`). */
  status: Record<string, CellStatus[]>
  /** Called with a cell and its business's id on a press of its row. */
  onOpenCell?: (cell: CellStatus, business: string) => void
  /** Called with the pack's id on a press of its name. Without it the name is plain text. */
  onOpenPack?: (pack: string) => void
  /** The time "12m ago" counts from, in epoch ms. Defaults to now. */
  now?: number
  /** Called on the close button. Without it there is none. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * Everything about one item, for the side pane the grid opens from a column
 * head: what it asks, why it matters, how it is checked, how a worker makes
 * it pass, and where each asset stands on it.
 *
 * The head names the item, its short label and version, the pack it comes
 * from and the pack version that added it (the pack opens through
 * `onOpenPack`), and the asset kinds it applies to. Then the why, the check
 * as its `item.yml` has it (as in CellDetail), and the recipe: the item's
 * `recipe.md`, the part of a fix prompt the item brings, rendered as
 * Markdown (see Markdown). An item without one leaves the section out.
 *
 * Where it stands lists every asset the item applies to, for the given
 * businesses, under one fluid hover highlight: its state, the evidence of
 * its last check (or the waiver's reason) and how long ago; a row opens that
 * cell through `onOpenCell`. With several businesses each gets its own list
 * under its name; a business that stays on a pack version before the item is
 * named under them.
 *
 * @example {@include ./examples.mdx}
 */
export default function ItemDetail({
  item,
  pack,
  businesses,
  status,
  onOpenCell,
  onOpenPack,
  now = Date.now(),
  onClose,
  className,
}: ItemDetailProps) {
  const { having, before } = standings(item, pack, businesses, status)
  const coverage = coverageOf(having.flatMap(({ rows }) => rows.map(({ cell }) => cell)))

  return (
    <div className={cn(PANE, className)}>
      <PaneHeader title={item.title} onClose={onClose}>
        <span className="text-caption text-muted-foreground">
          {item.label ?? item.id} · v{item.version} ·{' '}
          {onOpenPack ? (
            <button type="button" onClick={() => onOpenPack(pack.id)} className={TEXT_LINK}>
              {pack.title}
            </button>
          ) : (
            pack.title
          )}{' '}
          since v{item.since}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.applies_to.map(kind => (
            <Badge key={kind} size="compact" color="gray">
              {KIND_LABEL[kind]}
            </Badge>
          ))}
        </div>
      </PaneHeader>

      <PaneSection title="Why">
        <p className="text-body text-foreground">{item.why}</p>
      </PaneSection>

      <CheckSection item={item} />

      {item.recipe && (
        <PaneSection title="Recipe" aside="what a worker is told">
          <Markdown>{item.recipe}</Markdown>
        </PaneSection>
      )}

      <PaneSection
        title="Where it stands"
        aside={coverage.counted ? `${coverage.passing} of ${coverage.counted} pass` : undefined}
      >
        {having.length === 0 && <p className="text-body text-muted-foreground">No asset here it applies to.</p>}
        {having.map(({ business, version, rows }) => (
          <div key={business.id} className="flex flex-col gap-1">
            {having.length > 1 && (
              <span className="text-caption text-muted-foreground">
                {business.name} · v{version}
              </span>
            )}
            <FluidHover className="-mx-2 gap-0">
              {rows.map(({ asset, cell }) => {
                const line = lineOf(cell)
                const state = shownState(cell)
                return (
                  <FluidHover.Item
                    key={asset.id}
                    onClick={() => onOpenCell?.(cell, business.id)}
                    className="h-auto items-start gap-3 px-2 py-2"
                  >
                    <StateCell.Glyph
                      state={state}
                      worker={cell.run?.state === 'running' ? cell.run.worker : undefined}
                      version={state === 'pass-older' ? cell.result?.item_version : undefined}
                      size="small"
                      className="mt-0.5"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-body text-foreground">{assetName(asset)}</span>
                        {cell.result && (
                          <span className="shrink-0 text-caption text-muted-foreground">
                            {ago(cell.result.checked_at, now)}
                          </span>
                        )}
                      </span>
                      <span className={cn('truncate text-caption text-muted-foreground', line.mono && 'font-mono')}>
                        {line.text}
                      </span>
                    </span>
                    <ChevronRight strokeWidth={1.5} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  </FluidHover.Item>
                )
              })}
            </FluidHover>
          </div>
        ))}
        {before.length > 0 && (
          <p className="text-caption text-muted-foreground">
            {before.map(business => business.name).join(', ')} {before.length === 1 ? 'stays' : 'stay'} on {pack.title}{' '}
            before v{item.since}, which added it.
          </p>
        )}
      </PaneSection>
    </div>
  )
}

export type { ItemDetailProps }
export { ItemDetail }
