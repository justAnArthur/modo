/*!
 * Local addition: the AI app's profile switcher. A profile is one
 * Claude config dir (its own `claude` process, sign-in and limits) or an
 * Anthropic-compatible provider behind a base URL. The panel is a Popover
 * that grows out of the trigger; the profiles are a ChoiceList (fluid hover, a
 * melting selected background) with each profile's limits as Meters.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Avatar from '@justanarthur/modo-ui/components/data-display/avatar'
import List, { LIST_POPOVER } from '@justanarthur/modo-ui/components/data-display/list'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/systems/sizes'
import { useIcon } from '../../../lib/icons'
import { NO_USAGE, percent } from '../../../lib/pace'
import { RowTrigger } from '../../../lib/row-trigger'
import type { Profile } from '../../../lib/types'

type ProfileTileSize = 'sm' | 'md'

// Literal tables: UnoCSS only generates the classes it can read whole.
const TILE_SIZE: Record<ProfileTileSize, string> = { sm: 'size-4', md: 'size-5' }
const TILE_TONE: Record<Profile['provider'], string> = {
  anthropic: 'bg-foreground text-background',
  compatible: 'bg-accent text-foreground',
}

interface ProfileTileProps {
  /** The profile it stands for: an Anthropic profile is an ink tile, a compatible provider an accent one. */
  profile: Profile
  /** 16px (`sm`) or 20px (`md`). Defaults to `'md'`. */
  size?: ProfileTileSize
  /** Classes for the tile. */
  className?: string
}

/** A profile's letter tile: a square Avatar off the ladder, small enough for a row. */
export function ProfileTile({ profile, size = 'md', className }: ProfileTileProps) {
  return (
    <Avatar shape="square" role="img" aria-label={profile.name} className={cn('shrink-0', TILE_SIZE[size], className)}>
      <Avatar.Fallback className={cn('text-micro-compact weight-semibold', TILE_TONE[profile.provider])}>
        <span aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span>
      </Avatar.Fallback>
    </Avatar>
  )
}

/** Whether any of a profile's limits has been used: before that its meters would be empty tracks. */
const hasUsage = (profile: Profile) => profile.limits.some(l => l.value > 0)

/** The session and weekly limits as two thin lines, or nothing before the profile has used any. */
function UsageLines({ profile }: { profile: Profile }) {
  if (!hasUsage(profile)) return null
  return (
    <span aria-hidden="true" className="flex w-8 shrink-0 flex-col gap-0.5">
      {profile.limits.slice(0, 2).map(limit => (
        <Meter key={limit.label} variant="line" label={limit.label} value={limit.value} />
      ))}
    </span>
  )
}

function ProfileRow({ profile }: { profile: Profile }) {
  const top = hasUsage(profile) ? Math.max(...profile.limits.map(l => l.value)) : undefined
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <ProfileTile profile={profile} />
      <span className="min-w-0 flex-1 truncate text-body text-foreground">{profile.name}</span>
      <span className="shrink-0 text-caption text-muted-foreground">{profile.plan}</span>
      <span className="w-8 shrink-0 text-right text-caption tabular-nums text-muted-foreground">
        {top === undefined ? (
          <>
            <span aria-hidden="true">–</span>
            <span className="sr-only">{NO_USAGE}</span>
          </>
        ) : (
          percent(top)
        )}
      </span>
    </span>
  )
}

interface ProfileSwitcherProps {
  /** The profiles to switch between. */
  profiles: Profile[]
  /** Controlled active profile id. Pair with `onValueChange`. */
  value?: string
  /** Initial active profile id, for an uncontrolled switcher. Defaults to the first profile. */
  defaultValue?: string
  /** Called with the new profile id when another profile is picked. */
  onValueChange?: (value: string) => void
  /** Start with the panel open, as the profiles screen shows it. Defaults to `false`. */
  defaultOpen?: boolean
  /** The trigger: a borderless Select-style trigger with the tile, the name and two thin usage lines (it lines up with Selects in a row), or a Sidebar header row (inside a Sidebar). Defaults to `'button'`. */
  variant?: 'button' | 'sidebar'
  /** Which side of the trigger the panel opens on. Defaults to `'bottom'`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Classes for the trigger. */
  className?: string
}

