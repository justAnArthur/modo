/*!
 * Local addition: the settings screen's notifications section — captioned
 * runs of switches for what the app tells you and how.
 */

'use client'

import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import { Group, Section, Toggles } from '../../../lib/settings-parts'

export interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
}

export interface NotificationGroup {
  title: string
  settings: NotificationSetting[]
}

interface NotificationsProps {
  /** Captioned runs of settings, in order ("Notify me when", "Behavior"). */
  groups: NotificationGroup[]
  /** Called when a setting's switch flips, with its id and new state. */
  onChange?: (id: string, enabled: boolean) => void
}

/**
 * How the app gets your attention while sessions run in the background.
 *
 * Each run is a captioned list of switches with a description under each
 * label: what to be told about (input needed, a turn finished, CI changed)
 * and how (a sound, keeping the Mac awake).
 *
 * @example {@include ./examples.mdx}
 */
export default function Notifications({ groups, onChange }: NotificationsProps) {
  return (
    <Section title="Notifications" lead="How the app gets your attention while sessions run in the background.">
      {groups.map(group => (
        <Group key={group.title} title={group.title}>
          <Toggles label={group.title}>
            {group.settings.map(setting => (
              <Switch
                key={setting.id}
                label={setting.label}
                description={setting.description}
                defaultChecked={setting.enabled}
                onCheckedChange={enabled => onChange?.(setting.id, enabled)}
              />
            ))}
          </Toggles>
        </Group>
      ))}
    </Section>
  )
}

export type { NotificationsProps }

export { Notifications }
