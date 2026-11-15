/*!
 * Local addition: the settings screen's sections — MCP servers, hooks,
 * skills and plugins, memory, worktrees, notifications and extensions — on
 * the AI app's mock data. One row language throughout: plain lists
 * (no frames) pulled back by their rows' padding so text lines up with the
 * section heading; a label with a caption on the left, its state or control
 * on the right. Toggles are a Switch.Group; anything with more to it is an
 * Accordion.Group row that lifts into a card with its config, as the
 * session board's rows do.
 */

'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'
import {
  HOOKS,
  type Hook,
  MCP_SERVERS,
  type McpServer,
  MEMORY,
  type MemoryFile,
  PLUGINS,
  WORKTREES,
  type Worktree,
} from '../../../blocks/AI/mock'
import Accordion from '../../../components/accordion'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Switch from '../../../components/inputs/switch'
import Tooltip from '../../../components/overlays/tooltip'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'

function Section({
  title,
  lead,
  actions,
  children,
}: {
  title: string
  lead: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-[var(--space-5)]">
      <div className="flex items-start gap-[var(--space-3)]">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
          <h1 className="m-0 text-title text-foreground">{title}</h1>
          <p className="m-0 max-w-2xl text-body text-muted-foreground">{lead}</p>
        </div>
        {actions && <div className="flex shrink-0 gap-[var(--space-2)]">{actions}</div>}
      </div>
      <div className="flex flex-col gap-[var(--space-5)]">{children}</div>
    </section>
  )
}

/** A captioned run of rows inside a section. */
function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-[var(--space-1)]">
      <div className="flex items-baseline justify-between gap-[var(--space-2)] text-caption text-muted-foreground">
        <span>{title}</span>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Switch rows, unframed; pulled back by the rows' px-4 so labels line up with the heading. */
function Toggles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="-mx-4">
      <Switch.Group aria-label={label} className="w-full border-0">
        {children}
      </Switch.Group>
    </div>
  )
}

const OpenRows = createContext<string[]>([])

// Literal pairs, so UnoCSS sees them: the slot's width and the trigger's room for it.
const ACTION_SLOTS = {
  // Narrow, a button folds to its icon.
  button: { slot: 'w-8 @md:w-28', room: 'pr-12 @md:pr-32' },
  icon: { slot: 'w-8', room: 'pr-12' },
} as const

type ActionKind = keyof typeof ACTION_SLOTS

const ActionSlot = createContext<ActionKind | undefined>(undefined)

/** Rows that open into a card with their config. `actions` keeps a slot at every row's end, so the chevrons line up. */
function Details({ label, actions, children }: { label: string; actions?: ActionKind; children: ReactNode }) {
  const [open, setOpen] = useState<string[]>([])
  return (
    <OpenRows.Provider value={open}>
      <ActionSlot.Provider value={actions}>
        <div className="-mx-4">
          <Accordion.Group
            type="multiple"
            value={open}
            onValueChange={setOpen}
            highlight="trigger"
            aria-label={label}
            className="w-full max-w-none"
          >
            {children}
          </Accordion.Group>
        </div>
      </ActionSlot.Provider>
    </OpenRows.Provider>
  )
}

/** Visible on hover or focus of its row, always on touch. */
const ON_HOVER =
  'opacity-0 transition-opacity duration-fast group-hover/row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100'

