/*!
 * Local addition: the settings screen's worktrees section — each session's
 * checkout with its state and size, removable on hover once merged or stale.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useIcon } from '../../../lib/icons'
import { Details, Facts, Group, Mono, ON_HOVER, Row, Section } from '../../../lib/settings-parts'
import type { Worktree } from '../../../lib/types'

const BADGE: Record<Worktree['state'], { color: 'green' | 'gray' | 'amber'; label: string }> = {
  active: { color: 'green', label: 'Active' },
  merged: { color: 'gray', label: 'Merged' },
  stale: { color: 'amber', label: 'Stale' },
}

const NOTE: Record<Worktree['state'], string> = {
  active: 'Its session is still running in it.',
  merged: 'Its branch is merged into main; nothing here is lost when it goes.',
  stale: 'No commits for 3 weeks and its session is archived. Uncommitted changes go with it.',
}

interface WorktreesProps {
  /** The sessions' checkouts. */
  worktrees: Worktree[]
  /** Their total size on disk, as the lead says it (`4.4 GB`). */
  onDisk: string
  /** Worktree paths whose rows start open. Defaults to `[]`. */
  defaultOpen?: string[]
  /** Called when "Clean up" (every merged and stale worktree) is pressed. */
  onCleanUp?: () => void
  /** Called when an open worktree's "Open in terminal" is pressed. */
  onOpenTerminal?: (worktree: Worktree) => void
  /** Called when a worktree's Remove is pressed, from its row or its card. */
  onRemove?: (worktree: Worktree) => void
}

/**
 * The checkouts sessions work in, and what they cost on disk.
 *
 * A row names the session over its branch, with its state and size on the
 * right. A merged or stale worktree can go: its remove button sits at the
 * row's end on hover (always shown on touch), and Clean up on top removes
 * them all. Press a row and it lifts into a card that says what removing it
 * costs, with its path, branch and size.
 *
 * @example {@include ./examples.mdx}
 */
export default function Worktrees({
  worktrees,
  onDisk,
  defaultOpen,
  onCleanUp,
  onOpenTerminal,
  onRemove,
}: WorktreesProps) {
  const Trash = useIcon('trash')
  const Terminal = useIcon('terminal')
  const removable = worktrees.filter(w => w.state !== 'active')
  return (
    <Section
      title="Worktrees"
      lead={`Sessions that work in their own checkout. ${onDisk} on disk; merged and stale ones can go.`}
      actions={
        <Button size="compact" variant="tertiary" leadingIcon={Trash} onClick={onCleanUp}>
          Clean up {removable.length}
        </Button>
      }
    >
      <Group title="Checkouts" aside={<span className="tabular-nums">{worktrees.length}</span>}>
        <Details label="Worktrees" actions="icon" defaultOpen={defaultOpen}>
          {worktrees.map((worktree, i) => (
            <Row
              key={worktree.path}
              value={worktree.path}
              index={i}
              label={worktree.session}
              caption={<span className="font-mono">{worktree.branch}</span>}
              meta={
                <>
                  <Badge size="compact" variant="dot" color={BADGE[worktree.state].color}>
                    {BADGE[worktree.state].label}
                  </Badge>
                  <span className="hidden w-14 text-right text-caption tabular-nums @md:inline">{worktree.size}</span>
                </>
              }
              action={
                worktree.state !== 'active' && (
                  <Tooltip content="Remove worktree" side="top">
                    <Button
                      size="icon-compact"
                      variant="ghost"
                      aria-label={`Remove ${worktree.path}`}
                      className={ON_HOVER}
                      onClick={() => onRemove?.(worktree)}
                    >
                      <Trash />
                    </Button>
                  </Tooltip>
                )
              }
            >
              <p className="m-0 text-body text-foreground">{NOTE[worktree.state]}</p>
              <Facts
                items={[
                  ['Path', <Mono key="p">{worktree.path}</Mono>],
                  ['Branch', <Mono key="b">{worktree.branch}</Mono>],
                  [
                    'On disk',
                    <span key="s" className="tabular-nums">
                      {worktree.size}
                    </span>,
                  ],
                ]}
              />
              <div className="flex justify-end gap-[var(--space-1)]">
                <Button
                  size="compact"
                  variant="ghost"
                  leadingIcon={Terminal}
                  onClick={() => onOpenTerminal?.(worktree)}
                >
                  Open in terminal
                </Button>
                {worktree.state !== 'active' && (
                  <Button size="compact" variant="ghost" leadingIcon={Trash} onClick={() => onRemove?.(worktree)}>
                    Remove
                  </Button>
                )}
              </div>
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

export type { WorktreesProps }

export { Worktrees }
