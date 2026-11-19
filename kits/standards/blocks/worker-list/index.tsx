/*!
 * Local addition: the Workers screen's table, every worker preset as the
 * workspace defines it. Read-only and presentational: the workers come in as
 * props.
 */

'use client'

import Table from '@justanarthur/modo-ui/components/data-display/table'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import { Bot } from 'lucide-react'
import type { Worker } from '../../lib/types'

const PERMISSION: Record<Worker['permission_mode'], string> = {
  default: 'asks first',
  acceptEdits: 'accepts edits',
  plan: 'plans, edits nothing',
}

interface WorkerListProps {
  /** The worker presets, in the order to show them. */
  workers: Worker[]
  /** Classes for the root. */
  className?: string
}

/**
 * Every worker preset a failing cell can be handed to, one row each: its id,
 * its runtime, the model and effort it runs at, its permission mode (named,
 * with what it means under it), the Claude Code profile it starts from, and
 * the tools it may use without asking, as they are written in its preset.
 *
 * Read-only: the presets live in the workspace's config. A worker allowed no
 * tools beyond Claude Code's defaults says so; no workers shows an empty state.
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
    <Table className={className}>
      <Table.Header>
        <Table.Row>
          <Table.Head>Worker</Table.Head>
          <Table.Head>Runtime</Table.Head>
          <Table.Head>Model</Table.Head>
          <Table.Head>Effort</Table.Head>
          <Table.Head className="whitespace-nowrap">Permission mode</Table.Head>
          <Table.Head>Profile</Table.Head>
          <Table.Head className="whitespace-nowrap">Allowed tools</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {workers.map(worker => (
          <Table.Row key={worker.id}>
            <Table.Cell className="whitespace-nowrap text-foreground">{worker.id}</Table.Cell>
            <Table.Cell className="whitespace-nowrap">{worker.runtime}</Table.Cell>
            <Table.Cell>{worker.model}</Table.Cell>
            <Table.Cell>{worker.effort ?? '—'}</Table.Cell>
            <Table.Cell className="whitespace-nowrap py-2">
              <span className="flex flex-col">
                <span className="font-mono text-caption">{worker.permission_mode}</span>
                <span className="text-caption text-muted-foreground">{PERMISSION[worker.permission_mode]}</span>
              </span>
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap font-mono text-caption">{worker.profile}</Table.Cell>
            <Table.Cell className="py-2">
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
  )
}

export type { WorkerListProps }
export { WorkerList }
