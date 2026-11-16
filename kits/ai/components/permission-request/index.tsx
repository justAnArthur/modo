/*!
 * Local addition (not part of Fluid Functionalism): an agent's tool asks to
 * run — the command first, then allow once, always allow a rule, or deny.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Code from '@justanarthur/modo-ui/primitives/code'
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
 * The card names the tool and shows what it would run as a code block, with
 * an optional detail under it (a Diff for an edit). The answers sit on the
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
      <Code language="sh">{command}</Code>
      {detail}
    </PromptCard>
  )
}

export type { PermissionAnswer, PermissionRequestProps }
export { PermissionRequest }
