/*!
 * Local addition: the AI app's ⌘K palette on the Command overlay — switch
 * to a session, start one in a project under a profile, run a command or
 * skill, open a pane, a settings section or another profile.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Kbd from '@justanarthur/modo-ui/components/data-display/kbd'
import Command, { type CommandGroup } from '@justanarthur/modo-ui/components/overlays/command'
import type { ReactElement } from 'react'
import { useIcons } from '../../../lib/icons'
import { STATUS_GLYPH } from '../../../lib/status-glyph'
import type { Command as AgentCommand, PaletteItem, PaneId, Profile, Project, Session } from '../../../lib/types'
import { PANES } from '../../panes/side-pane'
import type { SettingsWindowSection } from '../../settings/settings-window'

interface CommandPaletteProps {
  /** The sessions to switch to, most recent first. */
  sessions: Session[]
  /** The folders a new session can start in. */
  projects: Project[]
  /** The profiles a new session can run under, and to switch to. */
  profiles: Profile[]
  /** Slash commands, skills and plugins. */
  commands: AgentCommand[]
  /** Settings sections to open; omitted, one row opens the settings; `[]` drops the Settings group. */
  settings?: SettingsWindowSection[]
  /** The side panes to offer, in the side pane's order; `false` (or `[]`) drops the Panes group. Defaults to every pane. */
  panes?: PaneId[] | false
  /** The active profile's id: new sessions start under it. Defaults to the first profile. */
  profile?: string
  /** The current project's path: "New session as …" starts there. Defaults to the first project. */
  project?: string
  /** Called with the picked row; the palette closes. */
  onSelect?: (item: PaletteItem) => void
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled palette. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the palette opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** The key that toggles it with ⌘ (Ctrl elsewhere); `false` leaves the keyboard alone. Defaults to `'k'`. */
  hotkey?: string | false
  /** Replaces the Search button. `null` draws no trigger: the hotkey and `open` still work. */
  trigger?: ReactElement | null
  /** The trigger's label. Defaults to `'Search'`. */
  label?: string
  /** Classes for the trigger. */
  className?: string
}

/**
 * The AI app's ⌘K palette: one search over sessions, new sessions,
 * commands, panes, settings and profiles.
 *
 * Type to filter every group at once: a session by its title, branch or
 * project; a new session by its project or profile; a command or skill by
 * its name or description. Sessions show their live state (running, waiting
 * on you). New sessions start in each project under the active profile, or
 * under each other profile in the current project. Picking a row hands it to
 * `onSelect` and closes the panel. The panel is Command's: it grows out of
 * the trigger, and ⌘K (Ctrl+K elsewhere) toggles it from anywhere. A group
 * with no rows is left out: an app without side panes passes `panes={false}`,
 * one without a settings window `settings={[]}`.
 *
 * @example {@include ./examples.mdx}
 */
