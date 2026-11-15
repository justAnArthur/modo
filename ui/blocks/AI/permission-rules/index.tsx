/*!
 * Local addition: the AI app's permissions settings section — the default
 * permission mode, allow / ask / deny rules with their scope, added inline
 * and moved between groups, and the extra directories the sessions may
 * touch.
 */

'use client'

import { type ReactNode, useState } from 'react'
import Badge, { type BadgeColor } from '../../../components/badge'
import Button from '../../../components/button'
import Input from '../../../components/inputs/input'
import Select from '../../../components/inputs/select'
import List from '../../../components/list'
import { useIcon } from '../../../lib/icon-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { type ConfigScope, SCOPES } from '../config-parts'
import { Group, ON_HOVER, Section } from '../settings/parts'

export type PermissionBehavior = 'allow' | 'ask' | 'deny'

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'

/** One rule: a tool, optionally with a pattern (`Bash(bun run *)`), what it gets, and where it lives. */
export interface PermissionRule {
  rule: string
  behavior: PermissionBehavior
  scope: ConfigScope
}

/** Everything the section edits. */
export interface PermissionSettings {
  mode: PermissionMode
  rules: PermissionRule[]
  /** Paths outside the working directory the sessions may read and edit. */
  directories: string[]
}

const BEHAVIORS: { value: PermissionBehavior; label: string; note: string }[] = [
  { value: 'allow', label: 'Allow', note: 'Runs without asking.' },
  { value: 'ask', label: 'Ask', note: 'Asks every time, even where an allow rule matches.' },
  { value: 'deny', label: 'Deny', note: 'Never runs; deny wins over every other rule.' },
]

const MODES: { value: PermissionMode; label: string; note: string }[] = [
  { value: 'default', label: 'Ask first', note: 'Asks the first time each tool is used.' },
  { value: 'acceptEdits', label: 'Accept edits', note: 'File edits go through; commands still ask.' },
  { value: 'plan', label: 'Plan', note: 'Reads and plans; changes nothing until a plan is approved.' },
  { value: 'bypassPermissions', label: 'Bypass', note: 'Never asks. Only in a sandbox or a container.' },
]

const SCOPE_BADGE: Record<ConfigScope, BadgeColor> = { user: 'gray', project: 'blue', local: 'violet' }

// A tool name (or an MCP server / tool) with an optional pattern in parentheses.
const RULE = /^(?:[A-Z][A-Za-z]*|mcp__[\w-]+(?:__[\w-]+)?)(?:\([^()]+\))?$/

const EMPTY: PermissionSettings = { mode: 'default', rules: [], directories: [] }

function ruleError(rule: string, rules: PermissionRule[]) {
  if (!rule) return undefined
  if (!RULE.test(rule))
    return 'A tool name, optionally with a pattern: Bash(bun run *), Edit(ui/**), WebFetch(domain:github.com).'
  const clash = rules.find(r => r.rule === rule)
  if (clash) return `Already in ${BEHAVIORS.find(b => b.value === clash.behavior)?.label}.`
  return undefined
}

