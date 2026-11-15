/*!
 * Local addition: the agent desktop's main window — the sessions sidebar, the
 * session (transcript, pinned task list, any pending prompt, composer), an
 * optional second session in split view, and the side pane. Built only from
 * the agent-desktop blocks and ui components, on mock data.
 */

'use client'

import { useState } from 'react'
import AgentPrompt from '../../../blocks/agent-desktop/agent-prompt'
import Composer from '../../../blocks/agent-desktop/composer'
import { DEMO_CHAPTERS, DEMO_TASKS, DemoReading, DemoSession } from '../../../blocks/agent-desktop/demo-session'
import { ARCHIVED, GROUPS, PINNED, PROFILES, type Session } from '../../../blocks/agent-desktop/mock'
import SessionSidebar from '../../../blocks/agent-desktop/session-sidebar'
import SidePane, { type PaneId } from '../../../blocks/agent-desktop/side-pane'
import Transcript from '../../../blocks/agent-desktop/transcript'
import Diff from '../../../components/AI/diff'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Sidebar from '../../../components/navigation/sidebar'
import Tooltip from '../../../components/overlays/tooltip'
import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'

type PromptKind = 'none' | 'permission' | 'edit' | 'question' | 'multi' | 'preview' | 'plan' | 'offer' | 'task'

const ALL_SESSIONS: Session[] = [
  ...PINNED,
  ...GROUPS.flatMap(g => g.sessions.flatMap(s => [s, ...(s.children ?? [])])),
  ...ARCHIVED,
]

function findSession(id: string) {
  return ALL_SESSIONS.find(s => s.id === id) ?? PINNED[0]
}

function Prompt({ kind, onDone }: { kind: PromptKind; onDone: () => void }) {
  if (kind === 'permission')
    return <AgentPrompt.Permission tool="Bash" command="bun run check" rule="bun run *" onAnswer={onDone} />
  if (kind === 'edit')
    return (
      <AgentPrompt.Permission
        tool="Edit"
        command="ui/uno.config.ts"
        onAnswer={onDone}
        detail={
          <Diff
            lineNumbers={false}
            patch={`@@ -25,1 +25,1 @@
-const sources = resolve(root, '{lib,primitives,components,blocks}/**/*.{ts,tsx,mdx}')
+const sources = resolve(root, '{lib,primitives,components,blocks,pages}/**/*.{ts,tsx,mdx}')`}
          />
        }
      />
    )
  if (kind === 'question')
    return (
      <AgentPrompt.Question
        tag="Layout"
        question="Where should the side panes open?"
        onSubmit={onDone}
        options={[
          { label: 'Right of the transcript (Recommended)', description: 'One pane at a time, tabs on top' },
          { label: 'Below the transcript', description: 'Like an IDE panel; more room for wide diffs' },
          { label: 'In a separate window', description: 'For a second screen' },
        ]}
      />
    )
  if (kind === 'multi')
    return (
      <AgentPrompt.Question
        tag="Settings"
        multiSelect
        question="Which settings pages should the first build include?"
        onSubmit={onDone}
        options={[{ label: 'MCP servers' }, { label: 'Hooks' }, { label: 'Skills and plugins' }, { label: 'Memory' }]}
      />
    )
  if (kind === 'preview')
    return (
      <AgentPrompt.Question
        tag="Sidebar"
        question="How should a running session show in the sidebar?"
        onSubmit={onDone}
        options={[
          {
            label: 'Turning arc',
            description: 'Leading glyph',
            preview:
              '◜ Design the agent desktop      now\n• Canvas page and pages tier    3m\n○ TSDoc parser drops @values   1h',
          },
          {
            label: 'Badge',
            description: 'Trailing chip',
            preview:
              '  Design the agent desktop  Running\n  Canvas page and pages tier   Waiting\n  TSDoc parser drops @values',
          },
        ]}
      />
    )
  if (kind === 'plan')
    return (
      <AgentPrompt.Plan onDecide={onDone}>
        <h3 className="m-0">Agent desktop screens</h3>
        <ol className="m-0">
          <li>
            Add <code>Meter</code> and <code>Diff</code> to the components.
          </li>
          <li>
            Build six blocks under <code>blocks/agent-desktop</code>.
          </li>
          <li>
            Assemble five pages under <code>pages/agent-desktop</code>.
          </li>
        </ol>
      </AgentPrompt.Plan>
    )
  if (kind === 'offer')
    return (
      <AgentPrompt.Offer
        title="Port the settings screen to Tauri"
        brief="It builds on nothing in this session and ends in its own branch."
        onChoose={onDone}
      />
    )
  if (kind === 'task')
    return (
      <AgentPrompt.Task
        title="Fix the parser's @values test"
        brief="CI fails on parser › keeps @values since the TSDoc refactor. Restore the tag and add a regression test."
        where="jobiflow · new worktree"
        onDecide={onDone}
      />
    )
  return null
}