export default function CommandPalette({
  sessions,
  projects,
  profiles,
  commands,
  settings,
  panes,
  profile,
  project,
  onSelect,
  open,
  defaultOpen,
  onOpenChange,
  hotkey = 'k',
  trigger,
  label = 'Search',
  className,
}: CommandPaletteProps) {
  const icons = useIcons()
  const active = profiles.find(p => p.id === profile) ?? profiles[0]
  const here = projects.find(p => p.path === project) ?? projects[0]
  const pick = (item: PaletteItem) => () => onSelect?.(item)
  const kind = (k: AgentCommand['kind']) => (k === 'command' ? icons.command : k === 'skill' ? icons.zap : icons.puzzle)

  const groups: CommandGroup[] = [
    {
      label: 'Sessions',
      items: sessions.map(s => ({
        label: s.title,
        icon: STATUS_GLYPH[s.status] ?? icons['message-circle'],
        shortcut: s.updated,
        keywords: [s.branch ?? '', s.project ?? '', s.profile],
        onSelect: pick({ kind: 'session', id: s.id }),
      })),
    },
    {
      label: 'New',
      items: [
        ...(active
          ? projects.map(p => ({
              label: `New session in ${p.label}`,
              icon: icons.plus,
              shortcut: active.name,
              keywords: [p.path, active.name],
              onSelect: pick({ kind: 'new-session', project: p.path, profile: active.id }),
            }))
          : []),
        ...(here
          ? profiles
              .filter(p => p !== active)
              .map(p => ({
                label: `New ${p.name} session`,
                icon: icons.plus,
                shortcut: here.label,
                keywords: [p.plan, p.account, here.path],
                onSelect: pick({ kind: 'new-session', project: here.path, profile: p.id }),
              }))
          : []),
      ],
    },
    {
      label: 'Commands',
      items: commands
        .filter(c => c.kind === 'command')
        .map(c => ({
          label: c.name,
          icon: kind(c.kind),
          keywords: [c.description],
          onSelect: pick({ kind: 'command', name: c.name }),
        })),
    },
    {
      label: 'Skills',
      items: commands
        .filter(c => c.kind !== 'command')
        .map(c => ({
          label: c.name,
          icon: kind(c.kind),
          keywords: [c.description, c.kind],
          onSelect: pick({ kind: 'command', name: c.name }),
        })),
    },
    {
      label: 'Find',
      items: [
        {
          label: 'Search transcripts',
          icon: icons.search,
          keywords: ['find', 'history', 'messages'],
          onSelect: pick({ kind: 'search' }),
        },
        { label: 'Keyboard shortcuts', icon: icons.command, shortcut: '⌘/', onSelect: pick({ kind: 'shortcuts' }) },
      ],
    },
    {
      label: 'Panes',
      items: (panes === false ? [] : panes ? PANES.filter(p => panes.includes(p.id)) : PANES).map(p => ({
        label: `Open ${p.label.toLowerCase()}`,
        icon: icons[p.icon],
        keywords: ['pane', 'side'],
        onSelect: pick({ kind: 'pane', pane: p.id }),
      })),
    },
    {
      label: 'Settings',
      items: [
        ...(settings?.length === 0
          ? []
          : [{ label: 'Open settings', icon: icons.settings, shortcut: '⌘,', onSelect: pick({ kind: 'settings' }) }]),
        ...(settings ?? []).map(s => ({
          label: `Settings: ${s.label}`,
          icon: icons[s.icon],
          keywords: [s.keywords],
          onSelect: pick({ kind: 'settings', section: s.id }),
        })),
      ],
    },
    {
      label: 'Profiles',
      items: [
        ...profiles.map(p => ({
          label: `Switch to ${p.name}`,
          icon: icons.user,
          shortcut: p.plan,
          keywords: [p.account, p.configDir],
          disabled: p === active,
          onSelect: pick({ kind: 'profile', id: p.id }),
        })),
        { label: 'Manage profiles', icon: icons.users, onSelect: pick({ kind: 'profiles' }) },
      ],
    },
  ]

  return (
    <Command open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} hotkey={hotkey}>
      {trigger !== null && (
        <Command.Trigger
          render={
            trigger ?? (
              <Button
                variant="secondary"
                size="compact"
                leadingIcon={icons.search}
                aria-label={label}
                className={className}
              >
                {/* A narrow window keeps the icon: the label and hotkey need the room the title wants. */}
                <span className="hidden @lg:inline">{label}</span>
                {hotkey && (
                  <Kbd variant="plain" className="ml-3 hidden @lg:inline-flex">
                    {`⌘${hotkey.toUpperCase()}`}
                  </Kbd>
                )}
              </Button>
            )
          }
        />
      )}
      <Command.Content
        label="Command palette"
        placeholder="Search sessions, commands and settings…"
        items={groups.filter(g => g.items.length > 0)}
      />
    </Command>
  )
}

export type { CommandPaletteProps }

export { CommandPalette }
