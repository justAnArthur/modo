/*!
 * Local addition: the agent desktop's settings window — a Sidebar of
 * sections (with a search that narrows them) beside the picked section,
 * scoped to one profile's config dir or to the project's.
 */

'use client'

import { useState } from 'react'
import { PROFILES } from '../../../blocks/agent-desktop/mock'
import { SidebarSearchField } from '../../../blocks/sidebar-app/search-field'
import Select from '../../../components/inputs/select'
import Sidebar from '../../../components/navigation/sidebar'
import { type IconName, useIcon, useIcons } from '../../../lib/icon-context'
import {
  ExtensionsSection,
  HooksSection,
  McpSection,
  MemorySection,
  NotificationsSection,
  PluginsSection,
  WorktreesSection,
} from './sections'

type SettingsSection = 'mcp' | 'hooks' | 'plugins' | 'memory' | 'worktrees' | 'notifications' | 'extensions'

const SECTIONS: { id: SettingsSection; label: string; icon: IconName; scoped: boolean; keywords: string }[] = [
  { id: 'mcp', label: 'MCP servers', icon: 'plug', scoped: true, keywords: 'tools auth authenticate env url' },
  { id: 'hooks', label: 'Hooks', icon: 'webhook', scoped: true, keywords: 'events commands pretooluse stop' },
  { id: 'plugins', label: 'Skills and plugins', icon: 'package', scoped: true, keywords: 'catalog browser simulator' },
  { id: 'memory', label: 'Memory', icon: 'book-open', scoped: true, keywords: 'auto memory.md remember' },
  { id: 'worktrees', label: 'Worktrees', icon: 'git-fork', scoped: false, keywords: 'disk clean up branches' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', scoped: false, keywords: 'sound awake alerts ci' },
  { id: 'extensions', label: 'Extensions', icon: 'puzzle', scoped: false, keywords: 'panes commands actions' },
]

const SCOPES = [
  ...PROFILES.map(p => ({ id: p.id, label: p.name, dir: p.configDir })),
  { id: 'project', label: 'This project', dir: '.claude' },
]

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
 * @example {@include ./examples.mdx}
 */
export default function Settings({
  section = 'mcp',
  sidebar = true,
  scope = 'jobiflow',
  onOpenProfiles,
}: SettingsProps) {
  const [current, setCurrent] = useState<SettingsSection>(section)
  const [scopeId, setScopeId] = useState(scope)
  const [query, setQuery] = useState('')
  const icons = useIcons()
  const Back = useIcon('arrow-left')
  const Users = useIcon('users')
  const Folder = useIcon('folder')
  const scoped = SECTIONS.find(s => s.id === current)?.scoped ?? false
  const configDir = SCOPES.find(s => s.id === scopeId)?.dir ?? '.claude'
  const needle = query.trim().toLowerCase()
  const shown = SECTIONS.filter(s => `${s.label} ${s.keywords}`.toLowerCase().includes(needle))

  const content: Record<SettingsSection, () => React.ReactNode> = {
    mcp: () => <McpSection configDir={configDir} />,
    hooks: () => <HooksSection configDir={configDir} />,
    plugins: () => <PluginsSection />,
    memory: () => <MemorySection configDir={configDir} />,
    worktrees: () => <WorktreesSection />,
    notifications: () => <NotificationsSection />,
    extensions: () => <ExtensionsSection />,
  }

  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <Sidebar
          variant="inset"
          className="h-full"
          value={current}
          onValueChange={value => setCurrent(value as SettingsSection)}
        >
          <Sidebar.Header>
            <div className="flex flex-col gap-0.5">
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton icon={Back}>Back to sessions</Sidebar.MenuButton>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
              <SidebarSearchField
                placeholder="Search settings"
                shortcut={null}
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </div>
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Group>
              <Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
              {shown.length > 0 ? (
                <Sidebar.Menu>
                  {shown.map(s => (
                    <Sidebar.MenuItem key={s.id}>
                      <Sidebar.MenuButton value={s.id} icon={icons[s.icon]}>
                        {s.label}
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                  ))}
                </Sidebar.Menu>
              ) : (
                <p className="m-0 px-2 text-caption text-muted-foreground">No settings match “{query.trim()}”</p>
              )}
            </Sidebar.Group>
          </Sidebar.Content>
          <Sidebar.Footer>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={Users} onClick={onOpenProfiles}>
                  Profiles
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Footer>
        </Sidebar>
        <Sidebar.Inset className="@container min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">Settings</span>
            {scoped && (
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <span className="hidden min-w-0 truncate text-caption text-muted-foreground @2xl:inline">
                  Editing <span className="font-mono">{configDir}</span>
                </span>
                <Select value={scopeId} onValueChange={setScopeId} size="compact">
                  <Select.Trigger variant="borderless" icon={Folder} aria-label="Config dir" />
                  <Select.Content>
                    <Select.Label>Profiles</Select.Label>
                    {PROFILES.map((profile, i) => (
                      <Select.Item key={profile.id} index={i} value={profile.id}>
                        {profile.name}
                      </Select.Item>
                    ))}
                    <Select.Separator />
                    <Select.Item index={PROFILES.length} value="project">
                      This project
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>
            )}
          </header>
          <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-8 pt-4 [contain:inline-size]">
            {content[current]()}
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { SettingsProps, SettingsSection }
