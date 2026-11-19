/*!
 * Local addition: the Businesses screen's table, every business against every
 * pack it could adopt, in a card under a summary strip. Presentational: the
 * businesses, packs, cells and the callbacks come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Card from '@justanarthur/modo-ui/components/containers/card'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import { useIcon } from '@justanarthur/modo-ui/lib/icon-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useSurface } from '@justanarthur/modo-ui/lib/surface-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Building2, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import PackCoverageCell from '../../components/status/pack-coverage-cell'
import { adoptedVersion, cellsOfPack, coverageOf } from '../../lib/cells'
import type { Business, CellStatus, LoadedPack } from '../../lib/types'

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-border border-l px-4 py-3 first:border-l-0">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-title weight-semibold tabular-nums text-foreground">{value}</span>
        {detail && <span className="truncate text-caption text-muted-foreground">{detail}</span>}
      </span>
    </div>
  )
}

function Legend() {
  const Info = useIcon('info')
  const rows = [
    {
      sample: <PackCoverageCell label="Sample" value={0.7} fails={2} />,
      text: "The share of the pack's checks that pass, and the cells failing with nobody on them.",
    },
    {
      sample: <span className="text-caption text-muted-foreground">v1</span>,
      text: 'Stays on an older version of the pack.',
    },
    {
      sample: <PackCoverageCell label="Sample" adopted={false} />,
      text: 'Not adopted: a choice, not a gap, so never red.',
    },
  ]
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
        <ul className="flex flex-col gap-3">
          {rows.map(row => (
            <li key={row.text} className="flex flex-col items-start gap-1 text-caption text-foreground">
              {row.sample}
              {row.text}
            </li>
          ))}
        </ul>
        <Popover.Description>
          Coverage counts a pass on an older version as passing and leaves waived cells out.
        </Popover.Description>
      </Popover.Content>
    </Popover>
  )
}

interface BusinessesOverviewProps {
  /** The businesses, as rows, in the order to show them. */
  businesses: Business[]
  /** Every pack a business could adopt, as columns. */
  packs: LoadedPack[]
  /** Each business's cells, by business id (`standards status`). */
  status: Record<string, CellStatus[]>
  /** Called with a business's id from its name, and with a pack's id too from one of its cells. */
  onOpenBusiness?: (business: string, pack?: string) => void
  /** Called on Add business. Without it the button is left out. */
  onAddBusiness?: () => void
  /** Classes for the root. Give it a height (or a flex parent) so the table scrolls under its sticky head. */
  className?: string
}

/**
 * Every business against every pack: one row per business, one column per
 * pack, and in each cell that pack's coverage across the business's assets
 * with the count of cells failing with nobody on them.
 *
 * A pack a business hasn't adopted is a dashed "not adopted", never red: it is
 * a choice, not a gap. A business that stays on an older pack version marks
 * it (`v1`). The last column is the business's coverage over all its packs;
 * a strip above sums the whole table: coverage, failing cells, cells a worker
 * or a PR is on, and the businesses. Coverage counts pass and older-version
 * pass as passing and leaves waived cells out.
 *
 * The head and the business column stay put while the table scrolls, so it
 * stays readable at 30 rows and more; give the block a height, and the card
 * is as tall as its rows up to it. A business's name opens it, a pack cell
 * opens it on that pack. The info button by the table's count opens the
 * legend.
 *
 * @example {@include ./examples.mdx}
 */