/**
 * Switches the profile a new session runs under: one row per Claude config
 * dir, plus any Anthropic-compatible provider, each with its plan and how
 * much of its limits is used.
 *
 * Every profile is its own `claude` process with its own `CLAUDE_CONFIG_DIR`
 * (its sign-in, settings, memory and limits), so the switcher shows what
 * the switch costs before you make it: the plan, the config dir or base
 * URL, how many sessions run there, and the session and weekly meters,
 * which turn amber and red as a limit runs out. A profile with no usage yet
 * (`limits: []`, or every limit at 0, before its first turn reports usage)
 * shows no lines on the trigger, a dash for its share and "No usage yet"
 * under Limits, instead of empty tracks. The panel grows out of the
 * trigger; the active profile's background melts to the row you pick, and
 * the arrow keys move the pick.
 *
 * @example {@include ./examples.mdx}
 */
export default function ProfileSwitcher({
  profiles,
  value,
  defaultValue,
  onValueChange,
  defaultOpen = false,
  variant = 'button',
  side = 'bottom',
  className,
}: ProfileSwitcherProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue ?? profiles[0]?.id ?? '', onValueChange)
  const active = profiles.find(p => p.id === current) ?? profiles[0]
  const ChevronsUpDown = useIcon('chevrons-up-down')
  const Plus = useIcon('plus')
  const Settings = useIcon('settings')
  if (!active) return null

  const trigger =
    variant === 'sidebar' ? (
      <Sidebar.MenuButton aria-label={`Profile: ${active.name}`} className={cn('pl-8', className)}>
        <span aria-hidden="true" className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
          <ProfileTile profile={active} />
        </span>
        <span className="min-w-0 truncate text-body weight-semibold text-foreground">{active.name}</span>
        <span className="min-w-0 truncate text-caption text-muted-foreground">{active.plan}</span>
        <ChevronsUpDown size={14} strokeWidth={1.5} className="ml-auto shrink-0 text-muted-foreground" />
      </Sidebar.MenuButton>
    ) : (
      // A borderless Select trigger, so it sits in a row of Selects (project, branch) as one of them.
      <RowTrigger aria-label={`Profile: ${active.name}`} className={className}>
        <ProfileTile profile={active} />
        <span className="min-w-0 truncate">{active.name}</span>
        {/* Its two windows at a glance: the 5-hour session above the week. */}
        <UsageLines profile={active} />
      </RowTrigger>
    )

  const popover = (
    <Popover defaultOpen={defaultOpen}>
      <Popover.Trigger render={trigger} />
      <Popover.Content side={side} align="start" sideOffset={8} className={LIST_POPOVER}>
        <SizeProvider size="default">
          <List.Section title="Profile">
            <ChoiceList
              label="Profiles"
              value={active.id}
              onValueChange={setCurrent}
              options={profiles.map(p => ({ value: p.id, label: p.name, content: <ProfileRow profile={p} /> }))}
            />
          </List.Section>
          <List.Section
            title={`Limits · ${active.name}`}
            aside={active.provider === 'compatible' ? active.baseUrl : active.configDir}
          >
            {!hasUsage(active) && (
              <p className="m-0 px-2 text-caption text-muted-foreground">
                {NO_USAGE}: limits show once a session under this profile reports usage.
              </p>
            )}
            {hasUsage(active) &&
              active.limits.map(limit => (
                <List.Row key={limit.label} label={limit.label}>
                  <Meter variant="line" className="w-16" label={limit.label} value={limit.value} />
                  <span className="w-28 pr-3 text-right text-caption tabular-nums text-muted-foreground">
                    {limit.detail}
                  </span>
                </List.Row>
              ))}
          </List.Section>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="compact" leadingIcon={Plus}>
              Add profile
            </Button>
            <Button variant="ghost" size="compact" leadingIcon={Settings} className="ml-auto">
              Manage
            </Button>
          </div>
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )

  if (variant === 'button') return popover
  return (
    <Sidebar.Menu aria-label="Profile">
      <Sidebar.MenuItem>{popover}</Sidebar.MenuItem>
    </Sidebar.Menu>
  )
}

export type { ProfileSwitcherProps, ProfileTileProps }

export { ProfileSwitcher }
