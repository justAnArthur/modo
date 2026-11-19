/*!
 * Local addition: the form that adds or edits a worker preset, for the side
 * pane: its id, model, effort and profile, how much it may do without
 * asking, and the tools it is allowed. Presentational: the worker, the
 * profiles, the validation messages and the callbacks come in as props;
 * `standards worker set` and `worker remove` run outside.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Combobox, { type ComboboxItemData } from '@justanarthur/modo-ui/components/inputs/combobox'
import Field from '@justanarthur/modo-ui/components/inputs/field'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import AlertDialog from '@justanarthur/modo-ui/components/overlays/alert-dialog'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { PERMISSION } from '../../lib/states'
import type { ClaudeProfile, Effort, PermissionMode, Worker } from '../../lib/types'
import { PANE, PaneHeader } from '../pane'

const MODELS = ['sonnet', 'opus', 'haiku']

const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

/** The levels the form offers; `dontAsk` and `plan` still show their line when a preset has them. */
const LEVELS: PermissionMode[] = ['manual', 'acceptEdits', 'auto', 'bypassPermissions']

const TOOLS = [
  'Bash(git *)',
  'Bash(gh pr *)',
  'Bash(gh repo edit *)',
  'Bash(bun *)',
  'Bash(npm *)',
  'Bash(pnpm *)',
  'WebFetch',
  'WebSearch',
]

const unique = (values: string[]) => [...new Set(values.filter(Boolean))]

/** A row of the string-item comboboxes. */
function row(item: ComboboxItemData, mono = false) {
  const value = typeof item === 'string' ? item : item.value
  return (
    <Combobox.Item key={value} value={value}>
      <span className={cn(mono && 'font-mono')}>{value}</span>
    </Combobox.Item>
  )
}

/** The message for a field, or for the first of its entries (`allow.2`). */
const errorOf = (errors: Record<string, string>, field: string) =>
  errors[field] ?? Object.entries(errors).find(([path]) => path.startsWith(`${field}.`))?.[1]

