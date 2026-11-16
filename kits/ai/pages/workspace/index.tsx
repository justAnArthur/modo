/*!
 * Local addition: the AI app's main window on DesktopShell — the sessions sidebar, the
 * session (transcript, pinned task list, any pending prompt, composer), an
 * optional second session in split view, and the side pane. Built only from
 * the kit's blocks and modo-ui's components, on mock data.
 */

'use client'

import DesktopShell from '@justanarthur/modo-ui/blocks/desktop-shell'
import Button from '@justanarthur/modo-ui/components/actions/button'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import Diff from '@justanarthur/modo-ui/components/data-display/diff'
import EditableText from '@justanarthur/modo-ui/components/inputs/editable-text'
import {
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  MenuItem,
} from '@justanarthur/modo-ui/components/overlays/dropdown'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import Resizable from '@justanarthur/modo-ui/primitives/layout/resizable'
import { Fragment, useState } from 'react'
import AgentPrompt from '../../blocks/conversation/agent-prompt'
import Composer from '../../blocks/conversation/composer'
import FailureState, { type FailureKind } from '../../blocks/conversation/failure-states'
import Transcript from '../../blocks/conversation/transcript'
import TranscriptSearch from '../../blocks/conversation/transcript-search'
import CommandPalette from '../../blocks/dialogs/command-palette'
import ShortcutsSheet from '../../blocks/dialogs/shortcuts-sheet'
import SidePane from '../../blocks/panes/side-pane'
import SessionSidebar from '../../blocks/sessions/session-sidebar'
import { useIcon } from '../../lib/icons'
import type { PaletteItem, PaneId, Session } from '../../lib/types'
import { DemoReply } from '../../mock/demo-reply'
import { DEMO_CHAPTERS, DEMO_TASKS, DemoReading, DemoSession } from '../../mock/demo-session'
import { ARCHIVED, COMMANDS, COMPOSER, GROUPS, PINNED, PROFILES, PROJECTS, SESSIONS } from '../../mock/mock'
import { CRASH_STDERR, INBOX, SHORTCUTS, TRANSCRIPTS } from '../../mock/mock-extras'
import { SIDE_PANE_DATA } from '../../mock/mock-panes'
import { SETTINGS_SECTIONS } from '../../mock/mock-settings'

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
              '◜ Design the AI app      now\n• Canvas page and pages tier    3m\n○ TSDoc parser drops @values   1h',
          },
          {
            label: 'Badge',
            description: 'Trailing chip',
            preview:
              '  Design the AI app  Running\n  Canvas page and pages tier   Waiting\n  TSDoc parser drops @values',
          },
        ]}
      />
    )
  if (kind === 'plan')
    return (
      <AgentPrompt.Plan onDecide={onDone}>
        <h3 className="m-0">AI app screens</h3>
        <ol className="m-0">
          <li>
            Add <code>Meter</code> and <code>Diff</code> to the components.
          </li>
          <li>
            Build six blocks under <code>blocks/AI</code>.
          </li>
          <li>
            Assemble five pages under <code>pages/AI</code>.
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

function SplitSession({ id, onClose }: { id: string; onClose: () => void }) {
  const session = findSession(id)
  const Close = useIcon('x')
  return (
    <section aria-label={`Split: ${session?.title}`} className="flex h-full min-w-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-1.5">
        <span className="min-w-0 truncate text-body weight-medium text-foreground">{session?.title}</span>
        <Badge size="compact" color="gray" className="shrink-0">
          {session?.profile}
        </Badge>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon-compact" aria-label="Close split" onClick={onClose}>
            <Close />
          </Button>
        </div>
      </div>
      <Transcript>
        <DemoReading />
      </Transcript>
      <div className="px-6 pb-4">
        <Composer {...COMPOSER} />
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
  /** A failure shown as a banner over the transcript, or `'none'`. Defaults to `'none'`. */
  failure?: FailureKind | 'none'
}

/**
 * The AI app's main window: every session of every profile on the
 * left, one session in the middle, and what it touches on the right.
 *
 * The window is a DesktopShell with no title bar: the main card's header
 * shows the session's title and profile, the split button, a menu that
 * searches transcripts or shows the shortcuts, and the side pane toggle.
 * The sidebar holds the inbox, and its search field opens the ⌘K palette
 * (see CommandPalette: switch sessions, start one, run a command, open a
 * pane or a setting). The sidebar groups sessions by project with their
 * live state and switches the profile. The session is the transcript, the
 * pinned task list under the latest message, whatever the agent waits on (a
 * permission, a question, a plan to approve, a session offer) and the
 * composer with the model, mode and context. A second session opens beside
 * it in split view from a row's menu or the split button, with its own
 * header. The side pane shows the changes, a file, a terminal, the pull
 * request with its checks, artifacts, tasks or your own extension's pane.
 *
 * The side pane is a sidebar of its own on the right: drag its rail to
 * resize it, click the rail or press ] to fold it, as the sessions sidebar
 * does with [. On a narrow window the pane takes the session's place, the
 * split drops out and both sidebars start folded.
 *
 * @example {@include ./examples.mdx}
 */
export default function Workspace({
  pane = 'changes',
  split = false,
  prompt = 'none',
  wrapUp = false,
  sidebar = true,
  failure = 'none',
}: WorkspaceProps) {
  const [selected, setSelected] = useState('ai-app')
  const [leftOpen, setLeftOpen] = useState(sidebar)
  const [paneOpen, setPaneOpen] = useState(pane !== 'none')
  const [openPane, setOpenPane] = useState<PaneId>(pane === 'none' ? 'changes' : pane)
  const [splitId, setSplitId] = useState<string | null>(split ? 'canvas' : null)
  const [pending, setPending] = useState(prompt)
  const [nextStep, setNextStep] = useState(wrapUp)
  const [failed, setFailed] = useState(failure)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const session = findSession(selected)
  const profile = PROFILES.find(p => p.id === session?.profile)
  const Keyboard = useIcon('command')
  const Columns = useIcon('columns-2')
  const Search = useIcon('search')
  const More = useIcon('more-horizontal')

  const onPick = (item: PaletteItem) => {
    if (item.kind === 'session') setSelected(item.id)
    if (item.kind === 'search') setSearchOpen(true)
    if (item.kind === 'shortcuts') setShortcutsOpen(true)
    if (item.kind === 'pane') {
      setOpenPane(item.pane)
      setPaneOpen(true)
    }
  }

  const sessionColumn = (
    <div className="flex min-w-0 flex-1 flex-col">
      {failed !== 'none' && (
        <div className="mx-auto w-full max-w-3xl px-6 pt-3">
          <FailureState
            kind={failed}
            profile={profile}
            stderr={CRASH_STDERR}
            exitCode={1}
            attempt={2}
            maxAttempts={5}
            retryIn="4s"
            resetsIn="2h 10m"
            alternatives={PROFILES.filter(p => p.id !== profile?.id)}
            onRestart={() => setFailed('none')}
            onRetry={() => setFailed('none')}
            onLogin={() => setFailed('none')}
            onSwitchProfile={() => setFailed('none')}
            onDismiss={() => setFailed('none')}
          />
        </div>
      )}
      <Transcript
        chapters={DEMO_CHAPTERS}
        footer={
          <>
            <Transcript.TaskList key={pending} items={DEMO_TASKS} defaultOpen={pending === 'none'} />
            {pending !== 'none' && <Prompt kind={pending} onDone={() => setPending('none')} />}
            {pending === 'none' && nextStep && (
              <Transcript.NextStep
                recap="The five pages and six blocks are in and pass lint and the typecheck. Nothing is committed yet."
                ask="Commit the AI app on its branch?"
                actions={['Commit', 'Not yet']}
                onAction={() => setNextStep(false)}
              />
            )}
          </>
        }
      >
        <DemoSession />
        {sent.map((text, i) => (
          <Fragment key={i}>
            <Transcript.User>{text}</Transcript.User>
            <DemoReply />
          </Fragment>
        ))}
      </Transcript>
      <div className="mx-auto w-full max-w-3xl px-6 pb-4">
        <Composer
          {...COMPOSER}
          branch={session?.branch}
          status={pending === 'none' && !nextStep ? 'streaming' : 'idle'}
          onSend={text => setSent([...sent, text])}
        />
      </div>
    </div>
  )

  return (
    <DesktopShell
      showControls
      titleBar="card"
      className="min-h-[640px]"
      leftLabel="Sessions sidebar"
      leftOpen={leftOpen}
      onLeftOpenChange={setLeftOpen}
      rightOpen={paneOpen}
      onRightOpenChange={setPaneOpen}
      title={
        <>
          <EditableText
            label="Session title"
            value={titles[selected] ?? session?.title}
            onValueChange={title => setTitles({ ...titles, [selected]: title })}
            className="min-w-24 weight-medium"
          />
          {profile && (
            <span className="hidden shrink-0 text-caption text-muted-foreground @2xl:inline">
              {profile.name} · {profile.defaultModel}
            </span>
          )}
        </>
      }
      trailing={
        <>
          <TranscriptSearch
            sessions={TRANSCRIPTS}
            projects={PROJECTS}
            profiles={PROFILES}
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onOpen={id => {
              setSelected(id)
              setSearchOpen(false)
            }}
          />
          <ShortcutsSheet groups={SHORTCUTS} open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
          <CommandPalette
            sessions={ALL_SESSIONS}
            projects={PROJECTS}
            profiles={PROFILES}
            commands={COMMANDS}
            settings={SETTINGS_SECTIONS}
            profile={session?.profile}
            onSelect={onPick}
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            trigger={null}
          />
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
          <DropdownMenu>
            <DropdownTrigger
              render={
                <Button variant="ghost" size="icon-compact" aria-label="Session options">
                  <More />
                </Button>
              }
            />
            <DropdownContent align="end" sideOffset={4} className="w-[240px] min-w-0">
              <MenuItem index={0} icon={Search} label="Search transcripts" onSelect={() => setSearchOpen(true)} />
              <MenuItem index={1} icon={Keyboard} label="Keyboard shortcuts" onSelect={() => setShortcutsOpen(true)} />
            </DropdownContent>
          </DropdownMenu>
        </>
      }
      left={
        <SessionSidebar
          {...SESSIONS}
          value={selected}
          onValueChange={setSelected}
          onOpenSplit={setSplitId}
          inbox={INBOX}
          onSearch={() => setPaletteOpen(true)}
        />
      }
      right={
        <SidePane
          data={SIDE_PANE_DATA}
          pane={openPane}
          onPaneChange={setOpenPane}
          onClose={() => setPaneOpen(false)}
          className="min-h-0 flex-1"
        />
      }
      main={
        splitId ? (
          <Resizable className="min-h-0 flex-1">
            <Resizable.Panel defaultSize={55} minSize={30}>
              {sessionColumn}
            </Resizable.Panel>
            <Resizable.Handle label="Resize the split" />
            <Resizable.Panel minSize={25}>
              <SplitSession id={splitId} onClose={() => setSplitId(null)} />
            </Resizable.Panel>
          </Resizable>
        ) : (
          <div className="flex min-h-0 flex-1">{sessionColumn}</div>
        )
      }
    />
  )
}

export type { PromptKind, WorkspaceProps }
