/*!
 * Local addition: the AI app's "Add hook" form. A Dialog over the event, the
 * matcher, the command, the timeout and the scope, with the settings.json
 * snippet it writes shown as you type.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Textarea from '@justanarthur/modo-ui/components/inputs/textarea'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Code from '@justanarthur/modo-ui/primitives/code'
import { type ReactElement, useState } from 'react'
import { type ConfigScope, Field, Fieldset, SCOPE_NOTE, SCOPES, Segmented, settingsFile } from '../../lib/config-parts'
import { useIcon } from '../../lib/icons'

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'SessionStart'
  | 'SessionEnd'

/** A hook as the form writes it. */
export interface HookConfig {
  event: HookEvent
  /** What it fires on: a tool pattern for the tool events, a source for SessionStart and PreCompact, empty for every one. */
  matcher: string
  command: string
  /** Seconds before the harness gives up on it. */
  timeout: number
  scope: ConfigScope
}

/** Each event: when it fires, and what its matcher matches (none when it takes no matcher). */
const EVENTS: Record<HookEvent, { note: string; matcher?: { hint: string; placeholder: string } }> = {
  PreToolUse: {
    note: 'Before a tool runs; exit 2 blocks the call and tells Claude why.',
    matcher: {
      hint: 'Tool names or a regex: Bash, Edit|Write, mcp__github__.*. Empty matches every tool.',
      placeholder: 'Bash',
    },
  },
  PostToolUse: {
    note: 'After a tool succeeds, with its input and response.',
    matcher: { hint: 'Tool names or a regex: Edit|Write. Empty matches every tool.', placeholder: 'Edit|Write' },
  },
  UserPromptSubmit: { note: 'When you send a prompt, before Claude sees it; its output joins the context.' },
  Notification: { note: 'When Claude needs your permission or has been idle waiting for input.' },
  Stop: { note: 'When the main agent finishes its turn; exit 2 makes it keep going.' },
  SubagentStop: { note: 'When a subagent finishes.' },
  PreCompact: {
    note: 'Before the context is compacted.',
    matcher: { hint: 'manual (from /compact) or auto. Empty matches both.', placeholder: 'auto' },
  },
  SessionStart: {
    note: 'When a session starts or resumes; its output joins the context.',
    matcher: { hint: 'startup, resume, clear or compact. Empty matches every start.', placeholder: 'startup' },
  },
  SessionEnd: { note: 'When a session ends.' },
}

const EVENT_NAMES = Object.keys(EVENTS) as HookEvent[]

const EMPTY: HookConfig = { event: 'PreToolUse', matcher: '', command: '', timeout: 60, scope: 'user' }

/** The settings.json fragment the hook becomes. */
function snippet(hook: HookConfig) {
  const hooks = [{ type: 'command', command: hook.command || '…', timeout: hook.timeout }]
  const entry = EVENTS[hook.event].matcher ? { matcher: hook.matcher, hooks } : { hooks }
  return JSON.stringify({ hooks: { [hook.event]: [entry] } }, null, 2)
}

interface HookDialogPanelProps {
  /** What the form starts with; editing an existing hook passes it here. Defaults to an empty PreToolUse hook. */
  defaultHook?: Partial<HookConfig>
  /** The config dir user-scoped hooks are written to. Defaults to `'~/.claude'`. */
  configDir?: string
  /** Whether the form edits an existing hook: the title and the button say so. Defaults to `false`. */
  editing?: boolean
  /** Called with the hook when Save is pressed. */
  onSave?: (hook: HookConfig) => void
  /** Called when Cancel is pressed; leave it out and no Cancel shows. */
  onCancel?: () => void
  /** Classes for the root. */
  className?: string
}

