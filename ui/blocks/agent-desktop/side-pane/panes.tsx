/*!
 * Local addition: the side pane's panes — changes, file, terminal, pull
 * request, artifacts, background tasks and the extensions slot. They share
 * one section language (PaneSection: a caption-sized title, its meta and
 * icon actions on one row; rows on the control height with their own 8px
 * inset). Each takes its data as props, defaulting to the mock in data.ts.
 */

'use client'

import { type ReactNode, useId, useRef, useState } from 'react'
import Diff, { parsePatch } from '../../../components/AI/diff'
import Accordion from '../../../components/accordion'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Input from '../../../components/inputs/input'
import Switch from '../../../components/inputs/switch'
import Tooltip from '../../../components/overlays/tooltip'
import { type IconComponent, type IconName, useIcon } from '../../../lib/icon-context'
import { useSize } from '../../../lib/size-context'
import { SURFACE_BG } from '../../../lib/surface-classes'
import { useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'
import FluidHover from '../../../primitives/fluid-hover'
import { PROFILES, type Profile } from '../mock'
import { duration, paceOf, percent, VERDICT_TEXT } from '../pace'
import { PaceBar } from '../pace-bar'
import { PickList } from '../pick-list'
import { RunningGlyph } from '../status-glyph'
import {
  type ArtifactKind,
  PANE_ARTIFACTS,
  PANE_CHANGES,
  PANE_FILE,
  PANE_TASKS,
  type PaneArtifact,
  type PaneChange,
  type PaneCheck,
  type PaneTask,
  PULL_REQUEST,
  SHELL,
  type ShellEntry,
} from './data'

/** A titled group: the title, its meta and its icon actions on one row, the rows under it. */
export function PaneSection({
  title,
  meta,
  actions,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <div className="flex h-9 items-center gap-2 px-2 text-caption text-muted-foreground">
        {/* Not a heading: the docs' table of contents collects every h1–h3 on the page. */}
        <span id={id} className="min-w-0 truncate weight-medium text-foreground">
          {title}
        </span>
        {meta && <span className="min-w-0 truncate tabular-nums">{meta}</span>}
        {actions && <div className="-mr-1 ml-auto flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

/** An icon-only ghost button with its label as a tooltip. */
function IconAction({
  icon: Icon,
  label,
  pressed,
  onClick,
}: {
  icon: IconComponent
  label: string
  pressed?: boolean
  onClick?: () => void
}) {
  return (
    <Tooltip content={label} side="bottom">
      <Button
        variant="ghost"
        size="icon-compact"
        aria-label={label}
        aria-pressed={pressed}
        active={pressed}
        onClick={onClick}
      >
        <Icon />
      </Button>
    </Tooltip>
  )
}

/** What a pane shows with nothing in it: a glyph, a line and what to do next. */
function PaneEmpty({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  const Icon = useIcon(icon)
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
      <Icon size={20} strokeWidth={1.5} className="mb-1 text-muted-foreground" />
      <span className="text-body text-foreground">{title}</span>
      <span className="text-caption text-muted-foreground">{detail}</span>
    </div>
  )
}

// ─── Changes ─────────────────────────────────────────────────────────────────

const STATUS_LETTER: Record<PaneChange['status'], string> = { added: 'A', modified: 'M', deleted: 'D' }

function countLines(patch: string) {
  const lines = parsePatch(patch)
  return {
    added: lines.filter(l => l.kind === 'add').length,
    removed: lines.filter(l => l.kind === 'remove').length,
  }
}

function splitPath(path: string) {
  const at = path.lastIndexOf('/')
  return { dir: path.slice(0, at), name: path.slice(at + 1) }
}

function FileRow({ change }: { change: PaneChange }) {
  const size = useSize()
  const { dir, name } = splitPath(change.path)
  const { added, removed } = countLines(change.patch)
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="w-3 shrink-0 font-mono text-caption text-muted-foreground">{STATUS_LETTER[change.status]}</span>
      <span className={cn('min-w-0 flex-1 truncate', size.text)}>
        <span className={cn('text-foreground', change.status === 'deleted' && 'line-through')}>{name}</span>
        <span className="text-caption text-muted-foreground"> {dir}</span>
      </span>
      {/* Gives way to the row's actions while they show. */}
      <span className="flex shrink-0 gap-1.5 font-mono text-caption tabular-nums transition-[opacity] duration-fast group-focus-within/pick:opacity-0 group-hover/pick:opacity-0 pointer-coarse:opacity-0">
        <span className="text-status-success">+{added}</span>
        <span className="text-status-error">−{removed}</span>
      </span>
    </span>
  )
}

function FileList({
  label,
  files,
  value,
  onValueChange,
  actions,
}: {
  label: string
  files: PaneChange[]
  value: string
  onValueChange: (path: string) => void
  actions: (change: PaneChange) => ReactNode
}) {
  const size = useSize()
  return (
    <PickList
      label={label}
      value={value}
      onValueChange={onValueChange}
      rowClassName={cn('items-center py-0', size.control)}
      options={files.map(change => ({
        value: change.path,
        label: change.path,
        content: <FileRow change={change} />,
        actions: actions(change),
      }))}
    />
  )
}

export function ChangesPane({ changes = PANE_CHANGES }: { changes?: PaneChange[] }) {
  const [files, setFiles] = useState(changes)
  const [picked, setPicked] = useState(changes[0]?.path ?? '')
  const [message, setMessage] = useState('')
  const [wrap, setWrap] = useState(true)
  const Plus = useIcon('plus')
  const Minus = useIcon('minus')
  const Revert = useIcon('rotate-ccw')
  const Wrap = useIcon('text-wrap')
  const Open = useIcon('external-link')

  if (files.length === 0)
    return <PaneEmpty icon="circle-check" title="No changes" detail="The working tree matches the last commit." />

  const staged = files.filter(f => f.staged)
  const unstaged = files.filter(f => !f.staged)
  const change = files.find(f => f.path === picked) ?? files[0]

  const setStaged = (paths: string[], value: boolean) =>
    setFiles(fs => fs.map(f => (paths.includes(f.path) ? { ...f, staged: value } : f)))
  const revert = (paths: string[]) => setFiles(fs => fs.filter(f => !paths.includes(f.path)))
  const commit = () => {
    revert(staged.map(f => f.path))
    setMessage('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 pb-1">
        <Input
          variant="bordered"
          aria-label="Commit message"
          placeholder={staged.length > 0 ? 'Message, or Claude writes one' : 'Stage files to commit'}
          value={message}
          onChange={setMessage}
          disabled={staged.length === 0}
          className="min-w-0 flex-1"
        />
        <Button size="compact" disabled={staged.length === 0} onClick={commit}>
          Commit
        </Button>
      </div>

      {staged.length > 0 && (
        <PaneSection
          title="Staged"
          meta={staged.length}
          actions={
            <IconAction
              icon={Minus}
              label="Unstage all"
              onClick={() =>
                setStaged(
                  files.map(f => f.path),
                  false,
                )
              }
            />
          }
        >
          <FileList
            label="Staged files"
            files={staged}
            value={picked}
            onValueChange={setPicked}
            actions={f => <IconAction icon={Minus} label="Unstage" onClick={() => setStaged([f.path], false)} />}
          />
        </PaneSection>
      )}

      {unstaged.length > 0 && (
        <PaneSection
          title="Changes"
          meta={unstaged.length}
          actions={
            <>
              <IconAction icon={Revert} label="Revert all" onClick={() => revert(unstaged.map(f => f.path))} />
              <IconAction
                icon={Plus}
                label="Stage all"
                onClick={() =>
                  setStaged(
                    files.map(f => f.path),
                    true,
                  )
                }
              />
            </>
          }
        >
          <FileList
            label="Unstaged files"
            files={unstaged}
            value={picked}
            onValueChange={setPicked}
            actions={f => (
              <>
                <IconAction icon={Revert} label="Revert" onClick={() => revert([f.path])} />
                <IconAction icon={Plus} label="Stage" onClick={() => setStaged([f.path], true)} />
              </>
            )}
          />
        </PaneSection>
      )}

      {change && (
        <PaneSection
          title={splitPath(change.path).name}
          meta={splitPath(change.path).dir}
          actions={
            <>
              <IconAction
                icon={Wrap}
                label={wrap ? 'Scroll long lines' : 'Wrap long lines'}
                pressed={wrap}
                onClick={() => setWrap(!wrap)}
              />
              <IconAction icon={Open} label="Open in editor" />
            </>
          }
        >
          <Diff wrap={wrap} patch={change.patch} />
        </PaneSection>
      )}
    </div>
  )
}

// ─── File ────────────────────────────────────────────────────────────────────

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split('/')
  const Chevron = useIcon('chevron-right')
  return (
    <span className="flex min-w-0 items-center gap-0.5">
      {parts.map((part, i) => {
        const last = i === parts.length - 1
        return (
          <span key={`${i}-${part}`} className={cn('flex items-center gap-0.5', last ? 'min-w-0' : 'shrink-0')}>
            <span className={cn(last ? 'truncate text-foreground' : 'weight-normal text-muted-foreground')}>
              {part}
            </span>
            {!last && <Chevron size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />}
          </span>
        )
      })}
    </span>
  )
}

export function FilePane({ file = PANE_FILE }: { file?: { path: string; language: string; source: string } }) {
  const Copy = useIcon('copy')
  const Open = useIcon('external-link')
  // The folders give way first: the file name is what tells two tabs apart.
  const crumbs = file.path.split('/').slice(-3).join('/')
  return (
    <PaneSection
      title={<Breadcrumb path={crumbs} />}
      actions={
        <>
          <IconAction icon={Copy} label="Copy path" onClick={() => navigator.clipboard?.writeText(file.path)} />
          <IconAction icon={Open} label="Open in editor" />
        </>
      }
    >
      <p className="m-0 px-2 pb-2 text-caption text-muted-foreground">
        {file.language} · {file.source.split('\n').length} lines · modified in this session
      </p>
      <Code language={file.language}>{file.source}</Code>
    </PaneSection>
  )
}

// ─── Terminal ────────────────────────────────────────────────────────────────

function PromptLine({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="shrink-0 select-none text-muted-foreground">{prompt} $</span>
      {children}
    </div>
  )
}

export function TerminalPane({ shell = SHELL }: { shell?: typeof SHELL }) {
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
        {history.map((entry, i) => (
          <div key={`${i}-${entry.command}`} className="flex flex-col">
            <PromptLine prompt={shell.prompt}>
              <span className="min-w-0 break-all">{entry.command}</span>
            </PromptLine>
            {entry.output.map((line, j) => (
              <span key={`${j}-${line}`} className="whitespace-pre-wrap break-all">
                {line}
              </span>
            ))}
            {entry.exit ? <span className="text-status-error">exit {entry.exit}</span> : null}
          </div>
        ))}
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
            }}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-caption text-foreground caret-foreground outline-none"
          />
        </PromptLine>
      </div>
    </PaneSection>
  )
}

