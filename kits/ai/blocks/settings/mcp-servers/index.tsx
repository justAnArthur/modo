/*!
 * Local addition: the settings screen's MCP servers section — each server's
 * state with its fix at the row's end, opening into its command or URL, env
 * and tools.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import type { ReactNode } from 'react'
import { useIcon } from '../../../lib/icons'
import { CardCode, Details, Facts, Footer, Group, Mono, Row, Section } from '../../../lib/settings-parts'
import type { McpServer } from '../../../lib/types'

const BADGE: Record<McpServer['status'], { color: 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  connected: { color: 'green', label: 'Connected' },
  'needs-auth': { color: 'amber', label: 'Needs auth' },
  failed: { color: 'red', label: 'Failed' },
  disabled: { color: 'gray', label: 'Disabled' },
}

function caption(server: McpServer) {
  if (server.status === 'needs-auth') return `Sign in at ${server.authHost} to load its tools`
  if (server.status === 'failed') return server.error?.split('\n')[0]
  if (server.status === 'disabled') return `${server.transport} · ${server.scope}`
  return `${server.transport} · ${server.scope} · ${server.tools} tools`
}

function source(server: McpServer, configDir: string) {
  if (server.scope === 'project') return '.mcp.json'
  if (server.scope === 'plugin') return `the ${server.name} plugin`
  return `${configDir}/.claude.json`
}

function Fix({ server, onFix }: { server: McpServer; onFix?: () => void }) {
  const Retry = useIcon('refresh-cw')
  const Key = useIcon('key')
  if (server.status !== 'needs-auth' && server.status !== 'failed') return null
  const [Icon, label] = server.status === 'needs-auth' ? [Key, 'Authenticate'] : [Retry, 'Retry']
  const variant = server.status === 'needs-auth' ? 'tertiary' : 'ghost'
  return (
    <>
      <Button size="compact" variant={variant} leadingIcon={Icon} className="hidden @md:inline-flex" onClick={onFix}>
        {label}
      </Button>
      <Tooltip content={label} side="top">
        <Button
          size="icon-compact"
          variant={variant}
          aria-label={`${label} ${server.name}`}
          className="@md:hidden"
          onClick={onFix}
        >
          <Icon />
        </Button>
      </Tooltip>
    </>
  )
}

function ServerCard({
  server,
  configDir,
  onEdit,
  onToggle,
}: {
  server: McpServer
  configDir: string
  onEdit?: () => void
  onToggle?: () => void
}) {
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
      <Footer source={source(server, configDir)}>
        <Button size="compact" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button size="compact" variant="ghost" onClick={onToggle}>
          {server.status === 'disabled' ? 'Enable' : 'Disable'}
        </Button>
      </Footer>
    </>
  )
}

interface McpServersProps {
  /** The servers the scope's config lists. */
  servers: McpServer[]
  /** The config dir being edited: where user-scoped servers live. */
  configDir: string
  /** Server names whose rows start open. Defaults to `[]`. */
  defaultOpen?: string[]
  /** Called when "Add server" is pressed. */
  onAdd?: () => void
  /** Called with a needs-auth server when its Authenticate is pressed. */
  onAuthenticate?: (server: McpServer) => void
  /** Called with a failed server when its Retry is pressed. */
  onRetry?: (server: McpServer) => void
  /** Called when an open server's Edit is pressed. */
  onEdit?: (server: McpServer) => void
  /** Called when an open server's Enable or Disable is pressed. */
  onToggle?: (server: McpServer) => void
}

/**
 * The tools the sessions can call: every MCP server in the config dir being
 * edited, with what it needs from you.
 *
 * A row names the server, its transport, scope and tool count, and its state
 * as a badge. A server that needs auth says where it signs in and one that
 * failed shows its error's first line; both keep their fix (Authenticate,
 * Retry) at the row's end, folded to an icon in a narrow window. Press a row
 * and it lifts into a card with the command or URL, the env var names, the
 * tools, and which file the server comes from.
 *
 * @example {@include ./examples.mdx}
 */
export default function McpServers({
  servers,
  configDir,
  defaultOpen,
  onAdd,
  onAuthenticate,
  onRetry,
  onEdit,
  onToggle,
}: McpServersProps) {
  const Plus = useIcon('plus')
  const attention = servers.filter(s => s.status === 'needs-auth' || s.status === 'failed').length
  return (
    <Section
      title="MCP servers"
      lead="Tools the sessions can call. ai-app is this app's own server: it answers permission prompts and serves your extensions."
      actions={
        <Button size="compact" leadingIcon={Plus} onClick={onAdd}>
          Add server
        </Button>
      }
    >
      <Group
        title="Servers"
        aside={<span className="tabular-nums">{`${servers.length} · ${attention} need you`}</span>}
      >
        <Details label="MCP servers" actions="button" defaultOpen={defaultOpen}>
          {servers.map((server, i) => (
            <Row
              key={server.name}
              value={server.name}
              index={i}
              label={server.name}
              caption={caption(server)}
              meta={
                <Badge size="compact" variant="dot" color={BADGE[server.status].color}>
                  {BADGE[server.status].label}
                </Badge>
              }
              action={
                <Fix
                  server={server}
                  onFix={() => (server.status === 'needs-auth' ? onAuthenticate : onRetry)?.(server)}
                />
              }
            >
              <ServerCard
                server={server}
                configDir={configDir}
                onEdit={() => onEdit?.(server)}
                onToggle={() => onToggle?.(server)}
              />
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

export type { McpServersProps }

export { McpServers }
