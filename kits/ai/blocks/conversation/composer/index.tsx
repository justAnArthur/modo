/*!
 * Local addition: the AI app's composer, in a ShellCard. The draft
 * (./draft.tsx) is Fluid Functionalism's InputMessage (attachments, queue,
 * history, suggestions, send and stop), ported in modo-ui and moved here, with
 * two controls: one +
 * palette (attach, @-files, commands, skills, plugins) and one run-settings
 * popover (model, effort, permissions, fast mode, output style, context).
 * The shell's row says where the session runs: the project (with worktree
 * and setup) and the profile (with its usage). Every menu grows out of its
 * button.
 */

'use client'

import { SurfaceProvider, useSurface } from '@justanarthur/modo-ui'
import ShellCard from '@justanarthur/modo-ui/blocks/shell-card'
import Button from '@justanarthur/modo-ui/components/actions/button'
import List, { LIST_POPOVER, LIST_SWITCH } from '@justanarthur/modo-ui/components/data-display/list'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Slider from '@justanarthur/modo-ui/components/inputs/slider'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import Dropdown from '@justanarthur/modo-ui/components/overlays/dropdown'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/systems/sizes'
import { useIcon } from '../../../lib/icons'
import { RowTrigger } from '../../../lib/row-trigger'
import type { Command, Model, PermissionMode, Profile, Project } from '../../../lib/types'
import ProfileSwitcher from '../../profiles/profile-switcher'
import {
  ComposerDraft,
  type ComposerDraftProps,
  type DraftSlotContext,
  type DraftStatus,
  type QueuedMessage,
} from './draft'

/** One + button: attach, mention a file, run a command, skill or plugin — one searchable list. */
function AddPalette({ files, commands, onAttach }: { files: string[]; commands: Command[]; onAttach: () => void }) {
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
        {files.map(path => (
          <Dropdown.Item key={path} index={index++} icon={File} label={path} />
        ))}
        {groups.map(group => (
          <div key={group.kind} className="contents">
            <Dropdown.Label>{group.label}</Dropdown.Label>
            {commands
              .filter(c => c.kind === group.kind)
              .map(c => (
                <Dropdown.Item key={c.name} index={index++} icon={Command} label={c.name} />
              ))}
          </div>
        ))}
        <Dropdown.Empty>Nothing found</Dropdown.Empty>
      </Dropdown.Content>
    </Dropdown.Menu>
  )
}

/** `value` while `options` holds it, else `fallback`: a pick never outlives its list. */
function inList(value: string, options: string[], fallback = options[0] ?? '') {
  return options.includes(value) ? value : fallback
}

interface ProjectPickerProps {
  projects: Project[]
  branches: string[]
  branch?: string
  locked: boolean
  project: string
  onProjectChange: (path: string) => void
  worktree: boolean
  onWorktreeChange: (worktree: boolean) => void
  baseBranch: string
  onBaseBranchChange: (branch: string) => void
  options: Required<ComposerTargetOptions>
}

