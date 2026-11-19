/*!
 * Local addition: the Workers screen's table, every worker preset as the
 * workspace defines it. Read-only and presentational: the workers come in as
 * props.
 */

'use client'

import Card from '@justanarthur/modo-ui/components/containers/card'
import Table from '@justanarthur/modo-ui/components/data-display/table'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Bot } from 'lucide-react'
import { PERMISSION } from '../../lib/states'
import type { Worker } from '../../lib/types'

// The heads of the kit's other tables (BusinessesOverview, BusinessGrid): a muted caption on a 36px row.
const HEAD = 'h-9 text-caption weight-normal text-muted-foreground'

interface WorkerListProps {
  /** The worker presets, in the order to show them. */
  workers: Worker[]
  /** Classes for the root. */
  className?: string
}

/**
 * Every worker preset a failing cell can be handed to, one row each, in a
 * card: its id, its runtime, the model and effort it runs at, its permission
 * mode (named, with what it means under it), the Claude Code profile it
 * starts from, and the tools it may use without asking, as they are written
 * in its preset.
 *
 * Read-only: the presets live in the workspace's config. A worker allowed no
 * tools beyond Claude Code's defaults says so; no workers shows an empty state.
 * A table wider than the card scrolls sideways inside it.
 *
 * @example {@include ./examples.mdx}
 */
export default function WorkerList({ workers, className }: WorkerListProps) {
  if (!workers.length)
    return (
      <EmptyState
        icon={Bot}
        title="No workers yet"
        description="A worker is a Claude Code preset: a model, an effort, a permission mode and the tools it may use. Add one to the workspace's config."
        className={className}
      />
    )

  return (
    <Card border="outlined" className={cn('pb-0', className)}>
      <Table containerClassName="overflow-x-auto">
        <Table.Header>
          <Table.Row>
            <Table.Head className={cn(HEAD, 'pl-4')}>Worker</Table.Head>
            <Table.Head className={HEAD}>Runtime</Table.Head>
            <Table.Head className={HEAD}>Model</Table.Head>
            <Table.Head className={HEAD}>Effort</Table.Head>
            <Table.Head className={cn(HEAD, 'whitespace-nowrap')}>Permission mode</Table.Head>
            <Table.Head className={HEAD}>Profile</Table.Head>
            <Table.Head className={cn(HEAD, 'whitespace-nowrap pr-4')}>Allowed tools</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {workers.map(worker => (
            <Table.Row key={worker.id} className="last:border-b-0">
              <Table.Cell className="whitespace-nowrap pl-4 text-foreground">{worker.id}</Table.Cell>
              <Table.Cell className="whitespace-nowrap">{worker.runtime}</Table.Cell>
              <Table.Cell>{worker.model}</Table.Cell>
              <Table.Cell>{worker.effort ?? '—'}</Table.Cell>
              <Table.Cell className="whitespace-nowrap py-2">
                <span className="flex flex-col">
                  <span className="font-mono text-caption">{worker.permission_mode}</span>
                  <span className="text-caption text-muted-foreground">{PERMISSION[worker.permission_mode].label}</span>
                </span>
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap font-mono text-caption">{worker.profile}</Table.Cell>
              <Table.Cell className="py-2 pr-4">
                {worker.allow.length ? (
                  <span className="flex flex-wrap gap-1">
                    {worker.allow.map(tool => (
                      <code
                        key={tool}
                        className="whitespace-nowrap rounded-glyph bg-active px-1 font-mono text-caption text-foreground"
                      >
                        {tool}
                      </code>
                    ))}
                  </span>
                ) : (
                  <span className="text-caption text-muted-foreground">none beyond Claude Code's defaults</span>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Card>
  )
}

export type { WorkerListProps }
export { WorkerList }
