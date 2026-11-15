/*!
 * Local addition: the agent desktop's composer, in a ShellCard. The draft is
 * InputMessage (attachments, queue, send and stop) with two controls: one +
 * palette (attach, @-files, commands, skills, plugins) and one run-settings
 * popover (model, effort, permissions, fast mode, output style, context).
 * The shell's row says where the session runs: the project (with worktree
 * and setup) and the profile (with its usage). Every menu grows out of its
 * button.
 */

'use client'

import { type ButtonHTMLAttributes, forwardRef, useState } from 'react'
import InputMessage from '../../../components/AI/input-message'
import Button from '../../../components/button'
import Select, { triggerVariants } from '../../../components/inputs/select'
import Slider from '../../../components/inputs/slider'
import Switch from '../../../components/inputs/switch'
import Meter from '../../../components/meter'
import Dropdown from '../../../components/overlays/dropdown'
import Popover from '../../../components/overlays/popover'
import ShellCard from '../../../components/shell-card'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { CHANGES, COMMANDS, EFFORTS, GROUPS, MODELS, OUTPUT_STYLES, PERMISSION_MODES } from '../mock'
import { PickList } from '../pick-list'
import ProfileSwitcher from '../profile-switcher'

const MODE_ICON: Record<string, IconName> = {
  'Ask before edits': 'shield-check',
  'Accept edits': 'pen-line',
  'Plan mode': 'list-checks',
  Auto: 'zap',
  'Bypass permissions': 'triangle-alert',
}

const FILES = [...CHANGES.map(c => c.path), 'ui/DESIGN.md', 'ui/AGENTS.md', 'lib/src/runtime/routes.tsx']

/** One + button: attach, mention a file, run a command, skill or plugin — one searchable list. */
function AddPalette({ onAttach }: { onAttach: () => void }) {
  const Plus = useIcon('plus')
  const Paperclip = useIcon('paperclip')
  const File = useIcon('file-text')
  const Command = useIcon('command')
  const groups = [
    { label: 'Commands', kind: 'command' },
    { label: 'Skills', kind: 'skill' },
    { label: 'Plugins', kind: 'plugin' },
  ] as const
  let index = 1
  return (
    <Dropdown.Menu>
      <Dropdown.Trigger
        render={
          <Button variant="ghost" size="icon-compact" aria-label="Add files, mentions and commands">
            <Plus />
          </Button>
        }
      />
      <Dropdown.Content side="top" align="start" className="w-72">
        <Dropdown.Search filter placeholder="Files, commands, skills" />
        <Dropdown.Item index={0} icon={Paperclip} label="Attach files…" onSelect={onAttach} />
        <Dropdown.Label>Mention a file</Dropdown.Label>
        {FILES.map(path => (
          <Dropdown.Item key={path} index={index++} icon={File} label={path} />
        ))}
        {groups.map(group => (
          <div key={group.kind} className="contents">
            <Dropdown.Label>{group.label}</Dropdown.Label>
            {COMMANDS.filter(c => c.kind === group.kind).map(c => (
              <Dropdown.Item key={c.name} index={index++} icon={Command} label={c.name} />
            ))}
          </div>
        ))}
        <Dropdown.Empty>Nothing found</Dropdown.Empty>
      </Dropdown.Content>
    </Dropdown.Menu>
  )
}

const MODEL_NOTE: Record<string, string> = {
  'Opus 5.5': 'Most capable',
  'Sonnet 5.5': 'Fast and capable',
  'Haiku 5.5': 'Fastest, lightest',
  'Fable 5.2': 'Long context',
  'GLM-4.6': 'Z.ai flagship',
  'GLM-4.5-Air': 'Z.ai, lighter',
}

const MODE_NOTE: Record<string, string> = {
  'Ask before edits': 'Asks before every edit and command',
  'Accept edits': 'Edits freely, asks before commands',
  'Plan mode': 'Reads and plans, changes nothing',
  Auto: 'Runs safe actions, asks for risky ones',
  'Bypass permissions': 'Never asks; for sandboxes only',
}

/** A borderless Select-style trigger, so the row's controls share one look and height. Forwards the popover trigger's props. */
const RowTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, className, ...props }, ref) => {
    const size = useSize()
    const shape = useShape()
    const Chevron = useIcon('chevron-down')
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          triggerVariants({ variant: 'borderless' }),
          size.control,
          size.text,
          size.px,
          size.gap,
          shape.input,
          className,
        )}
        {...props}
      >
        {children}
        <Chevron
          size={size.icon}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground transition-[color] duration-fast group-hover:text-foreground"
        />
      </button>
    )
  },
)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <span className="px-[var(--space-2)] text-caption text-muted-foreground">{title}</span>
      {children}
    </div>
  )
}