function SplitSession({ id, onClose, trailing }: { id: string; onClose: () => void; trailing?: React.ReactNode }) {
  const session = findSession(id)
  const Close = useIcon('x')
  return (
    <section
      aria-label={`Split: ${session?.title}`}
      className="hidden min-w-0 flex-1 flex-col border-l border-border @3xl:flex"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-1.5">
        <span className="min-w-0 truncate text-body weight-medium text-foreground">{session?.title}</span>
        <Badge size="compact" color="gray" className="shrink-0">
          {session?.profile}
        </Badge>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon-compact" aria-label="Close split" onClick={onClose}>
            <Close />
          </Button>
          {trailing}
        </div>
      </div>
      <Transcript>
        <DemoReading />
      </Transcript>
      <div className="px-6 pb-4">
        <Composer />
      </div>
    </section>
  )
}

interface WorkspaceProps {
  /** The side pane that starts open, or `'none'`. Defaults to `'changes'`. */
  pane?: PaneId | 'none'
  /** Start with a second session open in split view. Defaults to `false`. */
  split?: boolean
  /** The prompt waiting under the transcript. Defaults to `'none'`. */
  prompt?: PromptKind
  /** Show the wrap-up box under the task list when no prompt waits. Defaults to `false`. */
  wrapUp?: boolean
  /** Start with the sessions sidebar open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * The agent desktop's main window: every session of every profile on the
 * left, one session in the middle, and what it touches on the right.
 *
 * The sidebar groups sessions by project with their live state and switches
 * the profile. The session is the transcript, the pinned task list under
 * the latest message, whatever the agent waits on (a permission, a
 * question, a plan to approve, a session offer) and the composer with the
 * model, mode and context. A second session opens beside it in split view
 * from a row's menu or the split button, with its own header on the same
 * line. The side pane shows the changes, a file, a terminal, the pull
 * request with its checks, artifacts, tasks or your own extension's pane.
 *
 * The side pane is a sidebar of its own on the right and sits on the page
 * the way the sessions sidebar does: its tab strip shares the session
 * header's line, and the session card keeps an even gutter to whichever
 * sidebar is open, or 8px from the window edge once one folds. Drag its
 * rail to resize it, click the rail or press ] to fold it, as the sessions
 * sidebar does with [; with a split open, its toggle moves to the split's
 * header, beside the pane. On a narrow window the split drops out and both
 * sidebars start folded.
 *
 * @example {@include ./examples.mdx}
 */
export default function Workspace({
  pane = 'changes',
  split = false,
  prompt = 'none',
  wrapUp = false,
  sidebar = true,
}: WorkspaceProps) {
  const [selected, setSelected] = useState('agent-desktop')
  const [leftOpen, setLeftOpen] = useState(sidebar)
  const [paneOpen, setPaneOpen] = useState(pane !== 'none')
  const [openPane, setOpenPane] = useState<PaneId>(pane === 'none' ? 'changes' : pane)
  const [splitId, setSplitId] = useState<string | null>(split ? 'canvas' : null)
  const [pending, setPending] = useState(prompt)
  const [nextStep, setNextStep] = useState(wrapUp)
  const session = findSession(selected)
  const profile = PROFILES.find(p => p.id === session?.profile)
  const Branch = useIcon('git-branch')
  const Columns = useIcon('columns-2')
  const PanelRight = useIcon('panel-right')
  const PanelLeft = useIcon('panel-left')
  const More = useIcon('more-horizontal')

  const paneToggle = (
    <Tooltip content="Side pane" side="bottom">
      <Button
        variant="ghost"
        size="icon-compact"
        aria-label="Side pane"
        aria-pressed={paneOpen}
        active={paneOpen}
        onClick={() => setPaneOpen(!paneOpen)}
      >
        <PanelRight />
      </Button>
    </Tooltip>
  )

  return (
    <div className="@container flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider
        className="h-full min-h-0"
        persist={false}
        mobileBreakpoint={0}
        open={leftOpen}
        onOpenChange={setLeftOpen}
      >
        <SessionSidebar className="h-full" value={selected} onValueChange={setSelected} onOpenSplit={setSplitId} />
        {/* A second provider for the right side: the side pane is a Sidebar too, so it resizes from its rail, collapses and toggles with ] like the sessions sidebar. */}
        <Sidebar.Provider
          className="h-full min-h-0 min-w-0 flex-1"
          persist={false}
          mobileBreakpoint={0}
          width="380px"
          open={paneOpen}
          onOpenChange={setPaneOpen}
        >
          <Sidebar side="right" variant="inset" className="h-full">
            <SidePane
              pane={openPane}
              onPaneChange={setOpenPane}
              onClose={() => setPaneOpen(false)}
              className="h-full"
            />
          </Sidebar>
          {/* The inset's margins come from its peer, the side pane; the sessions sidebar is in the outer provider, so its side is set here: flush while it is open (its rows bring their own gutter), 8px once it folds. */}
          <Sidebar.Inset className={cn('@container min-h-0 min-w-0', leftOpen && '!ml-0')}>
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
                  <Button
                    variant="ghost"
                    size="icon-compact"
                    aria-label="Sessions sidebar"
                    aria-pressed={leftOpen}
                    onClick={() => setLeftOpen(!leftOpen)}
                  >
                    <PanelLeft />
                  </Button>
                  <span className="min-w-0 truncate text-body weight-medium text-foreground">{session?.title}</span>
                  {session?.branch && (
                    <span className="hidden min-w-0 items-center gap-1 text-caption text-muted-foreground @xl:flex">
                      <Branch size={12} strokeWidth={1.5} className="shrink-0" />
                      <span className="truncate font-mono">{session.branch}</span>
                    </span>
                  )}
                  {profile && (
                    <span className="hidden shrink-0 text-caption text-muted-foreground @2xl:inline">
                      {profile.name} · {profile.defaultModel}
                    </span>
                  )}
                  <div className="ml-auto flex shrink-0 items-center gap-0.5">
                    <Tooltip content="Split view" side="bottom">
                      <Button
                        variant="ghost"
                        size="icon-compact"
                        aria-label="Split view"
                        aria-pressed={splitId !== null}
                        active={splitId !== null}
                        className="hidden @3xl:inline-flex"
                        onClick={() => setSplitId(splitId ? null : 'canvas')}
                      >
                        <Columns />
                      </Button>
                    </Tooltip>
                    <Button variant="ghost" size="icon-compact" aria-label="Session options">
                      <More />
                    </Button>
                    {/* With a split open the toggle moves to the split's header: it stays at the window's right edge, beside the pane it opens. */}
                    <span className={cn('inline-flex', splitId && '@3xl:hidden')}>{paneToggle}</span>
                  </div>
                </header>
                <Transcript
                  chapters={DEMO_CHAPTERS}
                  footer={
                    <>
                      <Transcript.TaskList key={pending} items={DEMO_TASKS} defaultOpen={pending === 'none'} />
                      {pending !== 'none' && <Prompt kind={pending} onDone={() => setPending('none')} />}
                      {pending === 'none' && nextStep && (
                        <Transcript.NextStep
                          recap="The five pages and six blocks are in and pass lint and the typecheck. Nothing is committed yet."
                          ask="Commit the agent desktop on its branch?"
                          actions={['Commit', 'Not yet']}
                          onAction={() => setNextStep(false)}
                        />
                      )}
                    </>
                  }
                >
                  <DemoSession />
                </Transcript>
                <div className="mx-auto w-full max-w-3xl px-6 pb-4">
                  <Composer streaming={pending === 'none' && !nextStep} />
                </div>
              </div>
              {splitId && <SplitSession id={splitId} onClose={() => setSplitId(null)} trailing={paneToggle} />}
            </div>
          </Sidebar.Inset>
        </Sidebar.Provider>
      </Sidebar.Provider>
    </div>
  )
}

export type { PromptKind, WorkspaceProps }