export default function BusinessesOverview({
  businesses,
  packs,
  status,
  onOpenBusiness,
  onAddBusiness,
  className,
}: BusinessesOverviewProps) {
  const surface = SURFACE_BG[useSurface()]
  const total = coverageOf(businesses.flatMap(business => status[business.id] ?? []))
  const assets = businesses.reduce((sum, business) => sum + business.assets.length, 0)

  const add = onAddBusiness && (
    <Button leadingIcon={Plus} size="compact" onClick={onAddBusiness}>
      Add business
    </Button>
  )

  if (!businesses.length)
    return (
      <EmptyState
        icon={Building2}
        title="No businesses yet"
        description="Add one with its sites and repos, adopt packs, and its grid fills as the checks run."
        actions={add}
        className={className}
      />
    )

  const sticky = cn('sticky z-10 border-border', surface)
  const head = 'h-9 border-border border-b px-3 text-left align-middle text-caption weight-normal text-muted-foreground'
  const last = businesses.at(-1)

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col gap-4', className)}>
      <Card border="outlined" className="grid shrink-0 grid-cols-4 pb-0">
        <Stat
          label="Coverage"
          value={total.value === null ? '—' : `${Math.round(total.value * 100)}%`}
          detail={`${total.passing} of ${total.counted} checks`}
        />
        <Stat label="Failing, nobody on it" value={total.fails} />
        <Stat label="In flight" value={total.inFlight} detail="workers and open PRs" />
        <Stat label="Businesses" value={businesses.length} detail={`${assets} assets`} />
      </Card>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex min-h-9 shrink-0 items-center gap-3">
          <span className="text-caption text-muted-foreground">
            {businesses.length} businesses × {packs.length} packs
          </span>
          <Legend />
          {add && <span className="ml-auto">{add}</span>}
        </div>

        <Card border="outlined" className="min-h-0 pb-0">
          <div className="min-h-0 overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-body">
              <thead>
                <tr>
                  <th scope="col" className={cn(head, sticky, 'top-0 left-0 z-30 min-w-56 border-r pl-4')}>
                    Business
                  </th>
                  {packs.map(pack => (
                    <th key={pack.id} scope="col" className={cn(head, sticky, 'top-0 z-20 min-w-36')}>
                      <span className="text-foreground">{pack.title}</span> v{pack.version}
                    </th>
                  ))}
                  <th scope="col" className={cn(head, sticky, 'top-0 z-20 min-w-36 pr-4')}>
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(business => {
                  const cells = status[business.id] ?? []
                  const all = coverageOf(cells)
                  const cell = cn(
                    'h-9 border-border px-3 py-0 group-hover/row:bg-hover',
                    business !== last && 'border-b',
                  )
                  return (
                    <tr key={business.id} className="group/row">
                      <th
                        scope="row"
                        className={cn(
                          sticky,
                          'left-0 border-r p-0 text-left weight-normal',
                          business !== last && 'border-b',
                        )}
                      >
                        <div className="flex h-9 items-center gap-2 pr-3 pl-4 group-hover/row:bg-hover">
                          <button
                            type="button"
                            onClick={() => onOpenBusiness?.(business.id)}
                            className="min-w-0 cursor-pointer truncate text-left text-foreground outline-none hover:underline focus-visible:ring-1 focus-visible:ring-focus-ring"
                          >
                            {business.name}
                          </button>
                          <span className="ml-auto shrink-0 text-caption text-muted-foreground">
                            {business.assets.length} {business.assets.length === 1 ? 'asset' : 'assets'}
                          </span>
                        </div>
                      </th>
                      {packs.map(pack => {
                        const version = adoptedVersion(business, pack)
                        const coverage = coverageOf(cellsOfPack(cells, pack.id))
                        return (
                          <td key={pack.id} className={cell}>
                            {version === undefined ? (
                              <PackCoverageCell label={`${business.name}, ${pack.title}`} adopted={false} />
                            ) : (
                              <PackCoverageCell
                                label={`${business.name}, ${pack.title}`}
                                value={coverage.value}
                                fails={coverage.fails}
                                pinned={version < pack.version ? version : undefined}
                                onClick={onOpenBusiness && (() => onOpenBusiness(business.id, pack.id))}
                                className="-mx-1.5"
                              />
                            )}
                          </td>
                        )
                      })}
                      <td className={cn(cell, 'pr-4')}>
                        <PackCoverageCell label={business.name} value={all.value} fails={all.fails} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

export type { BusinessesOverviewProps }
export { BusinessesOverview }
