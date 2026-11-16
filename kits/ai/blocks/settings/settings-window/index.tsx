/*!
 * Local addition: the AI app's settings window — a Sidebar of sections
 * (with a search that narrows them) beside the picked section, with a picker
 * for the config dir the scoped sections edit.
 */

'use client'

import { SidebarSearchField } from '@justanarthur/modo-ui/blocks/sidebar-app'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { type ReactNode, useState } from 'react'
import { type IconName, useIcon, useIcons } from '../../../lib/icons'
import type { Profile } from '../../../lib/types'

export interface SettingsWindowSection {
  id: string
  label: string
  icon: IconName
  /** Lives in a config dir, so the scope picker shows while it is open. */
  scoped: boolean
  /** Words the search matches besides the label. */
  keywords: string
}

const PROJECT = { id: 'project', dir: '.claude' }

interface SettingsWindowProps {
  /** The sections, in sidebar order. */
  sections: SettingsWindowSection[]
  /** The profiles the scope picker offers, before "This project". */
  profiles: Profile[]
  /** The open section's id (controlled). */
  section?: string
  /** The section that starts open. Defaults to the first section. */
  defaultSection?: string
  /** Called when another section is picked. */
  onSectionChange?: (section: string) => void
  /** The profile id (or `'project'`) whose config dir the scoped sections edit (controlled). */
  scope?: string
  /** The scope at first. Defaults to the first profile. */
  defaultScope?: string
  /** Called when another scope is picked. */
  onScopeChange?: (scope: string) => void
  /** Start with the section list open. Defaults to `true`. */
  sidebar?: boolean
  /** Called when "Back to sessions" is pressed. */
  onBack?: () => void
  /** Called when "Profiles" in the sidebar's footer is pressed: profiles have their own page. */
  onOpenProfiles?: () => void
  /** Renders the open section, given its id and the config dir being edited. */
  children: (section: string, configDir: string) => ReactNode
}

/**
 * The app's settings window: a list of sections on the left, the open one
 * on the right.
 *
 * The search over the section list narrows it by name and by what each
 * section holds ("auth", "sound", "disk"). Sections that live in a config dir
 * show a picker in the header that says which one you are editing (a
 * profile's, or the project's `.claude`) and switches it; the others belong
 * to the app and hide it. Profiles themselves are their own page, linked from
 * the sidebar's footer. The content is yours: `children` renders the open
 * section for the config dir in scope.
 *
 * @example {@include ./examples.mdx}
 */
export default function SettingsWindow({
  sections,
  profiles,
  section,
  defaultSection,
  onSectionChange,
  scope,
  defaultScope,
  onScopeChange,
  sidebar = true,
  onBack,
  onOpenProfiles,
  children,
}: SettingsWindowProps) {
  const [current, setCurrent] = useControllableState(section, defaultSection ?? sections[0]?.id ?? '', onSectionChange)
  const [scopeId, setScopeId] = useControllableState(
    scope,
    defaultScope ?? profiles[0]?.id ?? PROJECT.id,
    onScopeChange,
  )
  const [query, setQuery] = useState('')
  const icons = useIcons()
  const Back = useIcon('arrow-left')
  const Users = useIcon('users')
  const Folder = useIcon('folder')
  const scoped = sections.find(s => s.id === current)?.scoped ?? false
  const configDir =
    scopeId === PROJECT.id ? PROJECT.dir : (profiles.find(p => p.id === scopeId)?.configDir ?? PROJECT.dir)
  const needle = query.trim().toLowerCase()
  const shown = sections.filter(s => `${s.label} ${s.keywords}`.toLowerCase().includes(needle))

  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <Sidebar variant="inset" className="h-full" value={current} onValueChange={value => setCurrent(value)}>
          <Sidebar.Header>
            <div className="flex flex-col gap-0.5">
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton icon={Back} onClick={onBack}>
                    Back to sessions
                  </Sidebar.MenuButton>
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
                    {profiles.map((profile, i) => (
                      <Select.Item key={profile.id} index={i} value={profile.id}>
                        {profile.name}
                      </Select.Item>
                    ))}
                    <Select.Separator />
                    <Select.Item index={profiles.length} value={PROJECT.id}>
                      This project
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>
            )}
          </header>
          <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-8 pt-4 [contain:inline-size]">
            {children(current, configDir)}
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { SettingsWindowProps }

export { SettingsWindow }