// ─── Pull request ────────────────────────────────────────────────────────────

function CheckGlyph({ status }: { status: PaneCheck['status'] }) {
  const Done = useIcon('circle-check')
  const Failed = useIcon('circle-x')
  if (status === 'running') return <RunningGlyph size={14} />
  if (status === 'success') return <Done size={14} strokeWidth={1.5} className="shrink-0 text-status-success" />
  return <Failed size={14} strokeWidth={1.5} className="shrink-0 text-status-error" />
}

function CheckItem({ check, index }: { check: PaneCheck; index: number }) {
  const Fix = useIcon('wrench')
  const Open = useIcon('external-link')
  return (
    <Accordion.Item value={check.name} index={index}>
      <Accordion.Trigger className="px-2">
        <span className="flex min-w-0 items-center gap-2">
          <CheckGlyph status={check.status} />
          <span className="shrink-0">{check.name}</span>
          <span className="min-w-0 flex-1 truncate text-right text-caption weight-normal text-muted-foreground">
            {check.detail}
          </span>
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-2">
          <Code language="plaintext">{check.log}</Code>
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="compact" trailingIcon={Open}>
              Full log
            </Button>
            {check.status === 'failed' && (
              <Button variant="secondary" size="compact" leadingIcon={Fix}>
                Ask Claude to fix
              </Button>
            )}
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}

export function PullRequestPane({ pr = PULL_REQUEST }: { pr?: typeof PULL_REQUEST }) {
  const Open = useIcon('external-link')
  const Rerun = useIcon('rotate-ccw')
  const Icon = useIcon('git-pull-request')
  const passed = pr.checks.filter(c => c.status === 'success').length
  const failing = pr.checks.filter(c => c.status === 'failed').length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 px-2 pt-2">
        <div className="flex items-start gap-2">
          <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-body weight-medium text-foreground">{pr.title}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 pl-6 text-caption text-muted-foreground">
          <Badge size="compact" color="green" className="shrink-0">
            Open
          </Badge>
          <span className="shrink-0 tabular-nums">#{pr.number}</span>
          <span className="min-w-0 truncate font-mono">
            {pr.branch} → {pr.base}
          </span>
        </div>
      </div>

      <PaneSection
        title="Checks"
        meta={`${passed} of ${pr.checks.length} passed`}
        actions={<IconAction icon={Rerun} label="Re-run failed" />}
      >
        <Accordion.Group
          type="multiple"
          highlight="trigger"
          defaultValue={pr.checks.filter(c => c.status === 'failed').map(c => c.name)}
          className="w-full max-w-none"
        >
          {pr.checks.map((check, i) => (
            <CheckItem key={check.name} check={check} index={i} />
          ))}
        </Accordion.Group>
      </PaneSection>

      <PaneSection title="Reviews" meta={`${pr.reviews.length} comments`}>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 px-2 pb-1">
          {pr.reviews.map(review => (
            <li key={review.where} className="flex min-w-0 flex-col">
              <span className="flex min-w-0 gap-2 text-caption text-muted-foreground">
                <span className="shrink-0 weight-medium text-foreground">{review.author}</span>
                <span className="min-w-0 truncate font-mono">{review.where}</span>
              </span>
              <span className="text-body text-foreground">{review.body}</span>
            </li>
          ))}
        </ul>
      </PaneSection>

      <div>
        <Switch
          trackSide="end"
          label="Auto-fix"
          description="Watch CI, fix failures and answer review comments in this session"
          defaultChecked
        />
      </div>

      <div className="flex items-center gap-2 px-2 pt-2">
        <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
          {failing > 0 ? `${failing} failing check blocks the merge` : 'Ready to merge'}
        </span>
        <Button variant="tertiary" size="compact" trailingIcon={Open}>
          GitHub
        </Button>
        <Button size="compact" disabled={failing > 0}>
          Merge
        </Button>
      </div>
    </div>
  )
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

const ARTIFACT_ICON: Record<ArtifactKind, IconName> = {
  page: 'globe',
  dashboard: 'layout-dashboard',
  document: 'file-text',
  diagram: 'list-tree',
}

const ARTIFACT_KIND: Record<ArtifactKind, string> = {
  page: 'Page',
  dashboard: 'Dashboard',
  document: 'Document',
  diagram: 'Diagram',
}

function ArtifactRow({ artifact, index, onOpen }: { artifact: PaneArtifact; index: number; onOpen?: () => void }) {
  const size = useSize()
  const Icon = useIcon(ARTIFACT_ICON[artifact.kind])
  return (
    <FluidHover.Item index={index} onClick={onOpen} className={cn('gap-2 px-2', size.control, size.text)}>
      <Icon size={size.icon} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{artifact.title}</span>
      <span className="shrink-0 text-caption text-muted-foreground">
        {ARTIFACT_KIND[artifact.kind]} · {artifact.updated}
      </span>
    </FluidHover.Item>
  )
}

export function ArtifactsPane({
  artifacts = PANE_ARTIFACTS,
  onOpen,
}: {
  artifacts?: PaneArtifact[]
  onOpen?: (artifact: PaneArtifact) => void
}) {
  if (artifacts.length === 0)
    return (
      <PaneEmpty
        icon="layers"
        title="No artifacts yet"
        detail="Pages, documents and dashboards Claude makes land here."
      />
    )
  return (
    <PaneSection title="Artifacts" meta={`${artifacts.length} · private until you share them`}>
      <FluidHover className="gap-0">
        {artifacts.map((artifact, i) => (
          <ArtifactRow key={artifact.title} artifact={artifact} index={i} onOpen={() => onOpen?.(artifact)} />
        ))}
      </FluidHover>
    </PaneSection>
  )
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

const TASK_KIND_ICON = { agent: 'bot', shell: 'terminal', session: 'split' } as const

function TaskRow({ task, onStatus }: { task: PaneTask; onStatus: (status: PaneTask['status']) => void }) {
  const Icon = useIcon(TASK_KIND_ICON[task.kind])
  const Failed = useIcon('circle-x')
  const Done = useIcon('circle-check')
  const Stop = useIcon('square')
  const Retry = useIcon('rotate-ccw')
  const running = task.status === 'running'

  return (
    <li className="flex min-h-11 items-center gap-2 px-2 py-1">
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-foreground">{task.title}</span>
        <span
          className={cn(
            'truncate text-caption',
            task.status === 'failed' ? 'text-status-error' : 'text-muted-foreground',
          )}
        >
          {task.status === 'stopped' ? `Stopped · ${task.detail}` : task.detail}
        </span>
      </span>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {running && <RunningGlyph size={14} />}
        {task.status === 'done' && <Done size={14} strokeWidth={1.5} className="text-muted-foreground" />}
        {task.status === 'failed' && <Failed size={14} strokeWidth={1.5} className="text-status-error" />}
      </span>
      {/* One slot for the action, so the glyphs line up whether a row has one or not. */}
      <span className="flex w-7 shrink-0 justify-center">
        {running && <IconAction icon={Stop} label="Stop" onClick={() => onStatus('stopped')} />}
        {(task.status === 'failed' || task.status === 'stopped') && (
          <IconAction icon={Retry} label="Retry" onClick={() => onStatus('running')} />
        )}
      </span>
    </li>
  )
}

export function TasksPane({ tasks = PANE_TASKS }: { tasks?: PaneTask[] }) {
  const [list, setList] = useState(tasks)
  const setStatus = (id: string, status: PaneTask['status']) =>
    setList(l => l.map(t => (t.id === id ? { ...t, status } : t)))
  const running = list.filter(t => t.status === 'running')
  const finished = list.filter(t => t.status !== 'running')

  if (list.length === 0)
    return (
      <PaneEmpty
        icon="list-checks"
        title="No background tasks"
        detail="Subagents, shells and child sessions run here."
      />
    )

  const rows = (items: PaneTask[]) => (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map(task => (
        <TaskRow key={task.id} task={task} onStatus={status => setStatus(task.id, status)} />
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-2">
      {running.length > 0 && (
        <PaneSection title="Running" meta={running.length}>
          {rows(running)}
        </PaneSection>
      )}
      {finished.length > 0 && (
        <PaneSection title="Finished" meta={finished.length}>
          {rows(finished)}
        </PaneSection>
      )}
    </div>
  )
}

// ─── Extensions slot ─────────────────────────────────────────────────────────

const VERDICT_WORD = { free: 'on pace', watch: 'only just', tight: 'too fast' } as const

/** The extensions slot: a pane a user's own MCP server or plugin provides. Here, usage across every profile. */
export function ExtensionPane({ profiles = PROFILES }: { profiles?: Profile[] }) {
  const size = useSize()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 pt-2">
        <span className="min-w-0 flex-1 text-caption text-muted-foreground">
          From your agent-desktop MCP server. The tick is where an even spend would be by now.
        </span>
        <Badge size="compact" color="violet" className="shrink-0">
          Extension
        </Badge>
      </div>
      {profiles.map(paceOf).map(({ profile, limits, binding }) => (
        <PaneSection
          key={profile.id}
          title={profile.name}
          meta={profile.plan}
          actions={
            <span className={cn('pr-1 text-caption', VERDICT_TEXT[binding.verdict])}>
              {VERDICT_WORD[binding.verdict]}
            </span>
          }
        >
          {limits.map(pace => (
            <div key={pace.limit.label} className={cn('flex items-center gap-2 px-2', size.control, size.text)}>
              <span className="min-w-0 flex-1 truncate text-foreground">{pace.limit.label}</span>
              <PaceBar pace={pace} className="w-16 shrink-0" />
              <span className="w-24 shrink-0 whitespace-nowrap text-right text-caption tabular-nums text-muted-foreground">
                {percent(pace.limit.value)} · {duration(pace.window.resetsInHours)}
              </span>
            </div>
          ))}
        </PaneSection>
      ))}
    </div>
  )
}
