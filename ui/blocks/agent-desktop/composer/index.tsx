/*!
 * Local addition: the agent desktop's composer. InputMessage for the draft
 * (attachments, queue, send and stop) with three controls around it: one +
 * palette in its left slot (attach, @-files, commands, skills, plugins, one
 * searchable list), one run-settings popover in its right slot (model,
 * effort, fast mode, output style), and under it the permission mode and the
 * context meter. Every menu grows out of its button.
 */

'use client'

import { useState } from 'react'
import InputMessage from '../../../components/AI/input-message'
import Button from '../../../components/button'
import Radio from '../../../components/inputs/radio'
import Select from '../../../components/inputs/select'
import Slider from '../../../components/inputs/slider'
import Switch from '../../../components/inputs/switch'
import Meter from '../../../components/meter'
import Dropdown from '../../../components/overlays/dropdown'
import Popover from '../../../components/overlays/popover'
import Tooltip from '../../../components/overlays/tooltip'
import ShellCard from '../../../components/shell-card'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { CHANGES, COMMANDS, EFFORTS, GROUPS, MODELS, OUTPUT_STYLES, PERMISSION_MODES } from '../mock'
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

interface RunSettingsProps {
  models: string[]
  model: string
  onModel: (model: string) => void
  effort: string
  onEffort: (effort: string) => void
  fast: boolean
  onFast: (fast: boolean) => void
  style: string
  onStyle: (style: string) => void
}

/** How the agent runs, behind one trigger that reads "Opus 5.5 · High". */
function RunSettings({ models, model, onModel, effort, onEffort, fast, onFast, style, onStyle }: RunSettingsProps) {
  const Chevron = useIcon('chevron-down')
  const Zap = useIcon('zap')
  return (
    <Popover>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="compact"
            leadingIcon={fast ? Zap : undefined}
            trailingIcon={Chevron}
            aria-label={`Run settings: ${model}, ${effort} effort${fast ? ', fast' : ''}`}
          >
            {model} · {effort}
          </Button>
        }
      />
      <Popover.Content side="top" align="end" sideOffset={8} className="w-72 gap-4">
        <SizeProvider size="compact">
          <div className="flex flex-col gap-1">
            <Popover.Title>Model</Popover.Title>
            <Radio.Group value={model} onValueChange={onModel} className="-mx-2 w-auto">
              {models.map(m => (
                <Radio key={m} value={m} label={m} />
              ))}
            </Radio.Group>
          </div>
          <Slider
            label="Effort"
            min={0}
            max={EFFORTS.length - 1}
            step={1}
            showSteps
            showValue
            value={Math.max(EFFORTS.indexOf(effort), 0)}
            onChange={v => onEffort(EFFORTS[typeof v === 'number' ? v : v[0]] ?? effort)}
            formatValue={v => EFFORTS[v] ?? ''}
          />
          <Switch.Group aria-label="Run options" className="-mx-2 w-auto">
            <Switch
              label="Fast mode"
              description="Quicker output on this model"
              checked={fast}
              onCheckedChange={onFast}
            />
          </Switch.Group>
          <div className="flex items-center justify-between gap-2">
            <span className="text-body text-foreground">Output style</span>
            <Select value={style} onValueChange={onStyle}>
              <Select.Trigger variant="borderless" />
              <Select.Content>
                {OUTPUT_STYLES.map((s, i) => (
                  <Select.Item key={s} index={i} value={s}>
                    {s}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

function PermissionMode({ value, onChange }: { value: string; onChange: (mode: string) => void }) {
  const Icon = useIcon(MODE_ICON[value] ?? 'shield-check')
  const Chevron = useIcon('chevron-down')
  return (
    <Dropdown.Menu>
      <Dropdown.Trigger
        render={
          <Button
            variant="ghost"
            size="compact"
            leadingIcon={Icon}
            trailingIcon={Chevron}
            aria-label={`Permission mode: ${value}`}
          >
            {value}
          </Button>
        }
      />
      <Dropdown.Content
        side="top"
        align="start"
        checkedIndex={PERMISSION_MODES.indexOf(value)}
        onCheckedIndexChange={i => i !== undefined && onChange(PERMISSION_MODES[i] ?? value)}
      >
        <Dropdown.Label>Permission mode</Dropdown.Label>
        {PERMISSION_MODES.map((mode, i) => (
          <Dropdown.Item key={mode} index={i} label={mode} />
        ))}
      </Dropdown.Content>
    </Dropdown.Menu>
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
  /** The conversation is being compacted: the meter's place says so. Defaults to `false`. */
  compacting?: boolean
  /** A reply is streaming: send queues and the button stops. Defaults to `false`. */
  streaming?: boolean
  /** Show where a new session will run (project, profile, worktree) in the row under the draft. Defaults to `false`. */
  target?: boolean
  /** The profile a new session starts under, with `target`. Defaults to `'jobiflow'`. */
  defaultProfile?: string
  /** Called with the profile picked, with `target`. */
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
 * three buttons, held in a ShellCard.
 *
 * The draft grows as you type, takes dropped files and pasted text, and
 * queues messages while a reply streams (see InputMessage). The + on its
 * left is one searchable palette: attach files, mention a file, or run a
 * command, skill or plugin. On its right, one trigger names the model and
 * effort and opens the run settings: the model, an effort slider, fast mode
 * and the output style. Under the draft sits what you change most, the
 * permission mode (ask before edits, accept edits, plan, auto, bypass), and
 * on the right a ring showing how full the context is; it turns amber as it
 * nears auto-compaction and says so while it compacts. With `target` the row
 * also says where a new session runs: the project, the profile (with its
 * limits, see the profile switcher) and whether it gets its own worktree.
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
  const [model, setModel] = useState(defaultModel ?? models[0] ?? '')
  const [mode, setMode] = useState(defaultPermissionMode)
  const [style, setStyle] = useState('Default')
  const [effort, setEffort] = useState(defaultEffort)
  const [fast, setFast] = useState(defaultFast)
  const percent = Math.round(context * 100)
  const Folder = useIcon('folder')

  return (
    <ShellCard
      className={cn('w-full', className)}
      footer={
        <SizeProvider size="compact">
          <ShellCard.Footer className="flex-wrap justify-start gap-1 px-1 pb-0.5 pt-1">
            {target && (
              <>
                <Select defaultValue="modo">
                  <Select.Trigger icon={Folder} variant="borderless" className="min-w-0" />
                  <Select.Content>
                    {GROUPS.filter(g => g.kind === 'project').map((group, i) => (
                      <Select.Item key={group.label} index={i} value={group.label}>
                        {group.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <ProfileSwitcher defaultValue={defaultProfile} onValueChange={onProfileChange} side="top" />
                <Switch label="Worktree" defaultChecked className="w-auto" />
              </>
            )}
            <PermissionMode value={mode} onChange={setMode} />
            <Tooltip
              content={compacting ? 'Compacting the conversation…' : `Context ${percent}% · compacts at 95%`}
              side="top"
            >
              <span className="ml-auto flex h-7 items-center gap-1.5 px-1.5 text-caption tabular-nums text-muted-foreground">
                {compacting ? 'Compacting…' : `${percent}%`}
                <Meter
                  variant="ring"
                  label="Context used"
                  value={compacting ? 0.3 : context}
                  warnAt={0.8}
                  errorAt={0.95}
                />
              </span>
            </Tooltip>
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
            model={model}
            onModel={setModel}
            effort={effort}
            onEffort={setEffort}
            fast={fast}
            onFast={setFast}
            style={style}
            onStyle={setStyle}
          />
        }
      />
    </ShellCard>
  )
}

export type { ComposerProps }
