/*!
 * Local addition: the AI app's side pane, beside the transcript. A
 * strip of pill tabs (TabsSubtle, only the picked one spelled out) switches
 * between the pane blocks (changes-pane, file-pane, …); a Dropdown beside the last tab adds
 * optional panes from plugins; the close button hands the room back to the
 * transcript. The whole pane is a compact region.
 */

'use client'

import Button from '../../../components/button'
import TabsSubtle from '../../../components/navigation/tabs-subtle'
import Dropdown from '../../../components/overlays/dropdown'
import Tooltip from '../../../components/overlays/tooltip'
import { type IconName, useIcon, useIcons } from '../../../lib/icon-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import ScrollArea from '../../../primitives/scroll-area'
import { SizeProvider } from '../../../primitives/sizes'
import ArtifactsPane from '../artifacts-pane'
import ChangesPane from '../changes-pane'
import FilePane from '../file-pane'
import PullRequestPane from '../pr-pane'
import type { PaneArtifact, PaneChange, PaneFile, PanePullRequest, PaneShell, PaneTask } from '../side-pane-types'
import TasksPane from '../tasks-pane'
import TerminalPane from '../terminal-pane'
import type { Profile } from '../types'
import UsagePane from '../usage-pane'

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

/** Every pane's data, handed to the pane blocks. */
interface SidePaneData {
  changes: PaneChange[]
  file: PaneFile
  shell: PaneShell
  pr: PanePullRequest
  artifacts: PaneArtifact[]
  tasks: PaneTask[]
  /** The profiles the extensions slot reads usage from. */
  profiles: Profile[]
}

const CONTENT: Record<PaneId, (data: SidePaneData) => React.ReactNode> = {
  changes: data => <ChangesPane changes={data.changes} />,
  file: data => <FilePane file={data.file} />,
  terminal: data => <TerminalPane shell={data.shell} />,
  pr: data => <PullRequestPane pr={data.pr} />,
  artifacts: data => <ArtifactsPane artifacts={data.artifacts} />,
  tasks: data => <TasksPane tasks={data.tasks} />,
  extension: data => <UsagePane profiles={data.profiles} />,
}

interface SidePaneProps {
  /** Every pane's data: changes, the open file, the shell, the pull request, artifacts, tasks and the profiles for usage. */
  data: SidePaneData
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
 * tab. The + beside the last tab adds optional panes from plugins (a
 * browser, an iOS simulator); the close button sits at the far edge. The
 * strip is as tall as the session's header, so the two share a line across
 * the window.
 *
 * Every pane speaks one language: a section row with a title, its meta and
 * icon actions, then rows on the control height whose text lines up with
 * the title. Changes splits the files into staged and unstaged with a
 * commit field on top; a row's stage, unstage and revert show on hover, and
 * the picked file's diff wraps its long lines (toggle it to scroll). File
 * shows a path crumb with copy and open. Terminal is a prompt you type at,
 * not a form. The pull request lists its checks: a failed one opens to the
 * tail of its log with Ask Claude to fix, and the merge waits while one
 * fails. Artifacts open on press; tasks stop while they run and retry once
 * they failed or stopped. The last tab is the extensions slot, a pane your
 * own MCP server or plugin provides: here, every profile's limits as pace
 * bars, read against the time until each resets. A pane with nothing in it
 * says so and what lands there.
 *
 * @example {@include ./examples.mdx}
 */
export default function SidePane({
  data,
  pane,
  defaultPane = 'changes',
  onPaneChange,
  onClose,
  className,
}: SidePaneProps) {
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
        {/* One height with the session's header, so the two rows share a baseline across the window. */}
        <div className="flex h-12 shrink-0 items-center gap-1 px-2">
          <TabsSubtle
            activeLabel
            idPrefix="side-pane"
            selectedIndex={index}
            onSelect={i => setCurrent(PANES[i]?.id ?? 'changes')}
            className="min-w-0"
          >
            {PANES.map((p, i) => (
              <TabsSubtle.Item key={p.id} index={i} icon={icons[p.icon]} label={p.label} />
            ))}
          </TabsSubtle>
          <Dropdown.Menu>
            <Dropdown.Trigger
              render={
                <Button variant="ghost" size="icon-compact" aria-label="Add a pane" className="shrink-0">
                  <Plus />
                </Button>
              }
            />
            <Dropdown.Content align="start" className="w-60">
              <Dropdown.Label>From plugins</Dropdown.Label>
              <Dropdown.Item index={0} icon={Globe} label="Browser (install)" />
              <Dropdown.Item index={1} icon={Phone} label="iOS simulator (install)" />
            </Dropdown.Content>
          </Dropdown.Menu>
          {onClose && (
            <Tooltip content="Close the pane" side="bottom">
              <Button
                variant="ghost"
                size="icon-compact"
                aria-label="Close the pane"
                className="ml-auto shrink-0"
                onClick={onClose}
              >
                <Close />
              </Button>
            </Tooltip>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
          <TabsSubtle.Panel
            index={index}
            selectedIndex={index}
            idPrefix="side-pane"
            className="px-2 pb-4 [contain:inline-size]"
          >
            {CONTENT[PANES[index]?.id ?? 'changes'](data)}
          </TabsSubtle.Panel>
        </ScrollArea>
      </SizeProvider>
    </section>
  )
}

export type { PaneId, SidePaneData, SidePaneProps }
