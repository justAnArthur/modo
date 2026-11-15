/*!
 * Local addition: the agent desktop's side pane, beside the transcript. A
 * strip of pill tabs (TabsSubtle, only the picked one spelled out) switches
 * between the panes in panes.tsx; a Dropdown adds optional panes from
 * plugins; the close button hands the room back to the transcript.
 */

'use client'

import Button from '../../../components/button'
import TabsSubtle from '../../../components/navigation/tabs-subtle'
import Dropdown from '../../../components/overlays/dropdown'
import { type IconName, useIcon, useIcons } from '../../../lib/icon-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import ScrollArea from '../../../primitives/scroll-area'
import { SizeProvider } from '../../../primitives/sizes'
import { ArtifactsPane, ChangesPane, ExtensionPane, FilePane, PullRequestPane, TasksPane, TerminalPane } from './panes'

type PaneId = 'changes' | 'file' | 'terminal' | 'pr' | 'artifacts' | 'tasks' | 'extension'

const PANES: { id: PaneId; label: string; icon: IconName }[] = [
  { id: 'changes', label: 'Changes', icon: 'file-diff' },
  { id: 'file', label: 'File', icon: 'file-text' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal' },
  { id: 'pr', label: 'Pull request', icon: 'git-pull-request' },
  { id: 'artifacts', label: 'Artifacts', icon: 'layers' },
  { id: 'tasks', label: 'Tasks', icon: 'list-checks' },
  { id: 'extension', label: 'Usage', icon: 'puzzle' },
]

const CONTENT: Record<PaneId, () => React.ReactNode> = {
  changes: () => <ChangesPane />,
  file: () => <FilePane />,
  terminal: () => <TerminalPane />,
  pr: () => <PullRequestPane />,
  artifacts: () => <ArtifactsPane />,
  tasks: () => <TasksPane />,
  extension: () => <ExtensionPane />,
}

interface SidePaneProps {
  /** Controlled open pane. Pair with `onPaneChange`. */
  pane?: PaneId
  /** Initial pane, for an uncontrolled side pane. Defaults to `'changes'`. */
  defaultPane?: PaneId
  /** Called with the pane picked in the strip. */
  onPaneChange?: (pane: PaneId) => void
  /** Called by the close button. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * The room beside the transcript for what the session touches: its
 * changes, a file, a terminal, its pull request, artifacts and background
 * tasks.
 *
 * Pill tabs at the top switch panes; only the picked tab spells out its
 * name, so the strip fits a narrow pane, and the pill melts from tab to
 * tab. Changes lists the touched files and shows the picked one's diff,
 * with commit and discard. The pull request pane lists the CI checks as
 * they run and turns Auto-fix on, so the session watches CI and answers
 * review comments. Tasks lists background agents, shells and child
 * sessions with a stop button for each running one. The last tab is the
 * extensions slot: a pane your own MCP server or plugin provides (here a
 * usage view across every profile); the + menu adds optional panes from
 * plugins, such as a browser or an iOS simulator.
 *
 * @example {@include ./examples.mdx}
 */
export default function SidePane({ pane, defaultPane = 'changes', onPaneChange, onClose, className }: SidePaneProps) {
  const [current, setCurrent] = useControllableState(pane, defaultPane, onPaneChange)
  const icons = useIcons()
  const Close = useIcon('x')
  const Plus = useIcon('plus')
  const Globe = useIcon('globe')
  const Phone = useIcon('monitor')
  const index = Math.max(
    PANES.findIndex(p => p.id === current),
    0,
  )

  return (
    <section aria-label="Side pane" className={cn('flex min-h-0 min-w-0 flex-col', className)}>
      <SizeProvider size="compact">
        <div className="flex h-12 shrink-0 items-center gap-1 px-2">
          <TabsSubtle
            activeLabel
            idPrefix="side-pane"
            selectedIndex={index}
            onSelect={i => setCurrent(PANES[i]?.id ?? 'changes')}
            className="min-w-0 flex-1"
          >
            {PANES.map((p, i) => (
              <TabsSubtle.Item key={p.id} index={i} icon={icons[p.icon]} label={p.label} />
            ))}
          </TabsSubtle>
          <Dropdown.Menu>
            <Dropdown.Trigger
              render={
                <Button variant="ghost" size="icon-compact" aria-label="Add a pane">
                  <Plus />
                </Button>
              }
            />
            <Dropdown.Content align="end" className="w-60">
              <Dropdown.Label>From plugins</Dropdown.Label>
              <Dropdown.Item index={0} icon={Globe} label="Browser (install)" />
              <Dropdown.Item index={1} icon={Phone} label="iOS simulator (install)" />
            </Dropdown.Content>
          </Dropdown.Menu>
          {onClose && (
            <Button variant="ghost" size="icon-compact" aria-label="Close the pane" onClick={onClose}>
              <Close />
            </Button>
          )}
        </div>
      </SizeProvider>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
        <TabsSubtle.Panel
          index={index}
          selectedIndex={index}
          idPrefix="side-pane"
          className="px-4 pb-4 [contain:inline-size]"
        >
          {CONTENT[PANES[index]?.id ?? 'changes']()}
        </TabsSubtle.Panel>
      </ScrollArea>
    </section>
  )
}

export type { PaneId, SidePaneProps }
