/*
 * Local addition: the agent desktop's composer. InputMessage for the draft
 * (attachments, queue, send and stop), with the session's controls around
 * it: attach, @-file and the slash palette (commands, skills, plugins) in its
 * left slot, the model in its right, and a compact row under it with the
 * permission mode, output style, effort, fast mode and the context meter.
 * Every menu is a Dropdown that grows out of its button.
 */

import { useState } from 'react'
import InputMessage from '../../../components/AI/input-message'
import Button from '../../../components/button'
import Meter from '../../../components/meter'
import Dropdown from '../../../components/overlays/dropdown'
import Tooltip from '../../../components/overlays/tooltip'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { CHANGES, COMMANDS, EFFORTS, MODELS, OUTPUT_STYLES, PERMISSION_MODES } from '../mock'

const MODE_ICON: Record<string, IconName> = {
  'Ask before edits': 'shield-check',
  'Accept edits': 'pen-line',
  'Plan mode': 'list-checks',
  Auto: 'zap',
  'Bypass permissions': 'triangle-alert',
}

interface PickerProps {
  label: string
  icon?: IconName
  options: string[]
  value: string
  onChange: (value: string) => void
  /** Show only the icon in the trigger. */
  iconOnly?: boolean
  side?: 'top' | 'bottom'
}

/** A ghost button whose Dropdown picks one of `options`. */
function Picker({ label, icon, options, value, onChange, iconOnly = false, side = 'top' }: PickerProps) {
  const Icon = useIcon(icon ?? 'chevron-down')
  const Chevron = useIcon('chevron-down')
  return (
    <Dropdown.Menu>
      <Dropdown.Trigger
        render={
          iconOnly ? (
            <Button variant="ghost" size="icon-compact" aria-label={`${label}: ${value}`}>
              <Icon />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="compact"
              leadingIcon={icon ? Icon : undefined}
              trailingIcon={Chevron}
              aria-label={`${label}: ${value}`}
            >
              {value}
            </Button>
          )
        }
      />
      <Dropdown.Content
        side={side}
        align="start"
        checkedIndex={options.indexOf(value)}
        onCheckedIndexChange={i => i !== undefined && onChange(options[i] ?? value)}
      >
        <Dropdown.Label>{label}</Dropdown.Label>
        {options.map((option, i) => (
          <Dropdown.Item key={option} index={i} label={option} />
        ))}
      </Dropdown.Content>
    </Dropdown.Menu>
  )
}

function SlashPalette() {
  const Command = useIcon('command')
  const groups = [
    { label: 'Commands', kind: 'command' },
    { label: 'Skills', kind: 'skill' },
    { label: 'Plugins', kind: 'plugin' },
  ] as const
  let index = 0
  return (
    <Dropdown.Menu>
      <Dropdown.Trigger
        render={
          <Button variant="ghost" size="icon-compact" aria-label="Commands and skills">
            <Command />
          </Button>
        }
      />
      <Dropdown.Content side="top" align="start" className="w-64">
        <Dropdown.Search filter placeholder="Search commands and skills" />
        {groups.map(group => (
          <div key={group.kind} className="contents">
            <Dropdown.Label>{group.label}</Dropdown.Label>
            {COMMANDS.filter(c => c.kind === group.kind).map(c => (
              <Dropdown.Item key={c.name} index={index++} label={c.name} />
            ))}
          </div>
        ))}
        <Dropdown.Empty>No commands found</Dropdown.Empty>
      </Dropdown.Content>
    </Dropdown.Menu>
  )
}

function FilePalette() {
  const At = useIcon('at-sign')
  const File = useIcon('file-text')
  const files = [...CHANGES.map(c => c.path), 'ui/DESIGN.md', 'ui/AGENTS.md', 'lib/src/runtime/routes.tsx']
  return (
    <Dropdown.Menu>
      <Dropdown.Trigger
        render={
          <Button variant="ghost" size="icon-compact" aria-label="Mention a file">
            <At />
          </Button>
        }
      />
      <Dropdown.Content side="top" align="start" className="w-80">
        <Dropdown.Search filter placeholder="Search files" />
        {files.map((path, i) => (
          <Dropdown.Item key={path} index={i} icon={File} label={path} />
        ))}
        <Dropdown.Empty>No files found</Dropdown.Empty>
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
  /** The draft's placeholder. Defaults to `'Ask, or type / for commands'`. */
  placeholder?: string
  /** Called with the text when a message is sent. */
  onSend?: (text: string) => void
  /** Classes for the root. */
  className?: string
}

/**
 * Where you write to the session, with every per-session control in reach.
 *
 * The draft grows as you type, takes dropped files and pasted text, and
 * queues messages while a reply streams (see InputMessage). Its left slot
 * attaches files, mentions one with @ and opens the slash palette, where
 * commands, skills and plugins are one searchable list. The model sits in
 * its right slot. The row under it sets how the agent works: the permission
 * mode (ask before edits, accept edits, plan, auto, bypass), the output
 * style, the effort and fast mode; on the right, a ring shows how full the
 * context is and turns amber as it nears auto-compaction, which it reports
 * while it runs. Each menu grows out of its button.
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
  placeholder = 'Ask, or type / for commands',
  onSend,
  className,
}: ComposerProps) {
  const [model, setModel] = useState(defaultModel ?? models[0] ?? '')
  const [mode, setMode] = useState(defaultPermissionMode)
  const [style, setStyle] = useState('Default')
  const [effort, setEffort] = useState(defaultEffort)
  const [fast, setFast] = useControllableState<boolean>(undefined, defaultFast)
  const Paperclip = useIcon('paperclip')
  const Zap = useIcon('zap')

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <InputMessage
        placeholder={placeholder}
        defaultStatus={streaming ? 'streaming' : 'idle'}
        defaultFiles={[]}
        onSend={text => onSend?.(text)}
        leftSlot={({ openFilePicker }) => (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-compact" aria-label="Attach files" onClick={() => openFilePicker()}>
              <Paperclip />
            </Button>
            <FilePalette />
            <SlashPalette />
          </div>
        )}
        rightSlot={<Picker label="Model" options={models} value={model} onChange={setModel} />}
      />
      <SizeProvider size="compact">
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 px-1">
          <Picker
            label="Permission mode"
            icon={MODE_ICON[mode] ?? 'shield-check'}
            options={PERMISSION_MODES}
            value={mode}
            onChange={setMode}
          />
          <Picker
            label="Output style"
            icon="pen-line"
            options={OUTPUT_STYLES}
            value={style}
            onChange={setStyle}
            iconOnly
          />
          <Picker label="Effort" icon="gauge" options={EFFORTS} value={effort} onChange={setEffort} />
          <Tooltip content={fast ? 'Fast mode on' : 'Fast mode off'} side="top">
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label="Fast mode"
              aria-pressed={fast}
              active={fast}
              onClick={() => setFast(!fast)}
            >
              <Zap />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              compacting ? 'Compacting the conversation…' : `Context ${Math.round(context * 100)}% · compacts at 95%`
            }
            side="top"
          >
            <span className="ml-auto flex h-7 items-center gap-1.5 px-1.5 text-caption tabular-nums text-muted-foreground">
              {compacting ? 'Compacting…' : `${Math.round(context * 100)}%`}
              <Meter
                variant="ring"
                label="Context used"
                value={compacting ? 0.3 : context}
                warnAt={0.8}
                errorAt={0.95}
              />
            </span>
          </Tooltip>
        </div>
      </SizeProvider>
    </div>
  )
}

export type { ComposerProps }
