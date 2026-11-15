/*!
 * Local addition: the side pane's panes — changes, file, terminal, pull
 * request, artifacts, background tasks and the extensions slot. Each takes
 * its data as props, defaulting to the agent desktop's mock data.
 */

'use client'

import { useState } from 'react'
import Diff from '../../../components/AI/diff'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Card from '../../../components/card'
import Input from '../../../components/inputs/input'
import Switch from '../../../components/inputs/switch'
import Meter from '../../../components/meter'
import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'
import { SizeProvider } from '../../../primitives/sizes'
import {
  ARTIFACTS,
  type Artifact,
  type BackgroundTask,
  CHANGES,
  type Change,
  type Check,
  PR,
  PROFILES,
  TASKS,
  TERMINAL_LINES,
} from '../mock'
import { PickList } from '../pick-list'
import { RunningGlyph } from '../status-glyph'

const STATUS_LETTER: Record<Change['status'], string> = { added: 'A', modified: 'M', deleted: 'D' }

function PaneHeader({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-2">
      <span className="text-subtitle weight-semibold text-foreground">{title}</span>
      {detail && <span className="text-caption text-muted-foreground">{detail}</span>}
      <div className="ml-auto flex items-center gap-1">{children}</div>
    </div>
  )
}

export function ChangesPane({ changes = CHANGES }: { changes?: Change[] }) {
  const [path, setPath] = useState(changes[0]?.path ?? '')
  const change = changes.find(c => c.path === path)
  const added = changes.reduce((n, c) => n + c.added, 0)
  const removed = changes.reduce((n, c) => n + c.removed, 0)
  return (
    <div className="flex flex-col gap-3">
      <PaneHeader title="Changes" detail={`${changes.length} files · +${added} −${removed}`}>
        <Button variant="ghost" size="compact">
          Discard
        </Button>
        <Button size="compact">Commit</Button>
      </PaneHeader>
      <SizeProvider size="compact">
        <PickList
          label="Changed files"
          className="-mx-2"
          value={path}
          onValueChange={setPath}
          rowClassName="py-1"
          options={changes.map(c => ({
            value: c.path,
            label: c.path,
            content: (
              <span className="flex min-w-0 flex-1 items-center gap-2 text-caption">
                <span className="w-3 shrink-0 font-mono text-muted-foreground">{STATUS_LETTER[c.status]}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-foreground">{c.path}</span>
                <span className="shrink-0 font-mono tabular-nums text-status-success">+{c.added}</span>
                <span className="shrink-0 font-mono tabular-nums text-status-error">−{c.removed}</span>
              </span>
            ),
          }))}
        />
      </SizeProvider>
      {change && <Diff path={change.path} patch={change.patch} />}
    </div>
  )
}

export function FilePane() {
  const Folder = useIcon('folder')
  return (
    <div className="flex flex-col gap-3">
      <PaneHeader title="meter/index.tsx" detail="ui/components">
        <Button variant="ghost" size="compact" leadingIcon={Folder}>
          Reveal
        </Button>
      </PaneHeader>
      <Code language="tsx">{`const BAR_FILL: Record<MeterTone, string> = {
  default: 'bg-muted-foreground',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
}

function toneOf(share: number, warnAt: number, errorAt: number): MeterTone {
  if (share >= errorAt) return 'error'
  if (share >= warnAt) return 'warning'
  return 'default'
}`}</Code>
    </div>
  )
}

export function TerminalPane({ lines = TERMINAL_LINES }: { lines?: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <PaneHeader title="Terminal" detail="zsh · ~/Projects/justanarthur/modo" />
      <Code language="plaintext">{lines.join('\n')}</Code>
      <Input placeholder="Run a command in the session's folder" />
    </div>
  )
}

function CheckRow({ check }: { check: Check }) {
  const Done = useIcon('circle-check')
  const Failed = useIcon('circle-x')
  return (
    <li className="flex min-h-8 items-center gap-2 text-body">
      <span className="flex size-4 shrink-0 items-center justify-center">
        {check.status === 'running' ? (
          <RunningGlyph size={14} />
        ) : check.status === 'success' ? (
          <Done size={14} strokeWidth={1.5} className="text-status-success" />
        ) : (
          <Failed size={14} strokeWidth={1.5} className="text-status-error" />
        )}
      </span>
      <span className="shrink-0 text-foreground">{check.name}</span>
      <span className="min-w-0 truncate text-caption text-muted-foreground">{check.detail}</span>
    </li>
  )
}