function Row({
  value,
  index,
  label,
  caption,
  meta,
  action,
  children,
}: {
  value: string
  index: number
  label: ReactNode
  caption?: ReactNode
  /** State on the row's right: a badge, a size. */
  meta?: ReactNode
  /** A control beside the trigger, in the list's action slot. */
  action?: ReactNode
  /** The card's body when the row is open. */
  children: ReactNode
}) {
  const open = useContext(OpenRows).includes(value)
  const slot = useContext(ActionSlot)
  const shape = useShape()
  const substrate = useSurface()
  const level = Math.min(substrate + 2, 8)

  return (
    <Accordion.Item
      value={value}
      index={index}
      className={cn(
        // Open, the row lifts into a card; margin and padding cancel out sideways, so the row holds still.
        'group/row transition-[margin,padding,background-color,box-shadow] duration-moderate',
        open && ['-mx-1 my-[var(--space-2)] p-1', SURFACE_BG[level], SURFACE_SHADOW[3], shape.container],
      )}
    >
      <SurfaceProvider value={open ? level : substrate}>
        <div className="relative">
          <Accordion.Trigger
            className={cn(
              'px-4 py-2.5 [&>span:first-child]:min-w-0 [&>span:first-child]:grid-cols-[minmax(0,1fr)]',
              slot && ACTION_SLOTS[slot].room,
            )}
          >
            <span className="flex min-w-0 items-center gap-[var(--space-3)]">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate weight-medium text-foreground">{label}</span>
                {caption && (
                  <span className="truncate text-caption weight-normal text-muted-foreground">{caption}</span>
                )}
              </span>
              {meta && (
                <span className="flex shrink-0 items-center gap-[var(--space-3)] weight-normal text-muted-foreground">
                  {meta}
                </span>
              )}
            </span>
          </Accordion.Trigger>
          {slot && (
            // Beside the trigger, not in it: a press here never toggles the row.
            <div
              className={cn('absolute inset-y-0 right-4 z-20 flex items-center justify-end', ACTION_SLOTS[slot].slot)}
            >
              {action}
            </div>
          )}
        </div>
        <Accordion.Content>
          <div className="flex flex-col gap-[var(--space-3)] px-1 pt-[var(--space-1)]">{children}</div>
        </Accordion.Content>
      </SurfaceProvider>
    </Accordion.Item>
  )
}

/** An open row's config: a caption label on the left, its value on the right. */
function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-baseline gap-x-[var(--space-4)] gap-y-[var(--space-2)] text-body">
      {items.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-caption text-muted-foreground">{term}</dt>
          <dd className="m-0 min-w-0 break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Code inside an open row's card: a sunken well, since in light every surface from the card up is white. */
function CardCode({ language, children }: { language: string; children: string }) {
  return (
    <Code language={language} className="bg-sunken">
      {children}
    </Code>
  )
}

function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-caption">{children}</span>
}

/** The card's last line: where the setting lives, and what you can do to it. */
function Footer({ source, children }: { source: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-2)]">
      <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
        In <span className="font-mono">{source}</span>
      </span>
      <div className="flex shrink-0 gap-[var(--space-1)]">{children}</div>
    </div>
  )
}

const MCP_BADGE: Record<McpServer['status'], { color: 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  connected: { color: 'green', label: 'Connected' },
  'needs-auth': { color: 'amber', label: 'Needs auth' },
  failed: { color: 'red', label: 'Failed' },
  disabled: { color: 'gray', label: 'Disabled' },
}

function mcpCaption(server: McpServer) {
  if (server.status === 'needs-auth') return `Sign in at ${server.authHost} to load its tools`
  if (server.status === 'failed') return server.error?.split('\n')[0]
  if (server.status === 'disabled') return `${server.transport} · ${server.scope}`
  return `${server.transport} · ${server.scope} · ${server.tools} tools`
}

function mcpSource(server: McpServer, configDir: string) {
  if (server.scope === 'project') return '.mcp.json'
  if (server.scope === 'plugin') return `the ${server.name} plugin`
  return `${configDir}/.claude.json`
}

function McpAction({ server }: { server: McpServer }) {
  const Retry = useIcon('refresh-cw')
  const Key = useIcon('key')
  if (server.status !== 'needs-auth' && server.status !== 'failed') return null
  const [Icon, label] = server.status === 'needs-auth' ? [Key, 'Authenticate'] : [Retry, 'Retry']
  const variant = server.status === 'needs-auth' ? 'tertiary' : 'ghost'
  return (
    <>
      <Button size="compact" variant={variant} leadingIcon={Icon} className="hidden @md:inline-flex">
        {label}
      </Button>
      <Tooltip content={label} side="top">
        <Button size="icon-compact" variant={variant} aria-label={`${label} ${server.name}`} className="@md:hidden">
          <Icon />
        </Button>
      </Tooltip>
    </>
  )
}

