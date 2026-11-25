/*!
 * Local addition (not part of Fluid Functionalism): an agent's tool asks to
 * run — the command first, then allow once, always allow a rule, or deny.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Code from '@justanarthur/modo-ui/primitives/content/code'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import type { ReactNode } from 'react'
import PromptCard from '../prompt-card'

type PermissionAnswer = 'once' | 'always' | 'deny'

interface PermissionRequestProps {
  /** The tool asking: `Bash`, `Edit`, an MCP tool. */
  tool: string
  /** What it would run: the command, the path. */
  command: string
  /** More of what it would do, under the command: a Diff for an edit. */
  detail?: ReactNode
  /** The rule "Always allow" would add, after its label. */
  rule?: string
  /** A muted hint on the bottom row: who asks, the keys. Defaults to `'Esc denies'`. */
  hint?: ReactNode
  /** Called with the answer. */
  onAnswer?: (answer: PermissionAnswer) => void
  /** Takes focus on Allow once when it appears (Enter allows, Escape denies), unless you are typing elsewhere. */
  autoFocus?: boolean
}

/**
 * A tool asks for permission to run.
 *
 * The card names the tool and shows what it would run as a code block; with
 * a detail (a Diff for an edit) the command is the path above it, a quiet
 * line. The answers sit on the
 * bottom row, the safest first: deny, always allow the `rule`, or allow once.
 * A long command wraps, every line of it shown, and scrolls past a few
 * dozen lines: what you allow is all on the card. Escape denies.
 *
 * @example {@include ./examples.mdx}
 */
export default function PermissionRequest({
  tool,
  command,
  detail,
  rule,
  hint = 'Esc denies',
  onAnswer,
  autoFocus,
}: PermissionRequestProps) {
  return (
    <PromptCard
      autoFocus={autoFocus}
      onEscape={() => onAnswer?.('deny')}
      icon="shield-check"
      title={`Allow ${tool} to run this?`}
      tag={tool}
      hint={hint}
      actions={
        <>
          <Button size="compact" variant="ghost" onClick={() => onAnswer?.('deny')}>
            Deny
          </Button>
          <Button size="compact" variant="tertiary" onClick={() => onAnswer?.('always')}>
            Always allow{rule ? ` ${rule}` : ''}
          </Button>
          <Button size="compact" data-autofocus onClick={() => onAnswer?.('once')}>
            Allow once
          </Button>
        </>
      }
    >
      {/* With a detail (an edit's diff) the command is the path it touches: a line naming it, not a script to read. */}
      {detail ? (
        <span className="min-w-0 truncate font-mono text-caption text-muted-foreground" title={command}>
          {command}
        </span>
      ) : (
        <ScrollArea className="max-h-72 min-h-0 rounded-xl" viewportClassName="scroll-fade">
          <Code language="sh" className="[&_pre]:w-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-all">
            {command}
          </Code>
        </ScrollArea>
      )}
      {detail && (
        <ScrollArea className="max-h-72 min-h-0" viewportClassName="scroll-fade">
          {detail}
        </ScrollArea>
      )}
    </PromptCard>
  )
}

export type { PermissionAnswer, PermissionRequestProps }
export { PermissionRequest }
