/*!
 * Local addition: a notch app's settings window. Rebuilt from Just Notch's
 * runtime (`settings/settings.tsx`) as a presentational block: preferences,
 * plugins, permissions and the about rows come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import List, { LIST_SWITCH } from '@justanarthur/modo-ui/components/data-display/list'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { ChevronRight, Info, Puzzle, Settings2, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

type ScreensPreference = 'notched' | 'all'

interface AppPreferences {
  /** Start the app when the user logs in. */
  launchAtLogin: boolean
  /** Where the island shows: on the notched screen only, or on every screen. */
  screens: ScreensPreference
}

interface SettingsPlugin {
  id: string
  name: string
  /** One line on what it adds. */
  description?: string
  /** Its glyph in the Plugins list. */
  icon?: IconComponent
  /** Its settings, on a page of its own under Plugin settings. */
  settings?: ReactNode
}

interface SettingsPermission {
  id: string
  label: string
  /** What the app does with it. */
  description: string
  /** Whether macOS granted it; unset while it's being read. */
  granted?: boolean
}

interface AboutRow {
  label: string
  value: ReactNode
}

interface SettingsWindowProps {
  /** The app's name, over the sidebar. Defaults to `'Notch'`. */
  name?: string
  /** The page shown: `general`, `plugins`, `permissions`, `about` or `plugin:<id>` (controlled). */
  value?: string
  /** The page shown at first (uncontrolled). Defaults to `'general'`. */
  defaultValue?: string
  /** Called with the page a sidebar row opens. */
  onValueChange?: (value: string) => void
  /** The General page's preferences (controlled). */
  preferences?: AppPreferences
  /** The preferences at first (uncontrolled). Defaults to launching at login on the notched screen only. */
  defaultPreferences?: AppPreferences
  /** Called with every preference when one changes. */
  onPreferencesChange?: (preferences: AppPreferences) => void
  /** The installed plugins. Defaults to `[]`. */
  plugins?: SettingsPlugin[]
  /** Which plugins are on, by id (controlled). */
  enabled?: Record<string, boolean>
  /** Which plugins are on at first (uncontrolled). Defaults to every plugin. */
  defaultEnabled?: Record<string, boolean>
  /** Called with every plugin's state when a switch changes one. */
  onEnabledChange?: (enabled: Record<string, boolean>) => void
  /** What macOS lets the app read and control. Defaults to `[]`. */
  permissions?: SettingsPermission[]
  /** Called by Open Settings on a permission that isn't granted. */
  onOpenPermission?: (id: string) => void
  /** The About page's rows: version, mode, screen. Defaults to `[]`. */
  about?: AboutRow[]
  /** Drops the sidebar's inset on the left: its rows run to the window's edge and their text sits only the row's own padding in, so a host can line it up with an edge of its own (the open island's inset). Defaults to `false`. */
  flush?: boolean
  /** Classes for the window's content, which fills its container. */
  className?: string
}

const SCREENS: { value: ScreensPreference; label: string; note: string }[] = [
  { value: 'notched', label: 'Notched screen only', note: 'The built-in display' },
  { value: 'all', label: 'All screens', note: 'A virtual notch on the others' },
]

