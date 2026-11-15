/*!
 * Local addition: the agent desktop's profile switcher. A profile is one
 * Claude config dir (its own `claude` process, sign-in and limits) or an
 * Anthropic-compatible provider behind a base URL. The panel is a Popover
 * that grows out of the trigger; the profiles are a PickList (fluid hover, a
 * melting selected background) with each profile's limits as Meters.
 */

'use client'

import Badge from '../../../components/badge'
import Button from '../../../components/button'
import { triggerVariants } from '../../../components/inputs/select'
import Meter from '../../../components/meter'
import Sidebar from '../../../components/navigation/sidebar'
import Popover from '../../../components/overlays/popover'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { PROFILES, type Profile } from '../mock'
import { PickList } from '../pick-list'

interface ProfileTileProps {
  /** The profile it stands for: an Anthropic profile is an ink tile, a compatible provider an accent one. */
  profile: Profile
  /** Classes for the tile. */
  className?: string
}

/** A profile's 20px letter tile. */
export function ProfileTile({ profile, className }: ProfileTileProps) {
  const shape = useShape()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center text-micro-compact weight-semibold',
        profile.provider === 'compatible' ? 'bg-accent text-foreground' : 'bg-foreground text-background',
        shape.bgRadius >= 20 ? 'rounded-full' : 'rounded-md',
        className,
      )}
    >
      {profile.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function ProfileRow({ profile }: { profile: Profile }) {
  return (
    <span className="flex min-w-0 flex-1 gap-2">
      <ProfileTile profile={profile} className="mt-px" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-body weight-medium text-foreground">{profile.name}</span>
            <Badge size="compact" color={profile.provider === 'compatible' ? 'teal' : 'gray'}>
              {profile.plan}
            </Badge>
            {profile.running > 0 && (
              <span className="ml-auto shrink-0 text-caption text-muted-foreground">{profile.running} running</span>
            )}
          </span>
          <span className="truncate font-mono text-caption text-muted-foreground">
            {profile.provider === 'compatible' ? profile.baseUrl : profile.configDir}
          </span>
        </span>
        <SizeProvider size="compact">
          <span className="flex flex-col gap-1.5">
            {profile.limits.slice(0, 2).map(limit => (
              <Meter key={limit.label} label={limit.label} value={limit.value} detail={limit.detail} />
            ))}
          </span>
        </SizeProvider>
      </span>
    </span>
  )
}

interface ProfileSwitcherProps {
  /** The profiles to switch between. Defaults to the mock jobiflow, work, work-personal and zcode profiles. */
  profiles?: Profile[]
  /** Controlled active profile id. Pair with `onValueChange`. */
  value?: string
  /** Initial active profile id, for an uncontrolled switcher. Defaults to the first profile. */
  defaultValue?: string
  /** Called with the new profile id when another profile is picked. */
  onValueChange?: (value: string) => void
  /** Start with the panel open, as the profiles screen shows it. Defaults to `false`. */
  defaultOpen?: boolean
  /** The trigger: a borderless Select-style trigger with the tile and name (it lines up with Selects in a row), or a Sidebar header row (inside a Sidebar). Defaults to `'button'`. */
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
 * which turn amber and red as a limit runs out. The panel grows out of the
 * trigger; the active profile's background melts to the row you pick, and
 * the arrow keys move the pick.
 *
 * @example {@include ./examples.mdx}
 */
export default function ProfileSwitcher({
  profiles = PROFILES,
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
  const ChevronDown = useIcon('chevron-down')
  const size = useSize()
  const shape = useShape()
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
      // Drawn as a borderless Select trigger, so it sits in a row of Selects (project, branch) as one of them.
      <button
        type="button"
        aria-label={`Profile: ${active.name}`}
        className={cn(
          triggerVariants({ variant: 'borderless' }),
          size.control,
          size.text,
          size.px,
          size.gap,
          shape.input,
          className,
        )}
      >
        <ProfileTile profile={active} />
        <span className="min-w-0 truncate">{active.name}</span>
        <ChevronDown
          size={size.icon}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground transition-[color] duration-fast group-hover:text-foreground"
        />
      </button>
    )

  const popover = (
    <Popover defaultOpen={defaultOpen}>
      <Popover.Trigger render={trigger} />
      <Popover.Content side={side} align="start" sideOffset={8} className="w-80 gap-3 p-2">
        <div className="flex flex-col gap-0.5 px-2 pt-2">
          <Popover.Title>Profiles</Popover.Title>
          <Popover.Description>Each runs its own claude with its own config dir and limits.</Popover.Description>
        </div>
        <PickList
          label="Profiles"
          value={active.id}
          onValueChange={setCurrent}
          options={profiles.map(p => ({ value: p.id, label: p.name, content: <ProfileRow profile={p} /> }))}
        />
        <div className="flex items-center gap-1 border-t border-border pt-2">
          <Button variant="ghost" size="compact" leadingIcon={Plus}>
            Add profile
          </Button>
          <Button variant="ghost" size="compact" leadingIcon={Settings} className="ml-auto">
            Manage
          </Button>
        </div>
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
