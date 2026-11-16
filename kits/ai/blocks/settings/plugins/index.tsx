/*!
 * Local addition: the settings screen's skills and plugins section — two
 * runs of switches, skills and plugins, each with how many are on.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import { useIcon } from '../../../lib/icons'
import { Group, Section, Toggles } from '../../../lib/settings-parts'
import type { Plugin } from '../../../lib/types'

const on = (list: Plugin[]) => `${list.filter(p => p.enabled).length} of ${list.length} on`

interface PluginsProps {
  /** Skills and plugins together; each lands in its run by `kind`. */
  plugins: Plugin[]
  /** Called when "Browse catalog" is pressed. */
  onBrowse?: () => void
  /** Called when a skill's or plugin's switch flips, with its new state. */
  onToggle?: (plugin: Plugin, enabled: boolean) => void
}

/**
 * What the sessions can load: skills, which come into a turn when a task
 * calls for them, and plugins, which bundle commands, skills, hooks and panes.
 *
 * Each is a switch with its description, skills first, then plugins; the
 * caption over each run counts how many are on. Optional panes such as the
 * browser and the iOS simulator come in as plugins.
 *
 * @example {@include ./examples.mdx}
 */
export default function Plugins({ plugins, onBrowse, onToggle }: PluginsProps) {
  const Search = useIcon('search')
  const runs = [
    { title: 'Skills', items: plugins.filter(p => p.kind === 'skill') },
    { title: 'Plugins', items: plugins.filter(p => p.kind === 'plugin') },
  ]
  return (
    <Section
      title="Skills and plugins"
      lead="Skills load into a turn when a task calls for them; plugins bundle commands, skills, hooks and panes."
      actions={
        <Button size="compact" variant="tertiary" leadingIcon={Search} onClick={onBrowse}>
          Browse catalog
        </Button>
      }
    >
      {runs.map(run => (
        <Group key={run.title} title={run.title} aside={<span className="tabular-nums">{on(run.items)}</span>}>
          <Toggles label={run.title}>
            {run.items.map(plugin => (
              <Switch
                key={plugin.name}
                label={plugin.name}
                description={plugin.description}
                defaultChecked={plugin.enabled}
                onCheckedChange={enabled => onToggle?.(plugin, enabled)}
              />
            ))}
          </Toggles>
        </Group>
      ))}
    </Section>
  )
}

export type { PluginsProps }

export { Plugins }
