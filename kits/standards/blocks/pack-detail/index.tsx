/*!
 * Local addition: the side pane for one pack: its items with their coverage,
 * its changelog and the businesses that adopted it. Presentational: the
 * pack, the businesses, their cells and the callbacks come in as props.
 */

'use client'

import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import CoverageMeter from '../../components/status/coverage-meter'
import { adoptedVersion, cellsOfPack, coverageOf } from '../../lib/cells'
import type { Business, CellStatus, LoadedPack } from '../../lib/types'
import { PANE, PaneHeader, PaneSection } from '../pane'

// One grid for a list's column heads and its rows, so the columns line up.
const ITEM_COLUMNS = 'grid grid-cols-[minmax(0,1fr)_3rem_3rem_5.5rem] items-center gap-x-3'
const BUSINESS_COLUMNS = 'grid grid-cols-[minmax(0,1fr)_6rem_5.5rem] items-center gap-x-3'

function Columns({ className, labels }: { className: string; labels: string[] }) {
  return (
    <div aria-hidden className={cn(className, 'text-caption text-muted-foreground')}>
      {labels.map(label => (
        <span key={label}>{label}</span>
      ))}
    </div>
  )
}

interface PackDetailProps {
  /** The pack, with its items in order and its changelog. */
  pack: LoadedPack
  /** The businesses that could adopt it: those that did are listed with their version. */
  businesses: Business[]
  /** Each business's cells, by business id (`standards status`): the items' and adopters' coverage. */
  status: Record<string, CellStatus[]>
  /** Called with an item's key (`pack/item`) on a press of its row. */
  onOpenItem?: (item: string) => void
  /** Called with a business's id on a press of its row. */
  onOpenBusiness?: (business: string) => void
  /** Called on the close button. Without it there is none. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * Everything about one pack, for the side pane the grid opens from a pack's
 * head or the Packs screen opens from a row: what it covers, what changed,
 * and who follows it.
 *
 * The head names the pack and its version, with its description. Its items
 * follow in the pack's order, each with its short label and title, its own
 * version, the pack version that added it, and its coverage across the cells
 * given; a row opens the item through `onOpenItem`. Then the changelog,
 * newest first, and the businesses that adopted the pack: the version each
 * follows (a pinned older one is marked) and the pack's coverage on its
 * assets; a row opens the business through `onOpenBusiness`. Those that
 * haven't adopted it are named under them.
 *
 * Coverage counts as everywhere in the kit: a pass on an older item version
 * passes, waived cells are left out (see `coverageOf`).
 *
 * @example {@include ./examples.mdx}
 */
export default function PackDetail({
  pack,
  businesses,
  status,
  onOpenItem,
  onOpenBusiness,
  onClose,
  className,
}: PackDetailProps) {
  const cells = cellsOfPack(
    businesses.flatMap(business => status[business.id] ?? []),
    pack.id,
  )
  const adopters = businesses.filter(business => adoptedVersion(business, pack) !== undefined)
  const others = businesses.filter(business => !adopters.includes(business))
  const total = coverageOf(cells)
  const changelog = [...pack.changelog].sort((a, b) => b.version - a.version)

  return (
    <div className={cn(PANE, className)}>
      <PaneHeader title={pack.title} onClose={onClose}>
        <span className="text-caption text-muted-foreground">
          v{pack.version} · {pack.entries.length} items · adopted by {adopters.length} of {businesses.length}
        </span>
        {pack.description && <p className="pt-1 text-body text-foreground">{pack.description}</p>}
      </PaneHeader>

      <PaneSection
        title="Items"
        aside={total.value === null ? undefined : `${Math.round(total.value * 100)}% of ${total.counted} cells pass`}
      >
        <div className="flex flex-col gap-1">
          <Columns className={ITEM_COLUMNS} labels={['Item', 'Version', 'Since', 'Coverage']} />
          <FluidHover className="-mx-2 gap-0">
            {pack.entries.map(item => (
              <FluidHover.Item
                key={item.key}
                onClick={() => onOpenItem?.(item.key)}
                className={cn(ITEM_COLUMNS, 'h-auto px-2 py-1.5')}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body text-foreground">{item.label ?? item.id}</span>
                  {item.title !== item.label && (
                    <span className="truncate text-caption text-muted-foreground">{item.title}</span>
                  )}
                </span>
                <span className="text-caption text-muted-foreground">v{item.version}</span>
                <span className="text-caption text-muted-foreground">v{item.since}</span>
                <CoverageMeter
                  value={coverageOf(cells.filter(cell => cell.item === item.key)).value}
                  label={`${item.title} coverage`}
                  className="text-body"
                />
              </FluidHover.Item>
            ))}
          </FluidHover>
        </div>
      </PaneSection>

      <PaneSection title="Changelog">
        <ol className="flex flex-col gap-3">
          {changelog.map(entry => (
            <li key={entry.version} className="flex flex-col gap-0.5">
              <span className="flex items-baseline gap-2">
                <span className="text-body weight-semibold text-foreground">v{entry.version}</span>
                <span className="text-caption text-muted-foreground">{entry.date}</span>
              </span>
              <p className="text-body text-foreground">{entry.notes}</p>
            </li>
          ))}
        </ol>
      </PaneSection>

      <PaneSection title="Adopted by" aside={`${adopters.length} of ${businesses.length}`}>
        {adopters.length > 0 && (
          <div className="flex flex-col gap-1">
            <Columns className={BUSINESS_COLUMNS} labels={['Business', 'Version', 'Coverage']} />
            <FluidHover className="-mx-2 gap-0">
              {adopters.map(business => {
                const version = adoptedVersion(business, pack)!
                return (
                  <FluidHover.Item
                    key={business.id}
                    onClick={() => onOpenBusiness?.(business.id)}
                    className={cn(BUSINESS_COLUMNS, 'px-2')}
                  >
                    <span className="truncate text-body text-foreground">{business.name}</span>
                    <span className="text-caption text-muted-foreground">
                      v{version}
                      {version < pack.version && ', pinned'}
                    </span>
                    <CoverageMeter
                      value={coverageOf(cellsOfPack(status[business.id] ?? [], pack.id)).value}
                      label={`${business.name} coverage`}
                      className="text-body"
                    />
                  </FluidHover.Item>
                )
              })}
            </FluidHover>
          </div>
        )}
        {others.length > 0 && (
          <p className="text-caption text-muted-foreground">
            Not adopted by {others.map(business => business.name).join(', ')}.
          </p>
        )}
      </PaneSection>
    </div>
  )
}

export type { PackDetailProps }
export { PackDetail }
