/*!
 * Local addition: the settings screen's extensions section — your own
 * panes, commands, actions and hooks, each a switch.
 */

'use client'

import Button from '../../../../components/button'
import Switch from '../../../../components/inputs/switch'
import { useIcon } from '../../../../lib/icon-context'
import { Group, Section, Toggles } from '../parts'

export interface Extension {
  name: string
  /** What it adds: a pane, a command, an action, a hook. */
  kind: string
  /** What it is built as and ships in: an MCP server, a plugin, a settings file. */
  source: string
  description: string
  enabled: boolean
}

interface ExtensionsProps {
  /** The installed extensions. */
  extensions: Extension[]
  /** Called when "New extension" is pressed. */
  onNew?: () => void
  /** Called when an extension's switch flips, with its new state. */
  onToggle?: (extension: Extension, enabled: boolean) => void
}

/**
 * Your own features in the app: panes, commands, actions and hooks.
 *
 * They are built as MCP servers, plugins, skills and hooks, so they work in
 * the CLI too. Each is a switch whose description says what kind it is, what
 * it does and where it comes from.
 *
 * @example {@include ./examples.mdx}
 */
export default function Extensions({ extensions, onNew, onToggle }: ExtensionsProps) {
  const Plus = useIcon('plus')
  return (
    <Section
      title="Extensions"
      lead="Your own features: panes, commands, actions and hooks, built as MCP servers, plugins, skills and hooks, so they work in the CLI too."
      actions={
        <Button size="compact" leadingIcon={Plus} onClick={onNew}>
          New extension
        </Button>
      }
    >
      <Group title="Installed" aside={<span className="tabular-nums">{extensions.length}</span>}>
        <Toggles label="Extensions">
          {extensions.map(extension => (
            <Switch
              key={extension.name}
              label={extension.name}
              description={`${extension.kind} · ${extension.description} · from ${extension.source}`}
              defaultChecked={extension.enabled}
              onCheckedChange={enabled => onToggle?.(extension, enabled)}
            />
          ))}
        </Toggles>
      </Group>
    </Section>
  )
}

export type { ExtensionsProps }