/** The form without the Dialog: for a settings page, or the docs. */
function HookDialogPanel({
  defaultHook,
  configDir = '~/.claude',
  editing = false,
  onSave,
  onCancel,
  className,
}: HookDialogPanelProps) {
  const [hook, setHook] = useState<HookConfig>({ ...EMPTY, ...defaultHook })
  const [timeout, setTimeoutText] = useState(String(hook.timeout))
  const Webhook = useIcon('webhook')
  const set = (patch: Partial<HookConfig>) => setHook({ ...hook, ...patch })
  const event = EVENTS[hook.event]
  const timeoutError = /^[1-9]\d*$/.test(timeout) ? undefined : 'Whole seconds, at least 1.'
  const valid = Boolean(hook.command.trim()) && !timeoutError

  return (
    <div className={cn('flex flex-col gap-[var(--space-5)]', className)}>
      <div className="flex flex-col gap-[var(--space-1)] pr-[var(--space-6)]">
        <h2 className="m-0 text-title text-foreground">{editing ? 'Edit hook' : 'Add a hook'}</h2>
        <p className="m-0 text-body text-muted-foreground">
          A shell command the harness runs on a session event, with the event as JSON on stdin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-4)] @md:grid-cols-2">
        <Field label="Event" hint={event.note}>
          {id => (
            <Select
              value={hook.event}
              onValueChange={value => {
                const next = EVENT_NAMES.find(e => e === value) ?? hook.event
                set({ event: next, matcher: EVENTS[next].matcher ? hook.matcher : '' })
              }}
            >
              <Select.Trigger id={id} icon={Webhook} />
              <Select.Content>
                {EVENT_NAMES.map((name, i) => (
                  <Select.Item key={name} index={i} value={name}>
                    {name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </Field>
        <Field label="Matcher" hint={event.matcher?.hint ?? `${hook.event} takes no matcher: it runs every time.`}>
          {id => (
            <Input
              id={id}
              variant="bordered"
              className="font-mono"
              value={hook.matcher}
              placeholder={event.matcher?.placeholder}
              disabled={!event.matcher}
              onValueChange={matcher => set({ matcher })}
            />
          )}
        </Field>
      </div>

      <Field
        label="Command"
        hint="Exit 0 passes; exit 2 blocks or feeds stderr back to Claude, by event; other codes warn."
      >
        {id => (
          <Textarea
            id={id}
            variant="bordered"
            className="font-mono"
            minRows={2}
            maxRows={6}
            value={hook.command}
            placeholder="bun run lint --fix"
            onValueChange={command => set({ command })}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-[var(--space-4)] @md:grid-cols-[8rem_minmax(0,1fr)]">
        <Field label="Timeout (s)" error={timeoutError}>
          {id => (
            <Input
              id={id}
              variant="bordered"
              inputMode="numeric"
              className="tabular-nums"
              value={timeout}
              invalid={Boolean(timeoutError)}
              onValueChange={text => {
                setTimeoutText(text)
                if (/^[1-9]\d*$/.test(text)) set({ timeout: Number(text) })
              }}
            />
          )}
        </Field>
        <Fieldset legend="Scope" hint={SCOPE_NOTE[hook.scope]}>
          <Segmented label="Scope" options={SCOPES} value={hook.scope} onValueChange={scope => set({ scope })} />
        </Fieldset>
      </div>

      <Fieldset legend={`Written to ${settingsFile(hook.scope, configDir)}`}>
        <Code language="json">{snippet(hook)}</Code>
      </Fieldset>

      <div className="flex justify-end gap-[var(--space-2)]">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!valid} onClick={() => onSave?.(hook)}>
          {editing ? 'Save' : 'Add hook'}
        </Button>
      </div>
    </div>
  )
}

interface HookDialogProps {
  /** The control that opens it, such as the hooks section's "Add hook" button. */
  trigger?: ReactElement
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** What the form starts with; editing an existing hook passes it here. Defaults to an empty PreToolUse hook. */
  defaultHook?: Partial<HookConfig>
  /** The config dir user-scoped hooks are written to. Defaults to `'~/.claude'`. */
  configDir?: string
  /** Whether the form edits an existing hook: the title and the button say so. Defaults to `false`. */
  editing?: boolean
  /** Called with the hook when Save is pressed; the dialog closes. */
  onSave?: (hook: HookConfig) => void
}

/**
 * Adds or edits a hook: a command the harness runs on a session event.
 *
 * Pick the event, and the form says when it fires and what its matcher
 * takes: a tool pattern for PreToolUse and PostToolUse, a source for
 * SessionStart and PreCompact; the other events take none, and the field
 * stands disabled. The command is a mono field that grows with it; the
 * timeout takes whole seconds; the scope says which settings file it lands
 * in. Under the form, the settings.json fragment it writes follows every
 * keystroke. The dialog grows out of its trigger; `HookDialog.Panel` is the
 * same form without it.
 *
 * Statics:
 * - `HookDialog.Panel` — the form on its own: the same props, minus the dialog's, plus `onCancel`.
 *
 * @example {@include ./examples.mdx}
 */
function HookDialog({ trigger, open, defaultOpen = false, onOpenChange, onSave, ...panel }: HookDialogProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger render={trigger} />}
      <Dialog.Content width="lg" aria-label="Hook" className="@container">
        <HookDialogPanel
          {...panel}
          onCancel={() => setOpen(false)}
          onSave={hook => {
            onSave?.(hook)
            setOpen(false)
          }}
        />
      </Dialog.Content>
    </Dialog>
  )
}

HookDialog.Panel = HookDialogPanel

export type { HookDialogPanelProps, HookDialogProps }
export { HookDialog, HookDialogPanel }

export default HookDialog
