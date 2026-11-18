/*!
 * Local addition: the AI app's side pane, beside the transcript. A
 * strip of pill tabs (subtle Tabs, only the picked one spelled out) switches
 * between the pane blocks (changes-pane, file-pane, …); a Dropdown beside the last tab adds
 * optional panes from plugins; the close button hands the room back to the
 * transcript. The whole pane is a compact region.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import Dropdown from '@justanarthur/modo-ui/components/overlays/dropdown'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/systems/sizes'
import { type ReactNode, useMemo } from 'react'
import { type IconComponent, type IconName, useIcon, useIcons } from '../../../lib/icons'
import type {
  PaneArtifact,
  PaneChange,
  PaneFile,
  PanePullRequest,
  PaneShell,
  PaneTask,
} from '../../../lib/side-pane-types'
import type { PaneId, Profile } from '../../../lib/types'
import ArtifactsPane, { type ArtifactsPaneProps } from '../artifacts-pane'
import ChangesPane, { type ChangesPaneProps } from '../changes-pane'
import FilePane, { type FilePaneProps } from '../file-pane'
import PullRequestPane, { type PullRequestPaneProps } from '../pr-pane'
import TasksPane, { type TasksPaneProps } from '../tasks-pane'
import TerminalPane, { type TerminalPaneProps } from '../terminal-pane'
import UsagePane, { type UsagePaneProps } from '../usage-pane'

const PANES: { id: PaneId; label: string; icon: IconName }[] = [
  { id: 'changes', label: 'Changes', icon: 'file-diff' },
  { id: 'file', label: 'File', icon: 'file-text' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal' },
  { id: 'pr', label: 'Pull request', icon: 'git-pull-request' },
  { id: 'artifacts', label: 'Artifacts', icon: 'layers' },
  { id: 'tasks', label: 'Tasks', icon: 'list-checks' },
  { id: 'extension', label: 'Usage', icon: 'puzzle' },
]

/** Every pane's data, handed to the pane blocks. Only the panes you show need theirs. */
interface SidePaneData {
  changes?: PaneChange[]
  file?: PaneFile
  /** The session's file paths, for the File pane's tree. */
  files?: string[]
  shell?: PaneShell
  pr?: PanePullRequest
  artifacts?: PaneArtifact[]
  tasks?: PaneTask[]
  /** The profiles the extensions slot reads usage from. */
  profiles?: Profile[]
}

/** Each pane block's own props (its callbacks, its controlled state), passed through as given. */
interface SidePanePaneProps {
  changes?: Partial<ChangesPaneProps>
  file?: Partial<FilePaneProps>
  terminal?: Partial<TerminalPaneProps>
  pr?: Partial<PullRequestPaneProps>
  artifacts?: Partial<ArtifactsPaneProps>
  tasks?: Partial<TasksPaneProps>
  extension?: Partial<UsagePaneProps>
}

/** A row of the + menu: an optional pane a plugin adds. */
interface SidePaneExtension {
  label: string
  icon: IconName
  /** Called when the row is picked. */
  onSelect?: () => void
}

// A pane whose one required piece of data is missing shows nothing.
const CONTENT: Record<PaneId, (data: SidePaneData, props: SidePanePaneProps) => ReactNode> = {
  changes: (data, props) => <ChangesPane changes={data.changes ?? []} {...props.changes} />,
  file: (data, props) => data.file && <FilePane file={data.file} files={data.files} {...props.file} />,
  terminal: (data, props) => data.shell && <TerminalPane shell={data.shell} {...props.terminal} />,
  pr: (data, props) => data.pr && <PullRequestPane pr={data.pr} {...props.pr} />,
  artifacts: (data, props) => <ArtifactsPane artifacts={data.artifacts ?? []} {...props.artifacts} />,
  tasks: (data, props) => <TasksPane tasks={data.tasks ?? []} {...props.tasks} />,
  extension: (data, props) => <UsagePane profiles={data.profiles ?? []} {...props.extension} />,
}

/** A tab's glyph with its count in the corner, which stays when the tab's name folds away. */
function badged(Icon: IconComponent, count: number): IconComponent {
  return function Badged(props) {
    return (
      <span className="relative flex shrink-0">
        <Icon {...props} />
        <span
          aria-hidden
          className="absolute -right-2 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-1 text-micro leading-none ring-2 ring-background tabular-nums text-background"
        >
          {count}
        </span>
      </span>
    )
  }
}

