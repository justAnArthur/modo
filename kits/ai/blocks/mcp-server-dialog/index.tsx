/*!
 * Local addition: the AI app's "Add MCP server" form. A Dialog over the
 * transport (stdio, http, sse), its command and env or its URL and headers,
 * the scope and profiles it applies to, and a connection test whose state
 * comes in through `test`.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Checkbox from '@justanarthur/modo-ui/components/inputs/checkbox'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import KeyValue, { type KeyValuePair } from '@justanarthur/modo-ui/components/inputs/key-value'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
import { Spinner } from '@justanarthur/modo-ui/components/progress'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Code from '@justanarthur/modo-ui/primitives/code'
import { type ReactElement, type ReactNode, useState } from 'react'
import { type ConfigScope, Field, Fieldset, SCOPE_NOTE, SCOPES, Segmented } from '../../lib/config-parts'
import { useIcon } from '../../lib/icons'
import type { Profile } from '../../lib/types'

export type McpTransport = 'stdio' | 'http' | 'sse'

/** An MCP server as the form writes it. */
export interface McpServerConfig {
  name: string
  transport: McpTransport
  /** The executable a stdio server runs. */
  command: string
  /** Its arguments, one word each. */
  args: string[]
  /** Env vars passed to a stdio server. */
  env: KeyValuePair[]
  /** Where an http or sse server answers. */
  url: string
  /** Headers sent to an http or sse server. */
  headers: KeyValuePair[]
  scope: ConfigScope
  /** Ids of the profiles whose sessions load it. */
  profiles: string[]
}

/** Where the connection test stands; the app runs it and reports back. */
export interface McpConnectionTest {
  state: 'idle' | 'testing' | 'ok' | 'failed'
  /** The tools the server listed, once it answered. */
  tools?: string[]
  /** Why it failed: the tail of its stderr or the HTTP error. */
  error?: string
}

const TRANSPORTS: { value: McpTransport; label: string }[] = [
  { value: 'stdio', label: 'stdio' },
  { value: 'http', label: 'HTTP' },
  { value: 'sse', label: 'SSE' },
]

const EMPTY: McpServerConfig = {
  name: '',
  transport: 'stdio',
  command: '',
  args: [],
  env: [],
  url: '',
  headers: [],
  scope: 'user',
  profiles: [],
}

const IDLE: McpConnectionTest = { state: 'idle' }

function errors(server: McpServerConfig, taken: string[]) {
  return {
    name: taken.includes(server.name) ? 'A server with this name exists.' : undefined,
    url:
      server.transport !== 'stdio' && server.url && !/^https?:\/\/\S+$/.test(server.url)
        ? 'Starts with http:// or https://.'
        : undefined,
  }
}

function complete(server: McpServerConfig) {
  if (!server.name) return false
  return server.transport === 'stdio' ? Boolean(server.command) : Boolean(server.url)
}

