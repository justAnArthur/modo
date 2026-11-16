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
import Button from '@justanarthur/modo-ui/components/button'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Slider from '@justanarthur/modo-ui/components/inputs/slider'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import List, { LIST_POPOVER, LIST_SWITCH } from '@justanarthur/modo-ui/components/list'
import Meter from '@justanarthur/modo-ui/components/meter'
import Dropdown from '@justanarthur/modo-ui/components/overlays/dropdown'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/sizes'
import { useState } from 'react'
import { useIcon } from '../../lib/icons'
import { RowTrigger } from '../../lib/row-trigger'
import type { Command, Model, PermissionMode, Profile, Project } from '../../lib/types'
import ProfileSwitcher from '../profile-switcher'
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

/** Where a session runs: the project, a worktree of its own and how it is set up. */
function ProjectPicker({
  projects,
  branches,
  branch,
  locked,
}: {
  projects: Project[]
  branches: string[]
  branch?: string
  locked: boolean
}) {
  const [project, setProject] = useState(projects[0]?.label ?? '')
  const [worktree, setWorktree] = useState(true)
  const Folder = useIcon('folder')
  const Branch = useIcon('git-branch')
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
      <Popover.Content side="top" align="start" sideOffset={8} className={LIST_POPOVER}>
        <SizeProvider size="default">
          <List.Section title={locked ? 'This session runs in' : 'Project'}>
            <ChoiceList
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
          </List.Section>
          <List.Section title="Checkout">
            {branch && (
              <List.Row label="Branch">
                <span className="min-w-0 truncate font-mono text-caption text-muted-foreground">{branch}</span>
              </List.Row>
            )}
            <List.Row label="New worktree">
              <Switch
                label="New worktree"
                checked={worktree}
                onCheckedChange={setWorktree}
                disabled={locked}
                className={LIST_SWITCH}
              />
            </List.Row>
            <List.Row label="Run setup script">
              <Switch label="Run setup script" defaultChecked disabled={locked} className={LIST_SWITCH} />
            </List.Row>
            <List.Row label="Base branch">
              <Select defaultValue={branches[0]} disabled={locked}>
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
          </List.Section>
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
  defaultModel: string
  defaultEffort: string
  defaultMode: string
  defaultFast: boolean
}

/** How the agent runs, behind one trigger: "Opus 5.5 · High ◔". */
function RunSettings({
  models,
  efforts,
  permissionModes,
  outputStyles,
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
  const [style, setStyle] = useState(outputStyles[0] ?? '')
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
              onValueChange={setModel}
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
              onValueChange={v => setEffort(efforts[typeof v === 'number' ? v : v[0]] ?? effort)}
              formatValue={v => efforts[v] ?? ''}
            />
          </div>
          <List.Section title="Behaviour">
            <List.Row label="Permissions">
              <Select value={mode} onValueChange={setMode}>
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
              <Switch label="Fast mode" checked={fast} onCheckedChange={setFast} className={LIST_SWITCH} />
            </List.Row>
            <List.Row label="Output style">
              <Select value={style} onValueChange={setStyle}>
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
              <Button variant="ghost" size="compact" disabled={compacting || context < 0.2}>
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
  /** The profiles a session can run under. */
  profiles: Profile[]
  /** Initial model, by name. Defaults to the first model. */
  defaultModel?: string
  /** Initial permission mode, by label. Defaults to the first mode. */
  defaultPermissionMode?: string
  /** Initial effort. Defaults to the middle step. */
  defaultEffort?: string
  /** Start with fast mode on. Defaults to `false`. */
  defaultFast?: boolean
  /** Used share of the context window, 0–1. Defaults to `0.62`. */
  context?: number
  /** The conversation is being compacted: the context meter says so. Defaults to `false`. */
  compacting?: boolean
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
  /** The profile the session runs under, by id. Defaults to the first profile. */
  defaultProfile?: string
  /** Called with the profile picked. */
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
 * the context with a compact button. All three popovers share one layout: a
 * caption per section, then rows with the label on the left and the control
 * on the right.
 *
 * Every draft prop has its uncontrolled twin (`defaultValue`,
 * `defaultQueue`, `defaultStatus`), so a composer runs with no state in the
 * caller.
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
    profiles,
    defaultModel,
    defaultPermissionMode,
    defaultEffort,
    defaultFast = false,
    context = 0.62,
    compacting = false,
    defaultStatus = 'idle',
    target = false,
    defaultProfile,
    onProfileChange,
    placeholder = 'Ask, or type / for commands',
    className,
    ...draft
  }: ComposerProps) {
    return (
      <ShellCard
        variant="elevated"
        className={cn('w-full', className)}
        footer={
          <SizeProvider size="compact">
            <ShellCard.Footer className="justify-start gap-[var(--space-1)] pt-[var(--space-1)]">
              <ProjectPicker projects={projects} branches={branches} branch={branch} locked={!target} />
              <ProfileSwitcher
                profiles={profiles}
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
                  defaultModel={defaultModel ?? models[0]?.name ?? ''}
                  defaultEffort={defaultEffort ?? efforts[Math.floor(efforts.length / 2)] ?? ''}
                  defaultMode={defaultPermissionMode ?? permissionModes[0]?.label ?? ''}
                  defaultFast={defaultFast}
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
export type { ComposerDraftProps, ComposerProps, DraftSlotContext, DraftStatus, QueuedMessage }
export { Composer, ComposerDraft }

export default Composer
