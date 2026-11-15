/*!
 * Local addition: the agent desktop's settings window — a Sidebar of
 * sections beside the picked section, scoped to one profile's config dir or
 * to every profile.
 */

'use client'

import { useState } from 'react'
import { PROFILES } from '../../../blocks/agent-desktop/mock'
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

const SECTIONS: { id: SettingsSection; label: string; icon: IconName; scoped: boolean }[] = [
  { id: 'mcp', label: 'MCP servers', icon: 'plug', scoped: true },
  { id: 'hooks', label: 'Hooks', icon: 'webhook', scoped: true },
  { id: 'plugins', label: 'Skills and plugins', icon: 'package', scoped: true },
  { id: 'memory', label: 'Memory', icon: 'book-open', scoped: true },
  { id: 'worktrees', label: 'Worktrees', icon: 'git-fork', scoped: false },
  { id: 'notifications', label: 'Notifications', icon: 'bell', scoped: false },
  { id: 'extensions', label: 'Extensions', icon: 'puzzle', scoped: false },
]

const CONTENT: Record<SettingsSection, () => React.ReactNode> = {
  mcp: () => <McpSection />,
  hooks: () => <HooksSection />,
  plugins: () => <PluginsSection />,
  memory: () => <MemorySection />,
  worktrees: () => <WorktreesSection />,
  notifications: () => <NotificationsSection />,
  extensions: () => <ExtensionsSection />,
}

interface SettingsProps {
  /** The section that starts open. Defaults to `'mcp'`. */
  section?: SettingsSection
  /** Start with the section list open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * The app's settings: what the sessions can reach and how the app behaves,
 * per profile where it belongs to one.
 *
 * MCP servers, hooks, skills and plugins and memory live in a profile's
 * config dir, so the scope picker on top switches whose settings you see;
 * worktrees, notifications and extensions belong to the app. MCP servers
 * show their state (connected, needing auth, failed) with the fix in the
 * row. Worktrees list what each session's checkout costs on disk, with a
 * clean-up for merged and stale ones. Extensions is where your own
 * features live: panes, commands, actions and hooks you built as MCP
 * servers, plugins or skills.
 *
 * @example {@include ./examples.mdx}
 */
export default function Settings({ section = 'mcp', sidebar = true }: SettingsProps) {
  const [current, setCurrent] = useState<SettingsSection>(section)
  const icons = useIcons()
  const Back = useIcon('arrow-left')
  const scoped = SECTIONS.find(s => s.id === current)?.scoped ?? false

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
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={Back}>Back to sessions</Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Group>
              <Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
              <Sidebar.Menu>
                {SECTIONS.map(s => (
                  <Sidebar.MenuItem key={s.id}>
                    <Sidebar.MenuButton value={s.id} icon={icons[s.icon]}>
                      {s.label}
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Menu>
            </Sidebar.Group>
          </Sidebar.Content>
        </Sidebar>
        <Sidebar.Inset className="@container min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">Settings</span>
            {scoped && (
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-caption text-muted-foreground @md:inline">Scope</span>
                <Select defaultValue="jobiflow" size="compact">
                  <Select.Trigger variant="borderless" />
                  <Select.Content>
                    {PROFILES.map((profile, i) => (
                      <Select.Item key={profile.id} index={i} value={profile.id}>
                        {profile.name}
                      </Select.Item>
                    ))}
                    <Select.Item index={PROFILES.length} value="project">
                      This project
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>
            )}
          </header>
          <main className="mx-auto flex w-full max-w-4xl flex-col px-6 pb-8 pt-4 [contain:inline-size]">
            {CONTENT[current]()}
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { SettingsProps, SettingsSection }
