/*!
 * Local addition: the side pane's Terminal — the session's shell in its
 * folder, a prompt you type at rather than a form.
 */

'use client'

import { useSurface } from '@justanarthur/modo-ui'
import LogView from '@justanarthur/modo-ui/components/data-display/log-view'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactNode, useRef, useState } from 'react'
import { useIcon } from '../../../lib/icons'
import { IconAction, PaneSection } from '../../../lib/pane-parts'
import type { PaneShell, ShellEntry } from '../../../lib/side-pane-types'

function PromptLine({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="shrink-0 select-none text-muted-foreground">{prompt} $</span>
      {children}
    </div>
  )
}

interface TerminalPaneProps {
  /** The shell: its name, folder, prompt and the history so far. The pane keeps its own copy as you run and clear. */
  shell: PaneShell
  /** Called with each command entered at the prompt. */
  onRun?: (command: string) => void
}

/**
 * The session's shell in its folder: its history, then a prompt you type at.
 *
 * The history is a LogView (ANSI colors, follows the latest line, smooth on
 * long output). A press anywhere in the frame puts the caret on the prompt, as a terminal
 * does; Enter runs the line and adds it to the history. A failed command
 * ends on its exit code. Clear empties the history.
 *
 * @example {@include ./examples.mdx}
 */
export default function TerminalPane({ shell, onRun }: TerminalPaneProps) {
  const [history, setHistory] = useState<ShellEntry[]>(shell.history)
  const [command, setCommand] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const level = Math.min(useSurface() + 1, 8)
  const Clear = useIcon('trash')

  return (
    <PaneSection
      title={shell.name}
      meta={shell.cwd}
      actions={<IconAction icon={Clear} label="Clear" onClick={() => setHistory([])} />}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a press anywhere in the frame puts the caret on the prompt, as a terminal does; the input stays the keyboard target */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex cursor-text flex-col gap-1 rounded-xl p-3 font-mono text-caption text-foreground',
          SURFACE_BG[level],
        )}
      >
        <LogView
          label={`${shell.name} output`}
          prompt="$ "
          lines={history.flatMap(entry => [
            `$ ${entry.command}`,
            ...entry.output,
            // Red, as a shell prints a failure.
            ...(entry.exit ? [`\u001b[31mexit ${entry.exit}\u001b[0m`] : []),
          ])}
          className="-m-3 mb-0 rounded-b-none bg-transparent"
        />
        <PromptLine prompt={shell.prompt}>
          <input
            ref={inputRef}
            aria-label="Command"
            spellCheck={false}
            autoComplete="off"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter' || !command.trim()) return
              setHistory(h => [...h, { command, output: [] }])
              setCommand('')
              onRun?.(command)
            }}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-caption text-foreground caret-foreground outline-none"
          />
        </PromptLine>
      </div>
    </PaneSection>
  )
}

export type { TerminalPaneProps }

export { TerminalPane }
