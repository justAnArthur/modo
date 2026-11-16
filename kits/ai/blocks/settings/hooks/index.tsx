/*!
 * Local addition: the settings screen's hooks section — each hook's event
 * and matcher, opening into its command, timeout and last run.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Badge from '@justanarthur/modo-ui/components/badge'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { ReactNode } from 'react'
import { useIcon } from '../../../lib/icons'
import { CardCode, Details, Facts, Footer, Group, Mono, Row, Section } from '../../../lib/settings-parts'
import type { Hook } from '../../../lib/types'

const key = (hook: Hook) => `${hook.event}-${hook.command}`

function HookCard({
  hook,
  configDir,
  onRun,
  onEdit,
}: {
  hook: Hook
  configDir: string
  onRun?: () => void
  onEdit?: () => void
}) {
  const Play = useIcon('play')
  const facts: [string, ReactNode][] = [
    ['Event', hook.event],
    ['Matcher', <Mono key="m">{hook.matcher}</Mono>],
    ['Timeout', `${hook.timeout ?? 60} s`],
  ]
  if (hook.lastRun) {
    facts.push([
      'Last run',
      <span key="r" className={cn(hook.lastRun.exit !== 0 && 'text-destructive')}>
        {hook.lastRun.when} · exit {hook.lastRun.exit}
      </span>,
    ])
  }
  return (
    <>
      <CardCode language="bash">{hook.command}</CardCode>
      <Facts items={facts} />
      <Footer source={hook.scope === 'project' ? '.claude/settings.json' : `${configDir}/settings.json`}>
        <Button size="compact" variant="ghost" leadingIcon={Play} onClick={onRun}>
          Run now
        </Button>
        <Button size="compact" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </Footer>
    </>
  )
}

interface HooksProps {
  /** The hooks the scope's settings and the project's list. */
  hooks: Hook[]
  /** The config dir being edited: where user-scoped hooks live. */
  configDir: string
  /** Hook keys (`<event>-<command>`) whose rows start open. Defaults to `[]`. */
  defaultOpen?: string[]
  /** Called when "Add hook" is pressed. */
  onAdd?: () => void
  /** Called when an open hook's "Run now" is pressed. */
  onRun?: (hook: Hook) => void
  /** Called when an open hook's Edit is pressed. */
  onEdit?: (hook: Hook) => void
}

/**
 * The commands the harness runs on session events, before and after tools.
 *
 * A row names the event and matcher over the command, with its scope on the
 * right; a hook whose last run exited non-zero says Failed there. Press a row
 * and it lifts into a card with the command, the timeout, the last run and
 * which settings file it comes from, with Run now and Edit.
 *
 * @example {@include ./examples.mdx}
 */
export default function Hooks({ hooks, configDir, defaultOpen, onAdd, onRun, onEdit }: HooksProps) {
  const Plus = useIcon('plus')
  return (
    <Section
      title="Hooks"
      lead="Commands the harness runs on session events, before and after tools. Project hooks come from the repo's .claude/settings.json."
      actions={
        <Button size="compact" leadingIcon={Plus} onClick={onAdd}>
          Add hook
        </Button>
      }
    >
      <Group title="Hooks" aside={<span className="tabular-nums">{hooks.length}</span>}>
        <Details label="Hooks" defaultOpen={defaultOpen}>
          {hooks.map((hook, i) => (
            <Row
              key={key(hook)}
              value={key(hook)}
              index={i}
              label={`${hook.event} · ${hook.matcher}`}
              caption={<span className="font-mono">{hook.command}</span>}
              meta={
                <>
                  {hook.lastRun && hook.lastRun.exit !== 0 && (
                    <Badge size="compact" variant="dot" color="red">
                      Failed
                    </Badge>
                  )}
                  <span className="text-caption">{hook.scope}</span>
                </>
              }
            >
              <HookCard hook={hook} configDir={configDir} onRun={() => onRun?.(hook)} onEdit={() => onEdit?.(hook)} />
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

export type { HooksProps }

export { Hooks }