/** Where a new session runs: the project, a worktree of its own and how it is set up. */
function ProjectPicker({ locked = false }: { locked?: boolean }) {
  const [project, setProject] = useState('modo')
  const [worktree, setWorktree] = useState(true)
  const Folder = useIcon('folder')
  const Branch = useIcon('git-branch')
  const projects = GROUPS.filter(g => g.kind === 'project')
  return (
    <Popover>
      <Popover.Trigger
        render={
          <RowTrigger aria-label={`Project: ${project}${worktree ? ', new worktree' : ''}`}>
            <Folder size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{project}</span>
            {worktree && <Branch size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />}
          </RowTrigger>
        }
      />
      <Popover.Content side="top" align="start" sideOffset={8} className="w-80 gap-[var(--space-3)] p-[var(--space-2)]">
        <SizeProvider size="compact">
          <Section title={locked ? 'This session runs in' : 'Project'}>
            <PickList
              label="Project"
              value={project}
              onValueChange={setProject}
              options={projects.map(g => ({
                value: g.label,
                label: g.label,
                disabled: locked && g.label !== project,
                content: (
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body text-foreground">{g.label}</span>
                    <span className="truncate font-mono text-caption text-muted-foreground">{g.path}</span>
                  </span>
                ),
              }))}
            />
          </Section>
          <Section title="Checkout">
            <Switch.Group aria-label="Checkout" className="w-full">
              <Switch
                label="New worktree"
                description="A branch and folder of its own, under .claude/worktrees"
                checked={worktree}
                onCheckedChange={setWorktree}
                disabled={locked}
              />
              <Switch
                label="Run setup script"
                description=".claude/setup.sh: bun install, build the lib"
                defaultChecked
                disabled={locked}
              />
            </Switch.Group>
            <div className="flex items-center justify-between gap-2 px-[var(--space-2)]">
              <span className="text-body text-foreground">Base branch</span>
              <Select defaultValue="main" disabled={locked}>
                <Select.Trigger variant="borderless" icon={Branch} />
                <Select.Content>
                  {['main', 'feat/v1-lib-fixes', 'refactor/clean-ds'].map((b, i) => (
                    <Select.Item key={b} index={i} value={b}>
                      {b}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </Section>
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

interface RunSettingsProps {
  models: string[]
  context: number
  compacting: boolean
  defaultModel: string
  defaultEffort: string
  defaultMode: string
  defaultFast: boolean
}

/** How the agent runs, behind one trigger: "◔ Opus 5.5 · High". */
function RunSettings({
  models,
  context,
  compacting,
  defaultModel,
  defaultEffort,
  defaultMode,
  defaultFast,
}: RunSettingsProps) {
  const [model, setModel] = useState(defaultModel)
  const [effort, setEffort] = useState(defaultEffort)
  const [mode, setMode] = useState(defaultMode)
  const [fast, setFast] = useState(defaultFast)
  const [style, setStyle] = useState('Default')
  const ModeIcon = useIcon(MODE_ICON[mode] ?? 'shield-check')
  const Zap = useIcon('zap')
  const Chevron = useIcon('chevron-down')
  const percent = Math.round(context * 100)

  return (
    <Popover>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="compact"
            aria-label={`Run settings: ${model}, ${effort} effort, ${mode}, context ${percent}%`}
          >
            <span className="flex items-center gap-1.5">
              <ModeIcon size={14} strokeWidth={1.5} className="shrink-0" />
              {fast && <Zap size={14} strokeWidth={1.5} className="shrink-0" />}
              <span>
                {model} · {effort}
              </span>
              <Meter
                variant="ring"
                label="Context used"
                value={compacting ? 0.3 : context}
                warnAt={0.8}
                errorAt={0.95}
              />
              <Chevron size={14} strokeWidth={1.5} className="shrink-0" />
            </span>
          </Button>
        }
      />
      <Popover.Content side="top" align="end" sideOffset={8} className="w-80 gap-[var(--space-3)] p-[var(--space-2)]">
        <SizeProvider size="compact">
          <Section title="Model">
            <PickList
              label="Model"
              value={model}
              onValueChange={setModel}
              rowClassName="py-1.5"
              options={models.map(m => ({
                value: m,
                label: m,
                content: (
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className="text-body text-foreground">{m}</span>
                    <span className="truncate text-caption text-muted-foreground">{MODEL_NOTE[m]}</span>
                  </span>
                ),
              }))}
            />
          </Section>
          <div className="px-[var(--space-2)]">
            <Slider
              label="Effort"
              min={0}
              max={EFFORTS.length - 1}
              step={1}
              showSteps
              showValue
              value={Math.max(EFFORTS.indexOf(effort), 0)}
              onChange={v => setEffort(EFFORTS[typeof v === 'number' ? v : v[0]] ?? effort)}
              formatValue={v => EFFORTS[v] ?? ''}
            />
          </div>
          <Section title="Permissions">
            <Select value={mode} onValueChange={setMode}>
              <Select.Trigger variant="borderless" icon={ModeIcon} className="w-full" />
              <Select.Content>
                {PERMISSION_MODES.map((m, i) => (
                  <Select.Item key={m} index={i} value={m}>
                    {m}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <span className="px-[var(--space-2)] text-caption text-muted-foreground">{MODE_NOTE[mode]}</span>
          </Section>
          <Switch.Group aria-label="Run options" className="w-full">
            <Switch
              label="Fast mode"
              description="Quicker output on this model"
              checked={fast}
              onCheckedChange={setFast}
            />
          </Switch.Group>
          <div className="flex items-center justify-between gap-2 px-[var(--space-2)]">
            <span className="text-body text-foreground">Output style</span>
            <Select value={style} onValueChange={setStyle}>
              <Select.Trigger variant="borderless" />
              <Select.Content>
                {OUTPUT_STYLES.map((o, i) => (
                  <Select.Item key={o} index={i} value={o}>
                    {o}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="flex items-end gap-2 border-t border-border px-[var(--space-2)] pt-[var(--space-2)]">
            <Meter
              className="min-w-0 flex-1"
              label={compacting ? 'Compacting…' : 'Context'}
              value={compacting ? 0.3 : context}
              detail={`${percent}% · compacts at 95%`}
              warnAt={0.8}
              errorAt={0.95}
            />
            <Button variant="ghost" size="compact" disabled={compacting || context < 0.2}>
              Compact
            </Button>
          </div>
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

interface ComposerProps {
  /** The models the active profile offers. Defaults to the Claude models. */
  models?: string[]
  /** Initial model. Defaults to the first model. */
  defaultModel?: string
  /** Initial permission mode. Defaults to `'Ask before edits'`. */
  defaultPermissionMode?: string
  /** Initial effort. Defaults to `'High'`. */
  defaultEffort?: string
  /** Start with fast mode on. Defaults to `false`. */
  defaultFast?: boolean
  /** Used share of the context window, 0–1. Defaults to `0.62`. */
  context?: number
  /** The conversation is being compacted: the context meter says so. Defaults to `false`. */
  compacting?: boolean
  /** A reply is streaming: send queues and the button stops. Defaults to `false`. */
  streaming?: boolean
  /** A new session: the project and profile can still be picked. Otherwise they show where this session runs. Defaults to `false`. */
  target?: boolean
  /** The profile the session runs under. Defaults to `'jobiflow'`. */
  defaultProfile?: string
  /** Called with the profile picked. */
  onProfileChange?: (profile: string) => void
  /** The draft's placeholder. Defaults to `'Ask, or type / for commands'`. */
  placeholder?: string
  /** Called with the text when a message is sent. */
  onSend?: (text: string) => void
  /** Classes for the root. */
  className?: string
}

/**
 * Where you write to the session, with every per-session control behind
 * four triggers, held in a ShellCard.
 *
 * The draft grows as you type, takes dropped files and pasted text, and
 * queues messages while a reply streams (see InputMessage). In the draft,
 * the + opens one searchable palette (attach, mention a file, run a command,
 * skill or plugin), and the run trigger, which shows the permission mode,
 * the model, the effort and a ring for the context, opens the run settings:
 * the model with a note on each, an effort slider, the permission mode with
 * what it allows, fast mode, the output style, and the context with a
 * compact button. Under the draft, on the shell, sit where the session
 * runs: the project, whose popover also holds the worktree, the setup script
 * and the base branch, and the profile, with two thin lines for its session
 * and weekly limits (see the profile switcher). For a running session they
 * show where it runs; with `target` they can still be picked.
 *
 * @example {@include ./examples.mdx}
 */
export default function Composer({
  models = MODELS,
  defaultModel,
  defaultPermissionMode = 'Ask before edits',
  defaultEffort = 'High',
  defaultFast = false,
  context = 0.62,
  compacting = false,
  streaming = false,
  target = false,
  defaultProfile = 'jobiflow',
  onProfileChange,
  placeholder = 'Ask, or type / for commands',
  onSend,
  className,
}: ComposerProps) {
  return (
    <ShellCard
      className={cn('w-full', className)}
      footer={
        <SizeProvider size="compact">
          <ShellCard.Footer className="justify-start gap-[var(--space-1)] pt-[var(--space-1)]">
            <ProjectPicker locked={!target} />
            <ProfileSwitcher defaultValue={defaultProfile} onValueChange={onProfileChange} side="top" />
          </ShellCard.Footer>
        </SizeProvider>
      }
    >
      <InputMessage
        placeholder={placeholder}
        defaultStatus={streaming ? 'streaming' : 'idle'}
        defaultFiles={[]}
        onSend={text => onSend?.(text)}
        leftSlot={({ openFilePicker }) => <AddPalette onAttach={() => openFilePicker()} />}
        rightSlot={
          <RunSettings
            models={models}
            context={context}
            compacting={compacting}
            defaultModel={defaultModel ?? models[0] ?? ''}
            defaultEffort={defaultEffort}
            defaultMode={defaultPermissionMode}
            defaultFast={defaultFast}
          />
        }
      />
    </ShellCard>
  )
}

export type { ComposerProps }