function Page({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-title weight-semibold text-foreground">{title}</h2>
        {lead && <p className="m-0 text-body text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </section>
  )
}

interface GeneralProps {
  preferences: AppPreferences
  onChange: (preferences: AppPreferences) => void
}

function General({ preferences, onChange }: GeneralProps) {
  return (
    <Page title="General">
      <List>
        <List.Section title="Startup">
          <List.Row label="Launch at login" description="Starts the app when you log in to your Mac.">
            <Switch
              aria-label="Launch at login"
              className={LIST_SWITCH}
              checked={preferences.launchAtLogin}
              onCheckedChange={launchAtLogin => onChange({ ...preferences, launchAtLogin })}
            />
          </List.Row>
        </List.Section>
      </List>
      {/* Laid out as a List.Section, so its heading lines up with Startup's. */}
      <div className="flex flex-col gap-1">
        <span className="pl-2 text-caption text-muted-foreground">Show the island on</span>
        <ChoiceList
          label="Show the island on"
          value={preferences.screens}
          onValueChange={screens => onChange({ ...preferences, screens: screens as ScreensPreference })}
          options={SCREENS.map(screen => ({
            value: screen.value,
            label: screen.label,
            content: (
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span className="truncate">{screen.label}</span>
                <span className="truncate text-caption text-muted-foreground">{screen.note}</span>
              </span>
            ),
          }))}
        />
      </div>
    </Page>
  )
}

interface PluginsProps {
  plugins: SettingsPlugin[]
  enabled: Record<string, boolean>
  onChange: (enabled: Record<string, boolean>) => void
  onOpen: (id: string) => void
}

function Plugins({ plugins, enabled, onChange, onOpen }: PluginsProps) {
  return (
    <Page title="Plugins" lead="Each plugin adds activities and widgets to the island.">
      {plugins.length === 0 ? (
        <p className="m-0 text-body text-muted-foreground">No plugins installed.</p>
      ) : (
        <List>
          <List.Section title="Installed" aside={`${plugins.filter(p => enabled[p.id] ?? true).length} on`}>
            {plugins.map(plugin => {
              const Icon = plugin.icon ?? Puzzle
              return (
                <List.Row
                  key={plugin.id}
                  label={
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{plugin.name}</span>
                    </span>
                  }
                  description={plugin.description}
                >
                  {plugin.settings !== undefined && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${plugin.name} settings`}
                      onClick={() => onOpen(plugin.id)}
                    >
                      <ChevronRight />
                    </Button>
                  )}
                  <Switch
                    aria-label={plugin.name}
                    className={LIST_SWITCH}
                    checked={enabled[plugin.id] ?? true}
                    onCheckedChange={on => onChange({ ...enabled, [plugin.id]: on })}
                  />
                </List.Row>
              )
            })}
          </List.Section>
        </List>
      )}
    </Page>
  )
}

interface PermissionsProps {
  permissions: SettingsPermission[]
  onOpen?: (id: string) => void
}

function Permissions({ permissions, onOpen }: PermissionsProps) {
  return (
    <Page title="Permissions" lead="What macOS lets the app read and control.">
      <List>
        <List.Section title="Privacy & Security">
          {permissions.map(permission => (
            <List.Row
              key={permission.id}
              label={
                <span className="flex min-w-0 items-center gap-2">
                  <StatusDot
                    status={permission.granted === undefined ? 'running' : permission.granted ? 'success' : 'waiting'}
                    label={
                      permission.granted === undefined ? 'Checking' : permission.granted ? 'Granted' : 'Not granted'
                    }
                  />
                  <span className="truncate">{permission.label}</span>
                </span>
              }
              description={permission.description}
            >
              {permission.granted === false ? (
                <Button variant="ghost" size="compact" onClick={() => onOpen?.(permission.id)}>
                  Open Settings
                </Button>
              ) : (
                <span className="pr-3 text-caption text-muted-foreground">
                  {permission.granted ? 'Granted' : 'Checking…'}
                </span>
              )}
            </List.Row>
          ))}
        </List.Section>
      </List>
    </Page>
  )
}

function About({ rows }: { rows: AboutRow[] }) {
  return (
    <Page title="About">
      <List>
        {rows.map(row => (
          <List.Row key={row.label} label={<span className="text-muted-foreground">{row.label}</span>}>
            <span className="min-w-0 truncate pr-3 text-body text-foreground">{row.value}</span>
          </List.Row>
        ))}
      </List>
    </Page>
  )
}

const PAGES: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'general', label: 'General', icon: Settings2 },
  { value: 'plugins', label: 'Plugins', icon: Puzzle },
  { value: 'permissions', label: 'Permissions', icon: ShieldCheck },
  { value: 'about', label: 'About', icon: Info },
]

/**
 * A notch app's settings window: General, Plugins, Permissions and About,
 * and a page for each plugin's own settings.
 *
 * A modo-ui Sidebar pinned open (the window is small, about 760 × 520, so
 * it never folds into a drawer) lists the pages under the app's `name`, then
 * the plugins that bring settings. General holds the launch at login Switch
 * and a ChoiceList of the screens the island shows on. Plugins lists each
 * installed plugin with its glyph, its line, a Switch that turns it on or
 * off and, for one that brings settings, a chevron to its page. Permissions
 * shows what macOS granted as a StatusDot per row, with Open Settings beside
 * one that isn't granted, and a spinner while it's being read. About lists the `about` rows. A plugin's page shows its
 * `settings` node under its name.
 *
 * The page, the preferences and the plugins' states each run both ways
 * (`value`, `preferences`, `enabled` with their `default*` and `on*Change`),
 * so the window works on its own or on a host's store. It fills its
 * container; the window's frame and title bar are the host's. In a frame
 * of the host's own, such as the open island, `flush` drops the sidebar's
 * left inset, so the rows' text sits just the row's padding from the edge.
 *
 * @example {@include ./examples.mdx}
 */
export default function SettingsWindow({
  name = 'Notch',
  value,
  defaultValue = 'general',
  onValueChange,
  preferences: preferencesProp,
  defaultPreferences = { launchAtLogin: true, screens: 'notched' },
  onPreferencesChange,
  plugins = [],
  enabled: enabledProp,
  defaultEnabled = {},
  onEnabledChange,
  permissions = [],
  onOpenPermission,
  about = [],
  flush = false,
  className,
}: SettingsWindowProps) {
  const [page, setPage] = useControllableState(value, defaultValue, onValueChange)
  const [preferences, setPreferences] = useControllableState(preferencesProp, defaultPreferences, onPreferencesChange)
  const [enabled, setEnabled] = useControllableState(enabledProp, defaultEnabled, onEnabledChange)
  const withSettings = plugins.filter(plugin => plugin.settings !== undefined)
  const plugin = withSettings.find(p => `plugin:${p.id}` === page)

  return (
    <Sidebar.Provider
      className={cn('h-full min-h-0', className)}
      persist={false}
      shortcut={null}
      mobileBreakpoint={0}
      width="13rem"
    >
      <Sidebar className="h-full" collapsible="none" value={page} onValueChange={setPage}>
        <Sidebar.Content>
          <Sidebar.Group className={cn(flush && 'pl-0')}>
            <Sidebar.GroupLabel>{name}</Sidebar.GroupLabel>
            <Sidebar.Menu>
              {PAGES.map(item => (
                <Sidebar.MenuItem key={item.value}>
                  <Sidebar.MenuButton icon={item.icon} value={item.value}>
                    {item.label}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
          {withSettings.length > 0 && (
            <Sidebar.Group className={cn(flush && 'pl-0')}>
              <Sidebar.GroupLabel>Plugin settings</Sidebar.GroupLabel>
              <Sidebar.Menu>
                {withSettings.map(p => (
                  <Sidebar.MenuItem key={p.id}>
                    <Sidebar.MenuButton icon={p.icon} value={`plugin:${p.id}`}>
                      {p.name}
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Menu>
            </Sidebar.Group>
          )}
        </Sidebar.Content>
      </Sidebar>
      <Sidebar.Inset className="min-h-0 min-w-0">
        <ScrollArea key={page} className="h-full" viewportClassName="scroll-fade">
          <div className="mx-auto flex w-full max-w-160 flex-col gap-8 p-8">
            {page === 'general' && <General preferences={preferences} onChange={setPreferences} />}
            {page === 'plugins' && (
              <Plugins
                plugins={plugins}
                enabled={enabled}
                onChange={setEnabled}
                onOpen={id => setPage(`plugin:${id}`)}
              />
            )}
            {page === 'permissions' && <Permissions permissions={permissions} onOpen={onOpenPermission} />}
            {page === 'about' && <About rows={about} />}
            {plugin && (
              <Page title={plugin.name} lead={plugin.description}>
                {plugin.settings}
              </Page>
            )}
          </div>
        </ScrollArea>
      </Sidebar.Inset>
    </Sidebar.Provider>
  )
}

export type { AboutRow, AppPreferences, ScreensPreference, SettingsPermission, SettingsPlugin, SettingsWindowProps }
export { SettingsWindow }