function TestResult({ test }: { test: McpConnectionTest }) {
  const CircleCheck = useIcon('circle-check')
  const CircleX = useIcon('circle-x')

  const head: Record<McpConnectionTest['state'], { icon: ReactNode; title: string }> = {
    idle: { icon: null, title: 'Not tested yet' },
    testing: { icon: <Spinner className="size-4" />, title: 'Connecting…' },
    ok: {
      icon: <CircleCheck size={16} strokeWidth={1.5} className="text-status-success" />,
      title: `Connected · ${test.tools?.length ?? 0} tools`,
    },
    failed: {
      icon: <CircleX size={16} strokeWidth={1.5} className="text-status-error" />,
      title: 'Could not connect',
    },
  }
  const { icon, title } = head[test.state]

  return (
    <div aria-live="polite" className="flex min-w-0 flex-col gap-[var(--space-2)]">
      <span
        className={cn(
          'flex items-center gap-[var(--space-2)] text-body',
          test.state === 'idle' ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {icon}
        {title}
      </span>
      {test.state === 'ok' && test.tools && test.tools.length > 0 && (
        <span className="font-mono text-caption text-muted-foreground">{test.tools.join(', ')}</span>
      )}
      {test.state === 'failed' && test.error && <Code language="txt">{test.error}</Code>}
    </div>
  )
}

interface McpServerDialogPanelProps {
  /** What the form starts with; a server with a name is being edited. Defaults to an empty stdio server. */
  defaultServer?: Partial<McpServerConfig>
  /** The profiles it can apply to. Defaults to `[]`. */
  profiles?: Profile[]
  /** Server names already taken, so a clash is caught before saving. Defaults to `[]`. */
  taken?: string[]
  /** Where the connection test stands. Defaults to idle. */
  test?: McpConnectionTest
  /** Called with what the form holds when "Test connection" is pressed: run the test here. */
  onTest?: (server: McpServerConfig) => void
  /** Called with the server when Save is pressed. */
  onSave?: (server: McpServerConfig) => void
  /** Called with the server when Delete is pressed; leave it out and no Delete shows. */
  onDelete?: (server: McpServerConfig) => void
  /** Called when Cancel is pressed; leave it out and no Cancel shows. */
  onCancel?: () => void
  /** Classes for the root. */
  className?: string
}

/** The form without the Dialog: for a settings page, or the docs. */
function McpServerDialogPanel({
  defaultServer,
  profiles = [],
  taken = [],
  test = IDLE,
  onTest,
  onSave,
  onDelete,
  onCancel,
  className,
}: McpServerDialogPanelProps) {
  const [server, setServer] = useState<McpServerConfig>({ ...EMPTY, ...defaultServer })
  const [args, setArgs] = useState(server.args.join(' '))
  const Plug = useIcon('plug')
  const Trash = useIcon('trash')
  const editing = Boolean(defaultServer?.name)
  const set = (patch: Partial<McpServerConfig>) => setServer({ ...server, ...patch })
  const issues = errors(server, editing ? taken.filter(n => n !== defaultServer?.name) : taken)
  const valid = complete(server) && !issues.name && !issues.url
  const stdio = server.transport === 'stdio'
  const result = { ...server, args: args.split(/\s+/).filter(Boolean) }

  return (
    <div className={cn('flex flex-col gap-[var(--space-5)]', className)}>
      <div className="flex flex-col gap-[var(--space-1)] pr-[var(--space-6)]">
        <h2 className="m-0 text-title text-foreground">
          {editing ? `Edit ${defaultServer?.name}` : 'Add an MCP server'}
        </h2>
        <p className="m-0 text-body text-muted-foreground">
          Tools the sessions can call. A stdio server runs as a child process; http and sse servers answer on a URL.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-4)] @md:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Name" error={issues.name} hint="How tools are named: mcp__<name>__<tool>.">
          {id => (
            <Input
              id={id}
              variant="bordered"
              value={server.name}
              placeholder="postgres"
              invalid={Boolean(issues.name)}
              onValueChange={name => set({ name: name.trim() })}
            />
          )}
        </Field>
        <Fieldset legend="Transport">
          <Segmented
            label="Transport"
            options={TRANSPORTS}
            value={server.transport}
            onValueChange={transport => set({ transport })}
          />
        </Fieldset>
      </div>

      {stdio ? (
        <>
          <div className="grid grid-cols-1 gap-[var(--space-4)] @md:grid-cols-2">
            <Field label="Command">
              {id => (
                <Input
                  id={id}
                  variant="bordered"
                  className="font-mono"
                  value={server.command}
                  placeholder="npx"
                  onValueChange={command => set({ command })}
                />
              )}
            </Field>
            <Field label="Arguments" hint="Separated by spaces.">
              {id => (
                <Input
                  id={id}
                  variant="bordered"
                  className="font-mono"
                  value={args}
                  placeholder="-y @modelcontextprotocol/server-postgres"
                  onValueChange={setArgs}
                />
              )}
            </Field>
          </div>
          <Fieldset legend="Environment" hint="New values are masked, for keys and tokens; the eye shows one.">
            <KeyValue
              label="Environment variables"
              keyPlaceholder="NAME"
              valuePlaceholder="value"
              addLabel="Add variable"
              secretByDefault
              value={server.env}
              onValueChange={env => set({ env })}
            />
          </Fieldset>
        </>
      ) : (
        <>
          <Field label="URL" error={issues.url}>
            {id => (
              <Input
                id={id}
                variant="bordered"
                className="font-mono"
                value={server.url}
                placeholder={server.transport === 'sse' ? 'https://mcp.example.com/sse' : 'https://mcp.example.com/mcp'}
                invalid={Boolean(issues.url)}
                onValueChange={url => set({ url: url.trim() })}
              />
            )}
          </Field>
          <Fieldset legend="Headers" hint="New values are masked, for tokens; the eye shows one.">
            <KeyValue
              label="Request headers"
              keyPlaceholder="Header"
              addLabel="Add header"
              secretByDefault
              value={server.headers}
              onValueChange={headers => set({ headers })}
            />
          </Fieldset>
        </>
      )}

      <Fieldset legend="Scope" hint={SCOPE_NOTE[server.scope]}>
        <Segmented label="Scope" options={SCOPES} value={server.scope} onValueChange={scope => set({ scope })} />
      </Fieldset>

      {profiles.length > 0 && (
        <Fieldset
          legend="Profiles"
          hint="Sessions under the profiles you check load it; none checked means every profile."
        >
          <div className="-mx-[var(--space-2)]">
            <Checkbox.Group
              aria-label="Profiles"
              checkedIndices={new Set(profiles.flatMap((p, i) => (server.profiles.includes(p.id) ? [i] : [])))}
              onCheckedIndicesChange={picked =>
                set({ profiles: profiles.filter((_, i) => picked.has(i)).map(p => p.id) })
              }
            >
              {profiles.map(p => (
                <Checkbox key={p.id} label={p.name} />
              ))}
            </Checkbox.Group>
          </div>
        </Fieldset>
      )}

      <div className="flex flex-wrap items-start gap-[var(--space-3)] border-t border-border pt-[var(--space-4)]">
        <div className="min-w-0 flex-1">
          <TestResult test={test} />
        </div>
        <Button
          variant="secondary"
          size="compact"
          leadingIcon={Plug}
          disabled={!valid}
          loading={test.state === 'testing'}
          onClick={() => onTest?.(result)}
        >
          Test connection
        </Button>
      </div>

      <div className="flex items-center gap-[var(--space-2)]">
        {editing && onDelete && (
          <Button variant="ghost" leadingIcon={Trash} className="text-destructive" onClick={() => onDelete(result)}>
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-[var(--space-2)]">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button disabled={!valid} onClick={() => onSave?.(result)}>
            {editing ? 'Save' : 'Add server'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface McpServerDialogProps {
  /** The control that opens it, such as the MCP section's "Add server" button. */
  trigger?: ReactElement
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** What the form starts with; a server with a name is being edited. Defaults to an empty stdio server. */
  defaultServer?: Partial<McpServerConfig>
  /** The profiles it can apply to. Defaults to `[]`. */
  profiles?: Profile[]
  /** Server names already taken, so a clash is caught before saving. Defaults to `[]`. */
  taken?: string[]
  /** Where the connection test stands. Defaults to idle. */
  test?: McpConnectionTest
  /** Called with what the form holds when "Test connection" is pressed: run the test here. */
  onTest?: (server: McpServerConfig) => void
  /** Called with the server when Save is pressed; the dialog closes. */
  onSave?: (server: McpServerConfig) => void
  /** Called with the server when Delete is pressed; the dialog closes. Leave it out and no Delete shows. */
  onDelete?: (server: McpServerConfig) => void
}

/**
 * Adds or edits an MCP server: how the sessions reach it, where it is
 * configured and who loads it.
 *
 * Pick the transport and the form follows it: a stdio server takes a
 * command, its arguments and env vars (values masked, the eye shows one);
 * an http or sse server takes a URL and headers. The scope says which file
 * it lands in (your config dir, the repo, or the repo's local file) and the
 * profiles which sessions load it. "Test connection" hands the form to
 * `onTest`; the app connects and reports back through `test`: connecting,
 * the tools it listed, or the error. Save waits for a name and a command
 * or URL. The dialog grows out of its trigger; `McpServerDialog.Panel` is
 * the same form without it.
 *
 * Statics:
 * - `McpServerDialog.Panel` — the form on its own: the same props, minus the dialog's, plus `onCancel`.
 *
 * @example {@include ./examples.mdx}
 */
function McpServerDialog({
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  onSave,
  onDelete,
  ...panel
}: McpServerDialogProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
  const close = <T,>(handler?: (server: T) => void) =>
    handler &&
    ((server: T) => {
      handler(server)
      setOpen(false)
    })
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger render={trigger} />}
      <Dialog.Content width="lg" aria-label="MCP server" className="@container">
        <McpServerDialogPanel
          {...panel}
          onSave={close(onSave)}
          onDelete={close(onDelete)}
          onCancel={() => setOpen(false)}
        />
      </Dialog.Content>
    </Dialog>
  )
}

McpServerDialog.Panel = McpServerDialogPanel

export type { McpServerDialogPanelProps, McpServerDialogProps }
export { McpServerDialog, McpServerDialogPanel }

export default McpServerDialog
