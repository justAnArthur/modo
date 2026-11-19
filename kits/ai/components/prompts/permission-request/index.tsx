/*!
 * Local addition (not part of Fluid Functionalism): an agent's tool asks to
 * run — the command first, then allow once, always allow a rule, or deny.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Code from '@justanarthur/modo-ui/primitives/content/code'
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
}

/**
 * A tool asks for permission to run.
 *
 * The card names the tool and shows what it would run as a code block; with
 * a detail (a Diff for an edit) the command is the path above it, a quiet
 * line. The answers sit on the
 * bottom row, the safest first: deny, always allow the `rule`, or allow once.
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
}: PermissionRequestProps) {
  return (
    <PromptCard
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
          <Button size="compact" onClick={() => onAnswer?.('once')}>
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
        <Code language="sh">{command}</Code>
      )}
      {detail}
    </PromptCard>
  )
}

export type { PermissionAnswer, PermissionRequestProps }
export { PermissionRequest }