function Picker<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onValueChange: (value: T) => void
  className?: string
}) {
  return (
    <Select
      size="compact"
      value={value}
      onValueChange={next => onValueChange(options.find(o => o.value === next)?.value ?? value)}
    >
      <Select.Trigger variant="borderless" aria-label={label} className={className} />
      <Select.Content>
        {options.map((o, i) => (
          <Select.Item key={o.value} index={i} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

function Line({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <li className="group/row flex h-9 min-w-0 items-center gap-[var(--space-2)] border-b border-border last:border-b-0">
      <span className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]">{children}</span>
      {actions}
    </li>
  )
}

function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  const Trash = useIcon('trash')
  return (
    <Button variant="ghost" size="icon-compact" aria-label={label} className={ON_HOVER} onClick={onPress}>
      <Trash />
    </Button>
  )
}

function AddRule({ rules, onAdd }: { rules: PermissionRule[]; onAdd: (rule: PermissionRule) => void }) {
  const [text, setRule] = useState('')
  const rule = text.trim()
  const [behavior, setBehavior] = useState<PermissionBehavior>('allow')
  const [scope, setScope] = useState<ConfigScope>('project')
  const Plus = useIcon('plus')
  const error = ruleError(rule, rules)
  const add = () => {
    if (!rule || error) return
    onAdd({ rule, behavior, scope })
    setRule('')
  }

  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <Input
          variant="bordered"
          size="compact"
          aria-label="New rule"
          placeholder="Bash(bun run *)"
          className="min-w-48 flex-1 font-mono"
          value={text}
          invalid={Boolean(error)}
          onChange={setRule}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <Picker label="Rule behavior" options={BEHAVIORS} value={behavior} onValueChange={setBehavior} />
        <Picker label="Rule scope" options={SCOPES} value={scope} onValueChange={setScope} />
        <Button size="compact" variant="secondary" leadingIcon={Plus} disabled={!rule || Boolean(error)} onClick={add}>
          Add rule
        </Button>
      </div>
      {error && <span className="text-caption text-destructive">{error}</span>}
    </div>
  )
}

function AddDirectory({ directories, onAdd }: { directories: string[]; onAdd: (path: string) => void }) {
  const [text, setPath] = useState('')
  const path = text.trim()
  const Plus = useIcon('plus')
  const taken = directories.includes(path)
  const add = () => {
    if (!path || taken) return
    onAdd(path)
    setPath('')
  }

  return (
    <div className="flex flex-col gap-[var(--space-1)] pt-[var(--space-2)]">
      <div className="flex items-center gap-[var(--space-2)]">
        <Input
          variant="bordered"
          size="compact"
          aria-label="New directory"
          placeholder="../shared-config"
          className="min-w-0 flex-1 font-mono"
          value={text}
          invalid={taken}
          onChange={setPath}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <Button size="compact" variant="secondary" leadingIcon={Plus} disabled={!path || taken} onClick={add}>
          Add directory
        </Button>
      </div>
      {taken && <span className="text-caption text-destructive">Already listed.</span>}
    </div>
  )
}

interface PermissionRulesProps {
  /** Controlled settings. Pair with `onChange`. */
  value?: PermissionSettings
  /** Initial settings, for an uncontrolled section. Defaults to the default mode, no rules and no directories. */
  defaultValue?: PermissionSettings
  /** Called with the whole settings whenever a rule, the mode or a directory changes. */
  onChange?: (value: PermissionSettings) => void
}

/**
 * What the sessions may do without asking: the default permission mode,
 * rules that allow, ask or deny a tool, and directories beyond the repo.
 *
 * A rule is a tool name, optionally with a pattern: `Bash(bun run *)`,
 * `Edit(ui/**)`, `WebFetch(domain:github.com)`, `mcp__github`. Type one on
 * the add line, pick what it gets and where it lives, and it lands in its
 * group; a malformed rule or one already listed is caught as you type. Each
 * rule's badge names its scope (user, project, local); its picker moves it
 * between Allow, Ask and Deny, and the bin removes it (both shown on hover,
 * always on touch). Deny wins over ask, and ask over allow. Works controlled
 * (`value` + `onChange`) or uncontrolled (`defaultValue`).
 *
 * @example {@include ./examples.mdx}
 */
export default function PermissionRules({ value, defaultValue = EMPTY, onChange }: PermissionRulesProps) {
  const [settings, setSettings] = useControllableState(value, defaultValue, onChange)
  const set = (patch: Partial<PermissionSettings>) => setSettings({ ...settings, ...patch })
  const setRules = (rules: PermissionRule[]) => set({ rules })
  const mode = MODES.find(m => m.value === settings.mode)

  return (
    <Section
      title="Permissions"
      lead="What the sessions may do without asking. Project rules come from the repo's .claude/settings.json, local ones from its git-ignored settings.local.json."
    >
      <List className="-ml-[var(--space-2)]">
        <List.Row label="Default mode" description={mode?.note}>
          <Picker
            label="Default mode"
            options={MODES}
            value={settings.mode}
            onValueChange={next => set({ mode: next })}
          />
        </List.Row>
      </List>

      <AddRule rules={settings.rules} onAdd={rule => setRules([...settings.rules, rule])} />

      {BEHAVIORS.map(behavior => {
        const rules = settings.rules.filter(r => r.behavior === behavior.value)
        return (
          <Group
            key={behavior.value}
            title={`${behavior.label} · ${behavior.note}`}
            aside={<span className="tabular-nums">{rules.length}</span>}
          >
            {rules.length === 0 ? (
              <p className="m-0 py-[var(--space-2)] text-body text-muted-foreground">
                No {behavior.label.toLowerCase()} rules.
              </p>
            ) : (
              <ul aria-label={behavior.label} className="m-0 flex list-none flex-col p-0">
                {rules.map(rule => (
                  <Line
                    key={rule.rule}
                    actions={
                      <>
                        <Picker
                          label={`Move ${rule.rule}`}
                          options={BEHAVIORS}
                          value={rule.behavior}
                          className={ON_HOVER}
                          onValueChange={next =>
                            setRules(settings.rules.map(r => (r === rule ? { ...r, behavior: next } : r)))
                          }
                        />
                        <Remove
                          label={`Remove ${rule.rule}`}
                          onPress={() => setRules(settings.rules.filter(r => r !== rule))}
                        />
                      </>
                    }
                  >
                    <span className="min-w-0 truncate font-mono text-caption text-foreground">{rule.rule}</span>
                    <Badge size="compact" color={SCOPE_BADGE[rule.scope]}>
                      {rule.scope}
                    </Badge>
                  </Line>
                ))}
              </ul>
            )}
          </Group>
        )
      })}

      <Group
        title="Additional directories · read and edited like the repo"
        aside={<span className="tabular-nums">{settings.directories.length}</span>}
      >
        {settings.directories.length > 0 && (
          <ul aria-label="Additional directories" className="m-0 flex list-none flex-col p-0">
            {settings.directories.map(path => (
              <Line
                key={path}
                actions={
                  <Remove
                    label={`Remove ${path}`}
                    onPress={() => set({ directories: settings.directories.filter(d => d !== path) })}
                  />
                }
              >
                <span className="min-w-0 truncate font-mono text-caption text-foreground">{path}</span>
              </Line>
            ))}
          </ul>
        )}
        <AddDirectory
          directories={settings.directories}
          onAdd={path => set({ directories: [...settings.directories, path] })}
        />
      </Group>
    </Section>
  )
}

export type { PermissionRulesProps }
