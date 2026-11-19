/*!
 * Local addition: the Packs screen's table, every pack with its version,
 * items, adopters and coverage. Presentational: the packs, businesses, cells
 * and the callback come in as props.
 */

'use client'

import Card from '@justanarthur/modo-ui/components/containers/card'
import Table from '@justanarthur/modo-ui/components/data-display/table'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Package } from 'lucide-react'
import CoverageMeter from '../../components/status/coverage-meter'
import { adoptedVersion, cellsOfPack, coverageOf } from '../../lib/cells'
import type { Business, CellStatus, LoadedPack } from '../../lib/types'

// The heads of the kit's other tables (BusinessesOverview, BusinessGrid): a muted caption on a 36px row.
const HEAD = 'h-9 text-caption weight-normal text-muted-foreground'

interface PackListProps {
  /** The loaded packs, in the order to show them. */
  packs: LoadedPack[]
  /** The businesses that could adopt them. */
  businesses: Business[]
  /** Each business's cells, by business id (`standards status`): the coverage column. */
  status: Record<string, CellStatus[]>
  /** Called with a pack's id on a press of its row. */
  onOpenPack?: (pack: string) => void
  /** The id of the pack open in the side pane: its row is lit. */
  activePack?: string
  /** Classes for the root. */
  className?: string
}

/**
 * Every pack in the workspace, one row each, in a card: its title and
 * description, its latest version, how many items it holds, how many
 * businesses adopted it (and how many stay on an older version), and its
 * coverage across their cells.
 *
 * The rows share Table's fluid hover; a press anywhere on a row, or Enter on
 * its title, opens the pack through `onOpenPack`, and the open one stays lit
 * (`activePack`). No packs shows an empty state.
 *
 * @example {@include ./examples.mdx}
 */
export default function PackList({ packs, businesses, status, onOpenPack, activePack, className }: PackListProps) {
  if (!packs.length)
    return (
      <EmptyState
        icon={Package}
        title="No packs yet"
        description="A pack is a folder of items with a pack.yml; add one to the workspace and its items join every grid that adopts it."
        className={className}
      />
    )

  const cells = businesses.flatMap(business => status[business.id] ?? [])

  return (
    <Card border="outlined" className={cn('pb-0', className)}>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head className={cn(HEAD, 'pl-4')}>Pack</Table.Head>
            <Table.Head className={HEAD}>Version</Table.Head>
            <Table.Head className={HEAD}>Items</Table.Head>
            <Table.Head className={HEAD}>Adopted by</Table.Head>
            <Table.Head className={cn(HEAD, 'pr-4')}>Coverage</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {packs.map(pack => {
            const versions = businesses.map(business => adoptedVersion(business, pack)).filter(v => v !== undefined)
            const pinned = versions.filter(version => version < pack.version).length
            return (
              <Table.Row
                key={pack.id}
                onClick={() => onOpenPack?.(pack.id)}
                className={cn('cursor-pointer last:border-b-0', activePack === pack.id && 'bg-active')}
              >
                <Table.Cell className="max-w-0 w-full py-2 pl-4">
                  {/* Keyboard access: Enter on the title fires a click that reaches the row. */}
                  <button
                    type="button"
                    aria-current={activePack === pack.id || undefined}
                    className="flex min-w-0 max-w-full cursor-pointer flex-col rounded-glyph text-left outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                  >
                    <span className="truncate text-foreground">{pack.title}</span>
                    {pack.description && (
                      <span className="max-w-full truncate text-caption text-muted-foreground">{pack.description}</span>
                    )}
                  </button>
                </Table.Cell>
                <Table.Cell>v{pack.version}</Table.Cell>
                <Table.Cell className="tabular-nums">{pack.entries.length}</Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {versions.length} of {businesses.length}
                  {pinned > 0 && <span className="text-caption text-muted-foreground"> · {pinned} on older</span>}
                </Table.Cell>
                <Table.Cell className="pr-4">
                  <CoverageMeter
                    value={coverageOf(cellsOfPack(cells, pack.id)).value}
                    label={`${pack.title} coverage`}
                  />
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </Card>
  )
}

export type { PackListProps }
export { PackList }