function McpDetails({ server, configDir }: { server: McpServer; configDir: string }) {
  const facts: [string, ReactNode][] = [
    [server.transport === 'stdio' ? 'Command' : 'URL', <Mono key="t">{server.target}</Mono>],
    ['Env', server.env ? <Mono key="e">{server.env.join(', ')}</Mono> : 'None'],
  ]
  if (server.toolNames) {
    const more = server.tools - server.toolNames.length
    facts.push([
      'Tools',
      <Mono key="tools">
        {server.toolNames.join(', ')}
        {more > 0 && `, +${more} more`}
      </Mono>,
    ])
  }
  return (
    <>
      {server.status === 'needs-auth' && (
        <p className="m-0 text-body text-foreground">
          Authenticate opens {server.authHost} in your browser. The token is kept in this profile's keychain entry, so
          other profiles sign in on their own.
        </p>
      )}
      {server.error && <CardCode language="txt">{server.error}</CardCode>}
      <Facts items={facts} />
      <Footer source={mcpSource(server, configDir)}>
        <Button size="compact" variant="ghost">
          Edit
        </Button>
        <Button size="compact" variant="ghost">
          {server.status === 'disabled' ? 'Enable' : 'Disable'}
        </Button>
      </Footer>
    </>
  )
}

export function McpSection({ configDir }: { configDir: string }) {
  const Plus = useIcon('plus')
  const attention = MCP_SERVERS.filter(s => s.status === 'needs-auth' || s.status === 'failed').length
  return (
    <Section
      title="MCP servers"
      lead="Tools the sessions can call. ai-app is this app's own server: it answers permission prompts and serves your extensions."
      actions={
        <Button size="compact" leadingIcon={Plus}>
          Add server
        </Button>
      }
    >
      <Group
        title="Servers"
        aside={<span className="tabular-nums">{`${MCP_SERVERS.length} · ${attention} need you`}</span>}
      >
        <Details label="MCP servers" actions="button">
          {MCP_SERVERS.map((server, i) => (
            <Row
              key={server.name}
              value={server.name}
              index={i}
              label={server.name}
              caption={mcpCaption(server)}
              meta={
                <Badge size="compact" variant="dot" color={MCP_BADGE[server.status].color}>
                  {MCP_BADGE[server.status].label}
                </Badge>
              }
              action={<McpAction server={server} />}
            >
              <McpDetails server={server} configDir={configDir} />
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

function HookDetails({ hook, configDir }: { hook: Hook; configDir: string }) {
  const Play = useIcon('play')
  const facts: [string, ReactNode][] = [
    ['Event', hook.event],
    ['Matcher', <Mono key="m">{hook.matcher}</Mono>],
    ['Timeout', `${hook.timeout ?? 60} s`],
  ]
  if (hook.lastRun) {
    facts.push([
      'Last run',
      <span key="r" className={cn(hook.lastRun.exit !== 0 && 'text-destructive')}>
        {hook.lastRun.when} · exit {hook.lastRun.exit}
      </span>,
    ])
  }
  return (
    <>
      <CardCode language="bash">{hook.command}</CardCode>
      <Facts items={facts} />
      <Footer source={hook.scope === 'project' ? '.claude/settings.json' : `${configDir}/settings.json`}>
        <Button size="compact" variant="ghost" leadingIcon={Play}>
          Run now
        </Button>
        <Button size="compact" variant="ghost">
          Edit
        </Button>
      </Footer>
    </>
  )
}

export function HooksSection({ configDir }: { configDir: string }) {
  const Plus = useIcon('plus')
  return (
    <Section
      title="Hooks"
      lead="Commands the harness runs on session events, before and after tools. Project hooks come from the repo's .claude/settings.json."
      actions={
        <Button size="compact" leadingIcon={Plus}>
          Add hook
        </Button>
      }
    >
      <Group title="Hooks" aside={<span className="tabular-nums">{HOOKS.length}</span>}>
        <Details label="Hooks">
          {HOOKS.map((hook, i) => (
            <Row
              key={`${hook.event}-${hook.command}`}
              value={`${hook.event}-${hook.command}`}
              index={i}
              label={`${hook.event} · ${hook.matcher}`}
              caption={<span className="font-mono">{hook.command}</span>}
              meta={
                <>
                  {hook.lastRun && hook.lastRun.exit !== 0 && (
                    <Badge size="compact" variant="dot" color="red">
                      Failed
                    </Badge>
                  )}
                  <span className="text-caption">{hook.scope}</span>
                </>
              }
            >
              <HookDetails hook={hook} configDir={configDir} />
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

export function PluginsSection() {
  const Search = useIcon('search')
  const skills = PLUGINS.filter(p => p.kind === 'skill')
  const plugins = PLUGINS.filter(p => p.kind === 'plugin')
  const on = (list: typeof PLUGINS) => `${list.filter(p => p.enabled).length} of ${list.length} on`
  return (
    <Section
      title="Skills and plugins"
      lead="Skills load into a turn when a task calls for them; plugins bundle commands, skills, hooks and panes."
      actions={
        <Button size="compact" variant="tertiary" leadingIcon={Search}>
          Browse catalog
        </Button>
      }
    >
      <Group title="Skills" aside={<span className="tabular-nums">{on(skills)}</span>}>
        <Toggles label="Skills">
          {skills.map(skill => (
            <Switch
              key={skill.name}
              label={skill.name}
              description={skill.description}
              defaultChecked={skill.enabled}
            />
          ))}
        </Toggles>
      </Group>
      <Group title="Plugins" aside={<span className="tabular-nums">{on(plugins)}</span>}>
        <Toggles label="Plugins">
          {plugins.map(plugin => (
            <Switch
              key={plugin.name}
              label={plugin.name}
              description={plugin.description}
              defaultChecked={plugin.enabled}
            />
          ))}
        </Toggles>
      </Group>
    </Section>
  )
}

function memoryFile(memory: MemoryFile) {
  return `---\nname: ${memory.name}\ndescription: ${memory.description}\ntype: ${memory.type}\n---`
}

export function MemorySection({ configDir }: { configDir: string }) {
  const index = MEMORY.map(m => `- [${m.name}](${m.name}.md) — ${m.description}`).join('\n')
  const dir = `${configDir}/memory`
  return (
    <Section
      title="Memory"
      lead="What this profile remembers across sessions, one fact per file. MEMORY.md is the index loaded into every session."
    >
      <Toggles label="Memory">
        <Switch label="Auto memory" description="Let sessions save and update memories as they learn" defaultChecked />
      </Toggles>
      <Group title="Files" aside={<span className="tabular-nums">{MEMORY.length + 1}</span>}>
        <Details label="Memory files">
          <Row
            value="MEMORY.md"
            index={0}
            label="MEMORY.md"
            caption="The index, loaded into every session"
            meta={<span className="text-caption tabular-nums">{MEMORY.length} entries</span>}
          >
            <CardCode language="md">{index}</CardCode>
            <Footer source={dir}>
              <Button size="compact" variant="ghost">
                Edit
              </Button>
            </Footer>
          </Row>
          {MEMORY.map((memory, i) => (
            <Row
              key={memory.name}
              value={memory.name}
              index={i + 1}
              label={`${memory.name}.md`}
              caption={memory.description}
              meta={<span className="text-caption">{memory.type}</span>}
            >
              <CardCode language="md">{memoryFile(memory)}</CardCode>
              <Footer source={dir}>
                <Button size="compact" variant="ghost">
                  Edit
                </Button>
                <Button size="compact" variant="ghost">
                  Forget
                </Button>
              </Footer>
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

const WORKTREE_BADGE: Record<Worktree['state'], { color: 'green' | 'gray' | 'amber'; label: string }> = {
  active: { color: 'green', label: 'Active' },
  merged: { color: 'gray', label: 'Merged' },
  stale: { color: 'amber', label: 'Stale' },
}

const WORKTREE_NOTE: Record<Worktree['state'], string> = {
  active: 'Its session is still running in it.',
  merged: 'Its branch is merged into main; nothing here is lost when it goes.',
  stale: 'No commits for 3 weeks and its session is archived. Uncommitted changes go with it.',
}

export function WorktreesSection() {
  const Trash = useIcon('trash')
  const Terminal = useIcon('terminal')
  const removable = WORKTREES.filter(w => w.state !== 'active')
  return (
    <Section
      title="Worktrees"
      lead="Sessions that work in their own checkout. 4.4 GB on disk; merged and stale ones can go."
      actions={
        <Button size="compact" variant="tertiary" leadingIcon={Trash}>
          Clean up {removable.length}
        </Button>
      }
    >
      <Group title="Checkouts" aside={<span className="tabular-nums">{WORKTREES.length}</span>}>
        <Details label="Worktrees" actions="icon">
          {WORKTREES.map((worktree, i) => (
            <Row
              key={worktree.path}
              value={worktree.path}
              index={i}
              label={worktree.session}
              caption={<span className="font-mono">{worktree.branch}</span>}
              meta={
                <>
                  <Badge size="compact" variant="dot" color={WORKTREE_BADGE[worktree.state].color}>
                    {WORKTREE_BADGE[worktree.state].label}
                  </Badge>
                  <span className="hidden w-14 text-right text-caption tabular-nums @md:inline">{worktree.size}</span>
                </>
              }
              action={
                worktree.state !== 'active' && (
                  <Tooltip content="Remove worktree" side="top">
                    <Button
                      size="icon-compact"
                      variant="ghost"
                      aria-label={`Remove ${worktree.path}`}
                      className={ON_HOVER}
                    >
                      <Trash />
                    </Button>
                  </Tooltip>
                )
              }
            >
              <p className="m-0 text-body text-foreground">{WORKTREE_NOTE[worktree.state]}</p>
              <Facts
                items={[
                  ['Path', <Mono key="p">{worktree.path}</Mono>],
                  ['Branch', <Mono key="b">{worktree.branch}</Mono>],
                  [
                    'On disk',
                    <span key="s" className="tabular-nums">
                      {worktree.size}
                    </span>,
                  ],
                ]}
              />
              <div className="flex justify-end gap-[var(--space-1)]">
                <Button size="compact" variant="ghost" leadingIcon={Terminal}>
                  Open in terminal
                </Button>
                {worktree.state !== 'active' && (
                  <Button size="compact" variant="ghost" leadingIcon={Trash}>
                    Remove
                  </Button>
                )}
              </div>
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

export function NotificationsSection() {
  return (
    <Section title="Notifications" lead="How the app gets your attention while sessions run in the background.">
      <Group title="Notify me when">
        <Toggles label="Notify me when">
          <Switch
            label="A session needs input"
            description="Permissions, questions and plans waiting on you"
            defaultChecked
          />
          <Switch label="A turn finishes" description="When a session wraps up with a next step" defaultChecked />
          <Switch label="CI changes on a watched PR" description="Checks fail, pass or get review comments" />
        </Toggles>
      </Group>
      <Group title="Behavior">
        <Toggles label="Behavior">
          <Switch label="Sound" description="A short chime with each notification" />
          <Switch
            label="Keep the Mac awake"
            description="While any session is running, so long turns finish"
            defaultChecked
          />
        </Toggles>
      </Group>
    </Section>
  )
}

const EXTENSIONS = [
  {
    name: 'Usage pane',
    kind: 'Pane',
    source: 'ai-app MCP server',
    description: 'Limits across every profile, in the side pane',
  },
  {
    name: '/usage-report',
    kind: 'Command',
    source: 'usage plugin',
    description: 'A weekly usage summary as an artifact',
  },
  {
    name: 'Hand off to zcode',
    kind: 'Action',
    source: 'ai-app MCP server',
    description: 'Continue a session under the GLM profile',
  },
  {
    name: 'notify on Stop',
    kind: 'Hook',
    source: '~/.claude/settings.json',
    description: 'Native notification when a turn ends',
  },
]

export function ExtensionsSection() {
  const Plus = useIcon('plus')
  return (
    <Section
      title="Extensions"
      lead="Your own features: panes, commands, actions and hooks, built as MCP servers, plugins, skills and hooks, so they work in the CLI too."
      actions={
        <Button size="compact" leadingIcon={Plus}>
          New extension
        </Button>
      }
    >
      <Group title="Installed" aside={<span className="tabular-nums">{EXTENSIONS.length}</span>}>
        <Toggles label="Extensions">
          {EXTENSIONS.map(extension => (
            <Switch
              key={extension.name}
              label={extension.name}
              description={`${extension.kind} · ${extension.description} · from ${extension.source}`}
              defaultChecked
            />
          ))}
        </Toggles>
      </Group>
    </Section>
  )
}