export function PullRequestPane() {
  const External = useIcon('external-link')
  const Branch = useIcon('git-pull-request')
  const failing = PR.checks.some(c => c.status === 'failed')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Branch size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-subtitle weight-semibold text-foreground">{PR.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          <Badge size="compact" color="green">
            Open
          </Badge>
          <span>#{PR.number}</span>
          <span className="font-mono">
            {PR.branch} → {PR.base}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-muted-foreground">Checks</span>
        <ul className="m-0 flex list-none flex-col p-0">
          {PR.checks.map(check => (
            <CheckRow key={check.name} check={check} />
          ))}
        </ul>
      </div>
      <Switch
        trackSide="end"
        label="Auto-fix"
        description="Watch CI, fix failures and answer review comments in this session"
        defaultChecked
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-foreground">{PR.comments} review comments</span>
        <div className="ml-auto flex gap-2">
          <Button variant="tertiary" size="compact" trailingIcon={External}>
            GitHub
          </Button>
          <Button size="compact" disabled={failing}>
            Merge
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ArtifactsPane({ artifacts = ARTIFACTS }: { artifacts?: Artifact[] }) {
  return (
    <div className="flex flex-col gap-3">
      <PaneHeader title="Artifacts" detail="Private until you share them" />
      <Card.Group className="-mx-3">
        {artifacts.map((artifact, i) => (
          <Card key={artifact.title} index={i} onClick={() => {}} size="compact">
            <Card.Header>
              <Card.Title>{artifact.title}</Card.Title>
              <Card.Description>
                {artifact.kind} · {artifact.updated}
              </Card.Description>
            </Card.Header>
          </Card>
        ))}
      </Card.Group>
    </div>
  )
}

const TASK_KIND_ICON = { agent: 'bot', shell: 'terminal', session: 'split' } as const

function TaskRow({ task }: { task: BackgroundTask }) {
  const Icon = useIcon(TASK_KIND_ICON[task.kind])
  const Failed = useIcon('circle-x')
  const Done = useIcon('check')
  return (
    <li className="flex min-h-11 items-center gap-2 border-b border-border last:border-b-0">
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-foreground">{task.title}</span>
        <span className="truncate text-caption text-muted-foreground">{task.detail}</span>
      </span>
      {task.status === 'running' && (
        <>
          <RunningGlyph size={14} />
          <Button variant="ghost" size="compact">
            Stop
          </Button>
        </>
      )}
      {task.status === 'done' && <Done size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />}
      {task.status === 'failed' && <Failed size={14} strokeWidth={1.5} className="shrink-0 text-status-error" />}
    </li>
  )
}

export function TasksPane({ tasks = TASKS }: { tasks?: BackgroundTask[] }) {
  return (
    <div className="flex flex-col gap-2">
      <PaneHeader title="Tasks" detail={`${tasks.filter(t => t.status === 'running').length} running`} />
      <ul className="m-0 flex list-none flex-col p-0">
        {tasks.map(task => (
          <TaskRow key={task.title} task={task} />
        ))}
      </ul>
    </div>
  )
}

/** The extensions slot: a pane a user's own MCP server or plugin provides. Here, usage across every profile. */
export function ExtensionPane({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <PaneHeader title="Usage" detail="From your agent-desktop MCP server">
        <Badge size="compact" color="violet">
          Extension
        </Badge>
      </PaneHeader>
      <SizeProvider size="compact">
        <div className="flex flex-col gap-4">
          {PROFILES.map(profile => (
            <div key={profile.id} className="flex flex-col gap-1.5">
              <span className="text-caption weight-medium text-foreground">{profile.name}</span>
              {profile.limits.map(limit => (
                <Meter key={limit.label} label={limit.label} value={limit.value} detail={limit.detail} />
              ))}
            </div>
          ))}
        </div>
      </SizeProvider>
    </div>
  )
}
