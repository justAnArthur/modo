/*!
 * Local addition: the settings screen's sections — MCP servers, hooks,
 * skills and plugins, memory, worktrees, notifications and extensions — on
 * the agent desktop's mock data.
 */

'use client'

import type { ReactNode } from 'react'
import {
  HOOKS,
  MCP_SERVERS,
  type McpServer,
  MEMORY,
  PLUGINS,
  WORKTREES,
  type Worktree,
} from '../../../blocks/agent-desktop/mock'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Switch from '../../../components/inputs/switch'
import Table from '../../../components/table'
import { useIcon } from '../../../lib/icon-context'
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
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="m-0 text-title text-foreground">{title}</h1>
          <p className="m-0 text-body text-muted-foreground">{lead}</p>
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

/** Tables scroll sideways on a narrow window instead of squeezing their columns. */
function Wide({ children }: { children: ReactNode }) {
  return <div className="-mx-2.5 overflow-x-auto [&_table]:min-w-[560px]">{children}</div>
}

const MCP_BADGE: Record<McpServer['status'], { color: 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  connected: { color: 'green', label: 'Connected' },
  'needs-auth': { color: 'amber', label: 'Needs auth' },
  failed: { color: 'red', label: 'Failed' },
  disabled: { color: 'gray', label: 'Disabled' },
}