/** Where a session runs: the project, a worktree of its own and how it is set up. */
function ProjectPicker({
  projects,
  branches,
  branch,
  locked,
  project,
  onProjectChange,
  worktree,
  onWorktreeChange,
  baseBranch,
  onBaseBranchChange,
  options,
}: ProjectPickerProps) {
  const label = projects.find(p => p.path === project)?.label ?? ''
  const Folder = useIcon('folder')
  const Branch = useIcon('git-branch')
  return (
    <Popover>
      <Popover.Trigger
        render={
          <RowTrigger aria-label={`Project: ${label}${worktree ? ', new worktree' : ''}`}>
            <Folder size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{label}</span>
            {worktree && <Branch size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />}
          </RowTrigger>
        }
      />
      <Popover.Content side="top" align="start" sideOffset={8} className={LIST_POPOVER}>
        <SizeProvider size="default">
          <List.Section title={locked ? 'This session runs in' : 'Project'}>
            <ChoiceList
              label="Project"
              value={project}
              onValueChange={onProjectChange}
              options={projects.map(g => ({
                value: g.path,
                label: g.label,
                disabled: locked && g.path !== project,
                content: (
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className="text-body text-foreground">{g.label}</span>
                    <span className="truncate font-mono text-caption text-muted-foreground">{g.path}</span>
                  </span>
                ),
              }))}
            />
          </List.Section>
          {(branch || options.worktree || options.setupScript || options.baseBranch) && (
            <List.Section title="Checkout">
              {branch && (
                <List.Row label="Branch">
                  <span className="min-w-0 truncate font-mono text-caption text-muted-foreground">{branch}</span>
                </List.Row>
              )}
              {options.worktree && (
                <List.Row label="New worktree">
                  <Switch
                    label="New worktree"
                    checked={worktree}
                    onCheckedChange={onWorktreeChange}
                    disabled={locked}
                    className={LIST_SWITCH}
                  />
                </List.Row>
              )}
              {options.setupScript && (
                <List.Row label="Run setup script">
                  <Switch label="Run setup script" defaultChecked disabled={locked} className={LIST_SWITCH} />
                </List.Row>
              )}
              {options.baseBranch && (
                <List.Row label="Base branch">
                  <Select value={baseBranch} onValueChange={onBaseBranchChange} disabled={locked}>
                    <Select.Trigger variant="borderless" className="min-w-0" />
                    <Select.Content>
                      {branches.map((b, i) => (
                        <Select.Item key={b} index={i} value={b}>
                          {b}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </List.Row>
              )}
            </List.Section>
          )}
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

interface RunSettingsProps {
  models: Model[]
  efforts: string[]
  permissionModes: PermissionMode[]
  outputStyles: string[]
  context: number
  compacting: boolean
  onCompact?: () => void
  model: string
  onModelChange: (model: string) => void
  effort: string
  onEffortChange: (effort: string) => void
  mode: string
  onModeChange: (mode: string) => void
  fast: boolean
  onFastChange: (fast: boolean) => void
  style: string
  onStyleChange: (style: string) => void
}

/** How the agent runs, behind one trigger: "Opus 5.5 · High ◔". */
function RunSettings({
  models,
  efforts,
  permissionModes,
  outputStyles,
  context,
  compacting,
  onCompact,
  model,
  onModelChange,
  effort,
  onEffortChange,
  mode,
  onModeChange,
  fast,
  onFastChange,
  style,
  onStyleChange,
}: RunSettingsProps) {
  const activeMode = permissionModes.find(m => m.label === mode)
  const ModeIcon = useIcon(activeMode?.icon ?? 'shield-check')
  const Zap = useIcon('zap')
  const percent = Math.round(context * 100)

  return (
    <Popover>
      <Popover.Trigger
        render={
          <RowTrigger
            className="max-w-full"
            aria-label={`Run settings: ${model}, ${effort} effort, ${mode}, context ${percent}%`}
          >
            <ModeIcon size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            {fast && <Zap size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />}
            <span className="min-w-0 truncate">
              {model} · {effort}
            </span>
            <Meter variant="ring" label="Context used" value={compacting ? 0.3 : context} warnAt={0.8} errorAt={0.95} />
          </RowTrigger>
        }
      />
      <Popover.Content side="top" align="end" sideOffset={8} className={LIST_POPOVER}>
        <SizeProvider size="default">
          <List.Section title="Model">
            <ChoiceList
              label="Model"
              value={model}
              onValueChange={onModelChange}
              options={models.map(m => ({
                value: m.name,
                label: m.name,
                content: (
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className="text-body text-foreground">{m.name}</span>
                    <span className="truncate text-caption text-muted-foreground">{m.note}</span>
                  </span>
                ),
              }))}
            />
          </List.Section>
          <div className="px-[var(--space-2)]">
            <Slider
              size="default"
              label="Effort"
              min={0}
              max={efforts.length - 1}
              step={1}
              value={Math.max(efforts.indexOf(effort), 0)}
              onValueChange={v => onEffortChange(efforts[typeof v === 'number' ? v : v[0]] ?? effort)}
              formatValue={v => efforts[v] ?? ''}
            />
          </div>
          <List.Section title="Behaviour">
            <List.Row label="Permissions">
              <Select value={mode} onValueChange={onModeChange}>
                <Select.Trigger variant="borderless" icon={ModeIcon} className="min-w-0" title={activeMode?.note} />
                <Select.Content>
                  {permissionModes.map((m, i) => (
                    <Select.Item key={m.label} index={i} value={m.label}>
                      {m.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </List.Row>
            <List.Row label="Fast mode">
              <Switch label="Fast mode" checked={fast} onCheckedChange={onFastChange} className={LIST_SWITCH} />
            </List.Row>
            <List.Row label="Output style">
              <Select value={style} onValueChange={onStyleChange}>
                <Select.Trigger variant="borderless" className="min-w-0" />
                <Select.Content>
                  {outputStyles.map((o, i) => (
                    <Select.Item key={o} index={i} value={o}>
                      {o}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </List.Row>
          </List.Section>
          <List.Section title="Context" aside={compacting ? 'Compacting…' : `${percent}% of the window`}>
            <List.Row label="Compacts at 95%">
              <Meter
                variant="line"
                className="w-20"
                label="Context used"
                value={compacting ? 0.3 : context}
                warnAt={0.8}
                errorAt={0.95}
              />
              <Button variant="ghost" size="compact" disabled={compacting || context < 0.2} onClick={onCompact}>
                Compact
              </Button>
            </List.Row>
          </List.Section>
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

/**
 * The draft paints a fixed surface 2; inside a lifted shell that reads as a
 * hole. This lifts it one level above whatever holds it instead.
 */
function LiftedDraft(props: ComposerDraftProps) {
  const level = Math.min(useSurface() + 1, 8)
  return (
    <SurfaceProvider value={level}>
      <ComposerDraft {...props} className={cn(SURFACE_BG[level], props.className)} />
    </SurfaceProvider>
  )
}

/** Which of the project popover's checkout rows a session offers. Each defaults to `true`. */
interface ComposerTargetOptions {
  /** The New worktree switch. */
  worktree?: boolean
  /** The Base branch a new worktree starts from. */
  baseBranch?: boolean
  /** The Run setup script switch. */
  setupScript?: boolean
}

interface ComposerProps {
  /** The models the active profile offers, each with a note. */
  models: Model[]
  /** The effort steps, lowest first. */
  efforts: string[]
  /** The permission modes, each with its icon and note. */
  permissionModes: PermissionMode[]
  /** The output styles. */
  outputStyles: string[]
  /** The commands, skills and plugins the + palette runs. */
  commands: Command[]
  /** Files the + palette can mention. */
  files: string[]
  /** The project folders a session can run in. */
  projects: Project[]
  /** Branches a new worktree can start from. */
  branches: string[]
  /** The session's own branch, shown in the project menu. Omit before the session has one. */
  branch?: string
  /** The project the session runs in, by `Project.path`, controlled. Pair with `onProjectChange`. A path not in `projects` shows, and stands for, the first project. */
  project?: string
  /** The initial project, by `Project.path`, when uncontrolled. Defaults to the first project. */
  defaultProject?: string
  /** Called with the picked project's `path`. Only a new session (`target`) can pick one. */
  onProjectChange?: (path: string) => void
  /** Whether the session gets a new git worktree, controlled. Pair with `onWorktreeChange`. */
  worktree?: boolean
  /** Start with a new worktree when uncontrolled. Defaults to `true`. */
  defaultWorktree?: boolean
  /** Called when the new-worktree switch flips. Only a new session (`target`) can flip it. */
  onWorktreeChange?: (worktree: boolean) => void
  /** The branch a new worktree starts from, controlled. Pair with `onBaseBranchChange`. A branch not in `branches` stands for the first one. */
  baseBranch?: string
  /** The initial base branch when uncontrolled. Defaults to the first branch. */
  defaultBaseBranch?: string
  /** Called with the base branch picked. Only a new session (`target`) can pick one. */
  onBaseBranchChange?: (branch: string) => void
  /** The profiles a session can run under. */
  profiles: Profile[]
  /** The model, by name, controlled. Pair with `onModelChange`. A name not in `models` (say, after a switch to another provider) stands for the first model. */
  model?: string
  /** Initial model, by name, when uncontrolled. Defaults to the first model. */
  defaultModel?: string
  /** Called with the model's name when another one is picked. */
  onModelChange?: (model: string) => void
  /** The effort step, controlled. Pair with `onEffortChange`. A step not in `efforts` stands for the middle one. */
  effort?: string
  /** Initial effort when uncontrolled. Defaults to the middle step. */
  defaultEffort?: string
  /** Called with the effort step the slider lands on. */
  onEffortChange?: (effort: string) => void
  /** The permission mode, by label, controlled. Pair with `onPermissionModeChange`. A label not in `permissionModes` stands for the first mode. */
  permissionMode?: string
  /** Initial permission mode, by label, when uncontrolled. Defaults to the first mode. */
  defaultPermissionMode?: string
  /** Called with the permission mode's label when another one is picked. */
  onPermissionModeChange?: (mode: string) => void
  /** Whether fast mode is on, controlled. Pair with `onFastChange`. */
  fast?: boolean
  /** Start with fast mode on when uncontrolled. Defaults to `false`. */
  defaultFast?: boolean
  /** Called when the fast mode switch flips. */
  onFastChange?: (fast: boolean) => void
  /** The output style, controlled. Pair with `onOutputStyleChange`. A style not in `outputStyles` stands for the first one. */
  outputStyle?: string
  /** Initial output style when uncontrolled. Defaults to the first style. */
  defaultOutputStyle?: string
  /** Called with the output style picked. */
  onOutputStyleChange?: (style: string) => void
  /** Used share of the context window, 0–1. Defaults to `0.62`. */
  context?: number
  /** The conversation is being compacted: the context meter says so. Defaults to `false`. */
  compacting?: boolean
  /** Called by the context section's Compact button: compact the conversation (and set `compacting` while it runs). */
  onCompact?: () => void
  /** The checkout rows the project popover offers: `{ worktree: false }` for an app that runs sessions in place, with no worktrees. Each defaults to `true`. */
  targetOptions?: ComposerTargetOptions
  /** Whether a reply is streaming. While it is, Enter queues the draft and the empty draft's button stops the reply; on the streaming→idle edge the head of the queue sends. Pair with `onStatusChange` / `onStop`, or set `defaultStatus`. */
  status?: DraftStatus
  /** The initial status when uncontrolled; Stop then flips it to `"idle"` itself. Defaults to `"idle"`. */
  defaultStatus?: DraftStatus
  /** Called with the status when the uncontrolled composer changes it (Stop). */
  onStatusChange?: (status: DraftStatus) => void
  /** Called when Stop is pressed. Halt the reply and set `status` to `"idle"`. */
  onStop?: () => void
  /** The draft's text, controlled. Pair with `onValueChange`. */
  value?: string
  /** The draft's initial text when uncontrolled. Defaults to `""`. */
  defaultValue?: string
  /** Called with the draft's text on every change. */
  onValueChange?: (value: string) => void
  /** The messages queued while a reply streams, controlled: `{ id, text, files }` each. Pair with `onQueueChange`. */
  queue?: QueuedMessage[]
  /** The initial queue when uncontrolled. Defaults to `[]`. */
  defaultQueue?: QueuedMessage[]
  /** Called when a message is queued, edited back, removed, reordered or sent from the queue. */
  onQueueChange?: (queue: QueuedMessage[]) => void
  /** Messages sent before, oldest first: ↑ on the draft's first line recalls them, ↓ on its last walks back to the draft. Defaults to `[]`. */
  history?: string[]
  /** Prompts listed under the draft while it is empty: ↓ / ↑ walk them without leaving the text, Enter or a click fills one in. */
  suggestions?: string[]
  /** A prompt shown as the placeholder with a Tab keycap: Tab fills it in. Wins over `placeholder`. */
  placeholderSuggestion?: string
  /** The file types the palette's Attach and a drop take, as an `accept` string. Defaults to `"image/png,image/jpeg,application/pdf"`. */
  accept?: string
  /** The most files a message takes; extra ones are dropped. */
  maxFiles?: number
  /** A new session: the project and profile can still be picked. Otherwise they show where this session runs. Defaults to `false`. */
  target?: boolean
  /** The profile the session runs under, by id, controlled. Pair with `onProfileChange`. An id not in `profiles` shows the first profile. */
  profile?: string
  /** The profile the session runs under, by id, when uncontrolled. Defaults to the first profile. */
  defaultProfile?: string
  /** Called with the profile picked, by id. */
  onProfileChange?: (profile: string) => void
  /** The draft's placeholder. Defaults to `'Ask, or type / for commands'`. */
  placeholder?: string
  /** Called with the trimmed text and the attached files when a message is sent, or sent from the queue. */
  onSend?: (text: string, files: File[]) => void
  /** Classes for the root. */
  className?: string
}

/**
 * Where you write to the session, with every per-session control behind
 * four triggers, held in a ShellCard.
 *
 * The draft grows with its text, then scrolls; Enter sends and Shift+Enter
 * breaks the line. Files dropped anywhere on it, or attached from the +
 * palette, preview as tiles above the text (images as themselves, PDFs by
 * their first page with the optional `pdfjs-dist`, the rest as an icon).
 * While a reply streams (`status`) the button queues what you type: queued
 * messages stack above the draft, reorder by drag or Alt+↑/↓, come back into
 * the draft on a double-click, and the first one sends when the reply ends;
 * with the draft empty the button stops the reply. ↑ on the first line
 * recalls sent messages (`history`); `suggestions` list prompts under an
 * empty draft and `placeholderSuggestion` offers one behind a Tab keycap.
 * The + opens one searchable palette: attach, mention a file, run a
 * command, skill or plugin.
 *
 * The row under it, on the shell, holds the rest. On the left, where the
 * session runs: the project, whose popover also holds the worktree, the
 * setup script and the base branch, and the profile, with two thin lines for
 * its session and weekly limits (see the profile switcher). On the right,
 * how it runs: one trigger showing the permission mode, the model, the
 * effort and a small context ring opens the model (with a note on each), a
 * tall effort slider, the permission mode, fast mode, the output style and
 * the context with a compact button (`onCompact`). `targetOptions` drops
 * checkout rows an app doesn't offer (`{ worktree: false, baseBranch:
 * false, setupScript: false }` for sessions that run in place). All three
 * popovers share one layout: a
 * caption per section, then rows with the label on the left and the control
 * on the right.
 *
 * Every draft prop has its uncontrolled twin (`defaultValue`,
 * `defaultQueue`, `defaultStatus`), so a composer runs with no state in the
 * caller. So does every choice on the row: the project (by its `path`), the
 * worktree switch, the base branch, the profile, the model, the effort, the
 * permission mode, fast mode and the output style each take a controlled
 * prop, a `default…` and an `on…Change`, so an app can pass them on to the
 * agent (`--model`, `--effort`, `--permission-mode`). A choice its list no
 * longer holds (a model after a switch to another provider, a project that
 * was removed) stands for the list's first entry (the middle one for effort)
 * instead of lingering.
 *
 * Statics:
 * - `Composer.Draft` — the draft alone, without the shell and its menus:
 *   the props above plus `leftSlot` / `rightSlot` (content, or a render
 *   function given `{ openFilePicker, files }`), `files` / `defaultFiles` /
 *   `onFilesChange` (attachments are on once either is set), `minRows` /
 *   `maxRows`, `size`, `disabled`, `showQueue` and `textareaProps`.
 *
 * Also exported: `FileThumbnail`, the square preview of an attachment, for
 * the files a sent message carried.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/input-message.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Composer = Object.assign(
  function Composer({
    models,
    efforts,
    permissionModes,
    outputStyles,
    commands,
    files,
    projects,
    branches,
    branch,
    project: projectProp,
    defaultProject,
    onProjectChange,
    worktree: worktreeProp,
    defaultWorktree = true,
    onWorktreeChange,
    baseBranch: baseBranchProp,
    defaultBaseBranch,
    onBaseBranchChange,
    profiles,
    model: modelProp,
    defaultModel,
    onModelChange,
    effort: effortProp,
    defaultEffort,
    onEffortChange,
    permissionMode: permissionModeProp,
    defaultPermissionMode,
    onPermissionModeChange,
    fast: fastProp,
    defaultFast = false,
    onFastChange,
    outputStyle: outputStyleProp,
    defaultOutputStyle,
    onOutputStyleChange,
    context = 0.62,
    compacting = false,
    onCompact,
    targetOptions,
    defaultStatus = 'idle',
    target = false,
    profile,
    defaultProfile,
    onProfileChange,
    placeholder = 'Ask, or type / for commands',
    className,
    ...draft
  }: ComposerProps) {
    const projectPaths = projects.map(p => p.path)
    const modelNames = models.map(m => m.name)
    const modeLabels = permissionModes.map(m => m.label)
    const middleEffort = efforts[Math.floor(efforts.length / 2)] ?? ''
    const [project, setProject] = useControllableState(projectProp, defaultProject ?? '', onProjectChange)
    const [worktree, setWorktree] = useControllableState(worktreeProp, defaultWorktree, onWorktreeChange)
    const [baseBranch, setBaseBranch] = useControllableState(
      baseBranchProp,
      defaultBaseBranch ?? '',
      onBaseBranchChange,
    )
    const [model, setModel] = useControllableState(modelProp, defaultModel ?? '', onModelChange)
    const [effort, setEffort] = useControllableState(effortProp, defaultEffort ?? middleEffort, onEffortChange)
    const [mode, setMode] = useControllableState(
      permissionModeProp,
      defaultPermissionMode ?? '',
      onPermissionModeChange,
    )
    const [fast, setFast] = useControllableState(fastProp, defaultFast, onFastChange)
    const [style, setStyle] = useControllableState(outputStyleProp, defaultOutputStyle ?? '', onOutputStyleChange)

    return (
      <ShellCard
        variant="elevated"
        className={cn('w-full', className)}
        footer={
          <SizeProvider size="compact">
            <ShellCard.Footer className="justify-start gap-[var(--space-1)] pt-[var(--space-1)]">
              <ProjectPicker
                projects={projects}
                branches={branches}
                branch={branch}
                locked={!target}
                project={inList(project, projectPaths)}
                onProjectChange={setProject}
                worktree={worktree}
                onWorktreeChange={setWorktree}
                baseBranch={inList(baseBranch, branches)}
                onBaseBranchChange={setBaseBranch}
                options={{ worktree: true, baseBranch: true, setupScript: true, ...targetOptions }}
              />
              <ProfileSwitcher
                profiles={profiles}
                value={profile}
                defaultValue={defaultProfile}
                onValueChange={onProfileChange}
                side="top"
              />
              <div className="ml-auto min-w-0">
                <RunSettings
                  models={models}
                  efforts={efforts}
                  permissionModes={permissionModes}
                  outputStyles={outputStyles}
                  context={context}
                  compacting={compacting}
                  onCompact={onCompact}
                  model={inList(model, modelNames)}
                  onModelChange={setModel}
                  effort={inList(effort, efforts, middleEffort)}
                  onEffortChange={setEffort}
                  mode={inList(mode, modeLabels)}
                  onModeChange={setMode}
                  fast={fast}
                  onFastChange={setFast}
                  style={inList(style, outputStyles)}
                  onStyleChange={setStyle}
                />
              </div>
            </ShellCard.Footer>
          </SizeProvider>
        }
      >
        <LiftedDraft
          {...draft}
          placeholder={placeholder}
          defaultStatus={defaultStatus}
          defaultFiles={[]}
          leftSlot={({ openFilePicker }) => (
            <AddPalette files={files} commands={commands} onAttach={() => openFilePicker()} />
          )}
        />
      </ShellCard>
    )
  },
  { Draft: ComposerDraft },
)

export { FileThumbnail } from './file-thumbnail'
export type { ComposerDraftProps, ComposerProps, ComposerTargetOptions, DraftSlotContext, DraftStatus, QueuedMessage }
export { Composer, ComposerDraft }

export default Composer