interface WorkerFormProps {
  /** The worker being edited (controlled). Pair with `onValueChange`. */
  value?: Worker
  /** The worker at first, for an uncontrolled form. Defaults to a new sonnet preset on the first profile that allows edits. */
  defaultValue?: Worker
  /** Called with the whole worker on every change. */
  onValueChange?: (worker: Worker) => void
  /** The Claude Code profiles a worker can start from. */
  profiles: Pick<ClaudeProfile, 'configDir' | 'label'>[]
  /** Rules the allowed-tools field offers; anything else can be typed. Defaults to common git, gh, package manager and web rules. */
  toolSuggestions?: string[]
  /** Validation messages by field, as the engine's schema reports them: `id`, `model`, `profile`, `allow` (or `allow.2`). */
  errors?: Record<string, string>
  /** The pane's title. Defaults to `'New worker'`. */
  title?: string
  /** Called with the worker on Save. */
  onSave?: (worker: Worker) => void
  /** The save is under way: Save spins. Defaults to `false`. */
  saving?: boolean
  /** Called on Cancel. */
  onCancel?: () => void
  /** Called once Delete is confirmed. Without it there is no Delete: a new worker has nothing to delete. */
  onDelete?: () => void
  /** Called on the close button. Without it there is none. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * A worker preset, added or edited in the side pane: who works on a failing
 * cell, and how freely.
 *
 * The id names it in `workers.yml` and in Fix with ▾. The model is sonnet,
 * opus, haiku or any model id typed in; the effort is Claude Code's default
 * unless picked; the profile is the Claude Code config dir (and account) it
 * starts from. The permission level is a segmented choice, with what the
 * picked level means in a line under it: Ask for everything, Allow edits,
 * Auto, or Trusted, which runs any command in the worktree and says so in
 * the warning hue. The allowed tools are permission rules as chips: pick a
 * suggestion or type one (`Bash(python3 -)`), Backspace drops the last; an
 * "Always allow" answered in a run lands here too.
 *
 * Save hands the worker over; validation happens outside, and its messages
 * come back through `errors`, each under its field. Delete asks first. Works
 * controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 *
 * @example {@include ./examples.mdx}
 */
export default function WorkerForm({
  value,
  defaultValue,
  onValueChange,
  profiles,
  toolSuggestions = TOOLS,
  errors = {},
  title = 'New worker',
  onSave,
  saving = false,
  onCancel,
  onDelete,
  onClose,
  className,
}: WorkerFormProps) {
  const [worker, setWorker] = useControllableState(
    value,
    defaultValue ?? {
      id: '',
      runtime: 'claude-code',
      profile: profiles[0]?.configDir ?? '~/.claude',
      model: 'sonnet',
      permission_mode: 'acceptEdits',
      allow: [],
    },
    onValueChange,
  )
  const set = (patch: Partial<Worker>) => setWorker({ ...worker, ...patch })
  const levelId = useId()
  const mode = PERMISSION[worker.permission_mode]

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className={cn(PANE, 'flex-1')}>
        <PaneHeader title={title} onClose={onClose} />

        <Field invalid={Boolean(errors.id)}>
          <Field.Label>Id</Field.Label>
          <Input
            variant="bordered"
            value={worker.id}
            onValueChange={id => set({ id })}
            placeholder="sonnet-fixer"
            className="font-mono"
          />
          {errors.id ? (
            <Field.Error>{errors.id}</Field.Error>
          ) : (
            <Field.Description>Its name in workers.yml and in Fix with ▾.</Field.Description>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field invalid={Boolean(errors.model)}>
            <Field.Label>Model</Field.Label>
            <Combobox
              items={unique([...MODELS, worker.model])}
              value={worker.model}
              onValueChange={(model: string) => set({ model })}
              creatable
              createLabel={query => `Use “${query}”`}
            >
              <Combobox.Input variant="bordered" placeholder="sonnet" />
              <Combobox.Content>
                <Combobox.List>{item => row(item)}</Combobox.List>
              </Combobox.Content>
            </Combobox>
            {errors.model && <Field.Error>{errors.model}</Field.Error>}
          </Field>
          <Field>
            <Field.Label>Effort</Field.Label>
            <Select
              value={worker.effort ?? 'default'}
              onValueChange={next => set({ effort: EFFORTS.find(effort => effort === next) })}
            >
              <Select.Trigger variant="bordered" />
              <Select.Content>
                <Select.Item value="default">Default</Select.Item>
                {EFFORTS.map(effort => (
                  <Select.Item key={effort} value={effort}>
                    {effort}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
        </div>

        <Field invalid={Boolean(errors.profile)}>
          <Field.Label>Profile</Field.Label>
          <Select value={worker.profile} onValueChange={profile => set({ profile })}>
            <Select.Trigger variant="bordered">
              <Select.Value placeholder="Pick a Claude Code profile" />
            </Select.Trigger>
            <Select.Content>
              {profiles.map(profile => (
                <Select.Item key={profile.configDir} value={profile.configDir} textValue={profile.label}>
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate">{profile.label}</span>
                    <span className="truncate font-mono text-caption text-muted-foreground">{profile.configDir}</span>
                  </span>
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          {errors.profile ? (
            <Field.Error>{errors.profile}</Field.Error>
          ) : (
            <Field.Description>The Claude Code config dir, and account, a run starts from.</Field.Description>
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <span id={levelId} className="text-body text-muted-foreground">
            Permission level
          </span>
          <Tabs
            value={worker.permission_mode}
            onValueChange={next =>
              set({ permission_mode: LEVELS.find(level => level === next) ?? worker.permission_mode })
            }
          >
            <Tabs.List aria-labelledby={levelId} className="w-full">
              {LEVELS.map(level => (
                <Tabs.Item key={level} value={level} label={PERMISSION[level].label} className="flex-1" />
              ))}
            </Tabs.List>
          </Tabs>
          <p
            className={cn(
              'flex items-start gap-2 text-caption',
              worker.permission_mode === 'bypassPermissions' ? 'text-status-warning' : 'text-muted-foreground',
            )}
          >
            {worker.permission_mode === 'bypassPermissions' && (
              <TriangleAlert size={14} strokeWidth={1.5} className="mt-px shrink-0" />
            )}
            {LEVELS.includes(worker.permission_mode) ? mode.note : `${mode.label}. ${mode.note}`}
          </p>
        </div>

        <Field invalid={Boolean(errorOf(errors, 'allow'))}>
          <Field.Label>Allowed tools</Field.Label>
          <Combobox
            multiple
            creatable
            items={unique([...toolSuggestions, ...worker.allow])}
            value={worker.allow}
            onValueChange={(allow: string[]) => set({ allow })}
            createLabel={query => `Allow “${query}”`}
          >
            <Combobox.Chips variant="bordered" placeholder="Add a rule, like Bash(git *)" className="font-mono" />
            <Combobox.Content>
              <Combobox.List>{item => row(item, true)}</Combobox.List>
            </Combobox.Content>
          </Combobox>
          {errorOf(errors, 'allow') ? (
            <Field.Error>{errorOf(errors, 'allow')}</Field.Error>
          ) : (
            <Field.Description>
              Permission rules it may use without asking. Always allow, answered in a run, adds one here.
            </Field.Description>
          )}
        </Field>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-border border-t px-5 py-3">
        {onDelete && (
          <AlertDialog>
            <AlertDialog.Trigger
              render={
                <Button variant="destructive" size="compact">
                  Delete
                </Button>
              }
            />
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Delete {worker.id || 'this worker'}?</AlertDialog.Title>
                <AlertDialog.Description>
                  It leaves workers.yml. A business that names it as its default falls back to the first worker.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Close render={<Button variant="ghost">Keep</Button>} />
                <AlertDialog.Close render={<Button variant="destructive" onClick={onDelete} />}>
                  Delete
                </AlertDialog.Close>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog>
        )}
        <Button variant="ghost" size="compact" className="ml-auto" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="compact" loading={saving} onClick={() => onSave?.(worker)}>
          Save
        </Button>
      </footer>
    </div>
  )
}

export type { WorkerFormProps }
export { WorkerForm }