export function McpSection() {
  const Plus = useIcon('plus')
  return (
    <Section
      title="MCP servers"
      lead="Tools the sessions can call. agent-desktop is this app's own server: it answers permission prompts and serves your extensions."
      actions={
        <Button size="compact" leadingIcon={Plus}>
          Add server
        </Button>
      }
    >
      <Wide>
        <Table size="compact">
          <Table.Header>
            <Table.Row>
              <Table.Head>Server</Table.Head>
              <Table.Head>Transport</Table.Head>
              <Table.Head>Scope</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Tools</Table.Head>
              <Table.Head> </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {MCP_SERVERS.map((server, i) => (
              <Table.Row key={server.name} index={i}>
                <Table.Cell>
                  <span className="font-mono text-caption text-foreground">{server.name}</span>
                </Table.Cell>
                <Table.Cell>{server.transport}</Table.Cell>
                <Table.Cell>{server.scope}</Table.Cell>
                <Table.Cell>
                  <Badge size="compact" variant="dot" color={MCP_BADGE[server.status].color}>
                    {MCP_BADGE[server.status].label}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{server.tools || '—'}</Table.Cell>
                <Table.Cell>
                  {server.status === 'needs-auth' && (
                    <Button size="compact" variant="tertiary">
                      Authenticate
                    </Button>
                  )}
                  {server.status === 'failed' && (
                    <Button size="compact" variant="ghost">
                      Retry
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Wide>
    </Section>
  )
}

export function HooksSection() {
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
      <Wide>
        <Table size="compact">
          <Table.Header>
            <Table.Row>
              <Table.Head>Event</Table.Head>
              <Table.Head>Matcher</Table.Head>
              <Table.Head>Command</Table.Head>
              <Table.Head>Scope</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {HOOKS.map((hook, i) => (
              <Table.Row key={`${hook.event}-${hook.command}`} index={i}>
                <Table.Cell>{hook.event}</Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption">{hook.matcher}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption text-foreground">{hook.command}</span>
                </Table.Cell>
                <Table.Cell>{hook.scope}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Wide>
    </Section>
  )
}

export function PluginsSection() {
  const Search = useIcon('search')
  const skills = PLUGINS.filter(p => p.kind === 'skill')
  const plugins = PLUGINS.filter(p => p.kind === 'plugin')
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
      <div className="flex flex-col gap-1">
        <span className="text-caption text-muted-foreground">Skills</span>
        <Switch.Group aria-label="Skills" className="w-full">
          {skills.map(skill => (
            <Switch
              key={skill.name}
              label={skill.name}
              description={skill.description}
              defaultChecked={skill.enabled}
            />
          ))}
        </Switch.Group>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-muted-foreground">Plugins</span>
        <Switch.Group aria-label="Plugins" className="w-full">
          {plugins.map(plugin => (
            <Switch
              key={plugin.name}
              label={plugin.name}
              description={plugin.description}
              defaultChecked={plugin.enabled}
            />
          ))}
        </Switch.Group>
      </div>
    </Section>
  )
}

const MEMORY_COLOR = { user: 'violet', feedback: 'amber', project: 'teal', reference: 'gray' } as const

export function MemorySection() {
  return (
    <Section
      title="Memory"
      lead="What this profile remembers across sessions, one fact per file. MEMORY.md is the index loaded into every session."
    >
      <Switch.Group aria-label="Memory" className="w-full">
        <Switch label="Auto memory" description="Let sessions save and update memories as they learn" defaultChecked />
      </Switch.Group>
      <Wide>
        <Table size="compact">
          <Table.Header>
            <Table.Row>
              <Table.Head>Memory</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head>Description</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {MEMORY.map((memory, i) => (
              <Table.Row key={memory.name} index={i}>
                <Table.Cell>
                  <span className="font-mono text-caption text-foreground">{memory.name}</span>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="compact" color={MEMORY_COLOR[memory.type]}>
                    {memory.type}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{memory.description}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Wide>
      <Code language="md">{MEMORY.map(m => `- [${m.name}](${m.name}.md) — ${m.description}`).join('\n')}</Code>
    </Section>
  )
}

const WORKTREE_COLOR: Record<Worktree['state'], 'green' | 'gray' | 'amber'> = {
  active: 'green',
  merged: 'gray',
  stale: 'amber',
}

export function WorktreesSection() {
  const Trash = useIcon('trash')
  return (
    <Section
      title="Worktrees"
      lead="Sessions that work in their own checkout. 4.4 GB on disk; merged and stale ones can go."
      actions={
        <Button size="compact" variant="tertiary" leadingIcon={Trash}>
          Clean up 2
        </Button>
      }
    >
      <Wide>
        <Table size="compact">
          <Table.Header>
            <Table.Row>
              <Table.Head>Path</Table.Head>
              <Table.Head>Branch</Table.Head>
              <Table.Head>Session</Table.Head>
              <Table.Head>Size</Table.Head>
              <Table.Head>State</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {WORKTREES.map((worktree, i) => (
              <Table.Row key={worktree.path} index={i}>
                <Table.Cell>
                  <span className="font-mono text-caption text-foreground">{worktree.path}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption">{worktree.branch}</span>
                </Table.Cell>
                <Table.Cell>{worktree.session}</Table.Cell>
                <Table.Cell>
                  <span className="tabular-nums">{worktree.size}</span>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="compact" variant="dot" color={WORKTREE_COLOR[worktree.state]}>
                    {worktree.state}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Wide>
    </Section>
  )
}

export function NotificationsSection() {
  return (
    <Section title="Notifications" lead="How the app gets your attention while sessions run in the background.">
      <Switch.Group aria-label="Notifications" className="w-full">
        <Switch
          label="A session needs input"
          description="Permissions, questions and plans waiting on you"
          defaultChecked
        />
        <Switch label="A turn finishes" description="When a session wraps up with a next step" defaultChecked />
        <Switch label="CI changes on a watched PR" description="Checks fail, pass or get review comments" />
        <Switch label="Sound" />
        <Switch label="Keep the Mac awake while sessions run" defaultChecked />
      </Switch.Group>
    </Section>
  )
}

const EXTENSIONS = [
  {
    name: 'Usage pane',
    kind: 'Pane',
    source: 'agent-desktop MCP server',
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
    source: 'agent-desktop MCP server',
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
      <Switch.Group aria-label="Extensions" className="w-full">
        {EXTENSIONS.map(extension => (
          <Switch
            key={extension.name}
            label={extension.name}
            description={`${extension.kind} · ${extension.description} · from ${extension.source}`}
            defaultChecked
          />
        ))}
      </Switch.Group>
    </Section>
  )
}
