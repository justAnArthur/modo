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

import { type ButtonHTMLAttributes, type ComponentProps, forwardRef, useState } from 'react'
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
import { SURFACE_BG } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { CHANGES, COMMANDS, EFFORTS, GROUPS, MODELS, OUTPUT_STYLES, PERMISSION_MODES } from '../mock'
import { PickList } from '../pick-list'
import { POPOVER_FRAME, PopoverRow, PopoverSection } from '../popover-rows'
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

// Inside a PopoverRow the row draws the label (foreground, like every row's), so the
// switch keeps its label for screen readers only, drops its own padding, and its
// track ends where a Select's chevron does (the trigger's --space-3 inset).
const SWITCH_IN_ROW = 'py-0 pl-0 pr-[var(--space-3)] [&>span:not([role=switch])]:sr-only'

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

/** Where a session runs: the project, a worktree of its own and how it is set up. */
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
      <Popover.Content side="top" align="start" sideOffset={8} className={POPOVER_FRAME}>
        <SizeProvider size="default">
          <PopoverSection title={locked ? 'This session runs in' : 'Project'}>
            <PickList
              label="Project"
              value={project}
              onValueChange={setProject}
              options={projects.map(g => ({
                value: g.label,
                label: g.label,
                disabled: locked && g.label !== project,
                content: (
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className="text-body text-foreground">{g.label}</span>
                    <span className="truncate font-mono text-caption text-muted-foreground">{g.path}</span>
                  </span>
                ),
              }))}
            />
          </PopoverSection>
          <PopoverSection title="Checkout">
            <PopoverRow label="New worktree">
              <Switch
                label="New worktree"
                checked={worktree}
                onCheckedChange={setWorktree}
                disabled={locked}
                className={SWITCH_IN_ROW}
              />
            </PopoverRow>
            <PopoverRow label="Run setup script">
              <Switch label="Run setup script" defaultChecked disabled={locked} className={SWITCH_IN_ROW} />
            </PopoverRow>
            <PopoverRow label="Base branch">
              <Select defaultValue="main" disabled={locked}>
                <Select.Trigger variant="borderless" className="min-w-0" />
                <Select.Content>
                  {['main', 'feat/v1-lib-fixes', 'refactor/clean-ds'].map((b, i) => (
                    <Select.Item key={b} index={i} value={b}>
                      {b}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </PopoverRow>
          </PopoverSection>
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

/** How the agent runs, behind one trigger: "Opus 5.5 · High ◔". */
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
  const percent = Math.round(context * 100)

  return (
    <Popover>
      <Popover.Trigger
        render={
          <RowTrigger aria-label={`Run settings: ${model}, ${effort} effort, ${mode}, context ${percent}%`}>
            <ModeIcon size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            {fast && <Zap size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />}
            <span className="min-w-0 truncate">
              {model} · {effort}
            </span>
            <Meter variant="ring" label="Context used" value={compacting ? 0.3 : context} warnAt={0.8} errorAt={0.95} />
          </RowTrigger>
        }
      />
      <Popover.Content side="top" align="end" sideOffset={8} className={POPOVER_FRAME}>
        <SizeProvider size="default">
          <PopoverSection title="Model">
            <PickList
              label="Model"
              value={model}
              onValueChange={setModel}
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
          </PopoverSection>
          <div className="px-[var(--space-2)]">
            <Slider
              size="default"
              label="Effort"
              min={0}
              max={EFFORTS.length - 1}
              step={1}
              value={Math.max(EFFORTS.indexOf(effort), 0)}
              onChange={v => setEffort(EFFORTS[typeof v === 'number' ? v : v[0]] ?? effort)}
              formatValue={v => EFFORTS[v] ?? ''}
            />
          </div>
          <PopoverSection title="Behaviour">
            <PopoverRow label="Permissions">
              <Select value={mode} onValueChange={setMode}>
                <Select.Trigger variant="borderless" icon={ModeIcon} className="min-w-0" title={MODE_NOTE[mode]} />
                <Select.Content>
                  {PERMISSION_MODES.map((m, i) => (
                    <Select.Item key={m} index={i} value={m}>
                      {m}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </PopoverRow>
            <PopoverRow label="Fast mode">
              <Switch label="Fast mode" checked={fast} onCheckedChange={setFast} className={SWITCH_IN_ROW} />
            </PopoverRow>
            <PopoverRow label="Output style">
              <Select value={style} onValueChange={setStyle}>
                <Select.Trigger variant="borderless" className="min-w-0" />
                <Select.Content>
                  {OUTPUT_STYLES.map((o, i) => (
                    <Select.Item key={o} index={i} value={o}>
                      {o}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </PopoverRow>
          </PopoverSection>
          <PopoverSection title="Context" aside={compacting ? 'Compacting…' : `${percent}% of the window`}>
            <PopoverRow label="Compacts at 95%">
              <Meter
                variant="line"
                className="w-20"
                label="Context used"
                value={compacting ? 0.3 : context}
                warnAt={0.8}
                errorAt={0.95}
              />
              <Button variant="ghost" size="compact" disabled={compacting || context < 0.2}>
                Compact
              </Button>
            </PopoverRow>
          </PopoverSection>
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

/**
 * InputMessage paints a fixed surface 2; inside a lifted shell that reads as a
 * hole. This lifts it one level above whatever holds it instead.
 */
function LiftedInput(props: ComponentProps<typeof InputMessage>) {
  const level = Math.min(useSurface() + 1, 8)
  return (
    <SurfaceProvider value={level}>
      <InputMessage {...props} className={cn(SURFACE_BG[level], props.className)} />
    </SurfaceProvider>
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
 * queues messages while a reply streams (see InputMessage); its + opens one
 * searchable palette (attach, mention a file, run a command, skill or
 * plugin). The row under it, on the shell, holds the rest. On the left,
 * where the session runs: the project, whose popover also holds the
 * worktree, the setup script and the base branch, and the profile, with two
 * thin lines for its session and weekly limits (see the profile switcher).
 * On the right, how it runs: one trigger showing the permission mode, the
 * model, the effort and a small context ring opens the model (with a note
 * on each), a tall effort slider, the permission mode, fast mode, the output
 * style and the context with a compact button. All three popovers share one
 * layout: a caption per section, then rows with the label on the left and
 * the control on the right.
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
      variant="elevated"
      className={cn('w-full', className)}
      footer={
        <SizeProvider size="compact">
          <ShellCard.Footer className="justify-start gap-[var(--space-1)] pt-[var(--space-1)]">
            <ProjectPicker locked={!target} />
            <ProfileSwitcher defaultValue={defaultProfile} onValueChange={onProfileChange} side="top" />
            <div className="ml-auto">
              <RunSettings
                models={models}
                context={context}
                compacting={compacting}
                defaultModel={defaultModel ?? models[0] ?? ''}
                defaultEffort={defaultEffort}
                defaultMode={defaultPermissionMode}
                defaultFast={defaultFast}
              />
            </div>
          </ShellCard.Footer>
        </SizeProvider>
      }
    >
      <LiftedInput
        placeholder={placeholder}
        defaultStatus={streaming ? 'streaming' : 'idle'}
        defaultFiles={[]}
        onSend={text => onSend?.(text)}
        leftSlot={({ openFilePicker }) => <AddPalette onAttach={() => openFilePicker()} />}
      />
    </ShellCard>
  )
}

export type { ComposerProps }