interface SidePaneProps {
  /** Every pane's data: changes, the open file, the shell, the pull request, artifacts, tasks and the profiles for usage. Only the shown panes need theirs. */
  data?: SidePaneData
  /** The panes to offer, in the strip's order. Defaults to every pane. */
  panes?: PaneId[]
  /** Each pane block's own props, by pane: its callbacks (`changes: { onStage, onCommit }`, `tasks: { onStop }`) and controlled state. */
  paneProps?: SidePanePaneProps
  /** A count on a pane's tab (files changed, tasks running), by pane; `0` shows none. */
  badges?: Partial<Record<PaneId, number>>
  /** Optional panes from plugins, offered by a + beside the last tab. Omit for no +. */
  extensions?: SidePaneExtension[]
  /** Controlled open pane. Pair with `onPaneChange`. */
  pane?: PaneId
  /** Initial pane, for an uncontrolled side pane. Defaults to the first pane. */
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
 * tab. `panes` picks which panes the strip offers, and only those need
 * their `data`; `badges` puts a count on a tab's glyph, so it shows while
 * the name is folded. The + beside the last tab adds optional panes from
 * plugins (`extensions`: a browser, an iOS simulator); without them there
 * is no +. The close button sits at the far edge. The
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
 * Each pane block takes its own props through `paneProps`, by pane:
 * Changes' `onStage`, `onRevert` and `onCommit`, Tasks' `onStop` and
 * `onRetry` (without them those buttons stay out), the terminal's `onRun`.
 *
 * @example {@include ./examples.mdx}
 */
export default function SidePane({
  data = {},
  panes,
  paneProps = {},
  badges = {},
  extensions,
  pane,
  defaultPane,
  onPaneChange,
  onClose,
  className,
}: SidePaneProps) {
  const offered = panes ? PANES.filter(p => panes.includes(p.id)) : PANES
  const first = offered[0]?.id ?? 'changes'
  const [current, setCurrent] = useControllableState(pane, defaultPane ?? first, onPaneChange)
  const icons = useIcons()
  const Close = useIcon('x')
  const Plus = useIcon('plus')
  const shown = offered.some(p => p.id === current) ? current : first
  const counts = offered.map(p => badges[p.id] ?? 0)
  // Built once per count: a component made during render would remount its tab's glyph every time.
  const glyphs = useMemo(
    () => offered.map((p, i) => (counts[i] ? badged(icons[p.icon], counts[i]) : icons[p.icon])),
    [icons, offered.map(p => p.id).join(), counts.join()],
  )

  return (
    <section aria-label="Side pane" className={cn('flex min-h-0 min-w-0 flex-col', className)}>
      <SizeProvider size="compact">
        <Tabs
          variant="subtle"
          activeLabel
          value={shown}
          onValueChange={value => setCurrent(value as PaneId)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* One height with the session's header, so the two rows share a baseline across the window. */}
          <div className="flex h-12 shrink-0 items-center gap-1 px-2">
            <Tabs.List className="min-w-0">
              {offered.map((p, i) => (
                <Tabs.Item
                  key={p.id}
                  value={p.id}
                  icon={glyphs[i]}
                  label={p.label}
                  {...(counts[i] ? { 'aria-label': `${p.label}, ${counts[i]}` } : {})}
                />
              ))}
            </Tabs.List>
            {extensions && extensions.length > 0 && (
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
                  {extensions.map((e, i) => (
                    <Dropdown.Item key={e.label} index={i} icon={icons[e.icon]} label={e.label} onSelect={e.onSelect} />
                  ))}
                </Dropdown.Content>
              </Dropdown.Menu>
            )}
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
            <Tabs.Panel value={shown} className="px-2 pb-4 [contain:inline-size]">
              {CONTENT[shown](data, paneProps)}
            </Tabs.Panel>
          </ScrollArea>
        </Tabs>
      </SizeProvider>
    </section>
  )
}

export type { SidePaneData, SidePaneExtension, SidePanePaneProps, SidePaneProps }
export { PANES, SidePane }
