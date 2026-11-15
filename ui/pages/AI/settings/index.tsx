/*!
 * Local addition: the AI app's settings page — the settings window with
 * every section, on the app's mock data.
 */

import Extensions from '../../../blocks/AI/settings/extensions'
import Hooks from '../../../blocks/AI/settings/hooks'
import McpServers from '../../../blocks/AI/settings/mcp-servers'
import Memory from '../../../blocks/AI/settings/memory'
import Notifications from '../../../blocks/AI/settings/notifications'
import Plugins from '../../../blocks/AI/settings/plugins'
import SettingsWindow from '../../../blocks/AI/settings/settings-window'
import Worktrees from '../../../blocks/AI/settings/worktrees'
import { HOOKS, MCP_SERVERS, MEMORY, PLUGINS, PROFILES, WORKTREES } from '../mock'
import { EXTENSIONS, NOTIFICATIONS, SETTINGS_SECTIONS, WORKTREES_ON_DISK } from '../mock-settings'

type SettingsSection = 'mcp' | 'hooks' | 'plugins' | 'memory' | 'worktrees' | 'notifications' | 'extensions'

function content(section: string, configDir: string) {
  if (section === 'mcp') return <McpServers servers={MCP_SERVERS} configDir={configDir} />
  if (section === 'hooks') return <Hooks hooks={HOOKS} configDir={configDir} />
  if (section === 'plugins') return <Plugins plugins={PLUGINS} />
  if (section === 'memory') return <Memory files={MEMORY} configDir={configDir} />
  if (section === 'worktrees') return <Worktrees worktrees={WORKTREES} onDisk={WORKTREES_ON_DISK} />
  if (section === 'notifications') return <Notifications groups={NOTIFICATIONS} />
  return <Extensions extensions={EXTENSIONS} />
}

interface SettingsProps {
  /** The section that starts open. Defaults to `'mcp'`. */
  section?: SettingsSection
  /** Start with the section list open. Defaults to `true`. */
  sidebar?: boolean
  /** The profile (or `'project'`) whose config dir the scoped sections edit at first. Defaults to `'jobiflow'`. */
  scope?: string
  /** Called when "Profiles" in the sidebar's footer is pressed: profiles have their own page. */
  onOpenProfiles?: () => void
}

/**
 * The app's settings: what the sessions can reach and how the app behaves,
 * per profile where it belongs to one.
 *
 * MCP servers, hooks, skills and plugins and memory live in a config dir,
 * so the picker on top says which one you are editing (a profile's, or the
 * project's `.claude`) and switches it; worktrees, notifications and
 * extensions belong to the app. The search over the section list narrows it
 * by name and by what each section holds ("auth", "sound", "disk").
 * Profiles themselves are their own page, linked from the sidebar's footer.
 *
 * Every section reads the same way: a title, a one-line lead and its actions
 * on the right, then captioned lists with no frames whose text lines up
 * with the title. A row is a label with a caption under it and its state on
 * the right. Toggles are a `Switch.Group`. Rows with more to them open into
 * a card with their config, like the session board's: an MCP server's
 * command or URL, env var names and tools (a failed one shows its error, one
 * needing auth says where it signs in, and both keep their fix at the row's
 * end), a hook's command, timeout and last run, a memory file's contents, a
 * worktree's path and what removing it costs. Removing a merged or stale
 * worktree sits at the end of its row on hover (always shown on touch).
 *
 * The page puts the settings blocks together: the Settings window around MCP
 * servers, Hooks, Plugins, Memory, Worktrees, Notifications and Extensions.
 *
 * @example {@include ./examples.mdx}
 */
export default function Settings({
  section = 'mcp',
  sidebar = true,
  scope = 'jobiflow',
  onOpenProfiles,
}: SettingsProps) {
  return (
    <SettingsWindow
      sections={SETTINGS_SECTIONS}
      profiles={PROFILES}
      defaultSection={section}
      defaultScope={scope}
      sidebar={sidebar}
      onOpenProfiles={onOpenProfiles}
    >
      {content}
    </SettingsWindow>
  )
}

export type { SettingsProps, SettingsSection }
