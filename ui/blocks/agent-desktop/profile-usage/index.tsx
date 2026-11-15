/*!
 * Local addition: the agent desktop's usage at a glance — one Sidebar row per
 * profile with its short and long limit as two stacked lines and the
 * tightest share; a press opens a Popover with every limit, its reset time
 * and the profile's config dir.
 */

'use client'

import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Meter from '../../../components/meter'
import Sidebar from '../../../components/navigation/sidebar'
import Popover from '../../../components/overlays/popover'
import { useIcon } from '../../../lib/icon-context'
import { SizeProvider } from '../../../primitives/sizes'
import { PROFILES, type Profile } from '../mock'
import { ProfileTile } from '../profile-switcher'

function tightest(profile: Profile) {
  return Math.max(...profile.limits.map(l => l.value))
}

function UsageRow({ profile, onManage }: { profile: Profile; onManage?: () => void }) {
  const Settings = useIcon('settings')
  const [short, long] = profile.limits
  const top = tightest(profile)

  return (
    <Sidebar.MenuItem>
      <Popover>
        <Popover.Trigger
          render={
            <Sidebar.MenuButton
              aria-label={`${profile.name} usage: ${Math.round(top * 100)}% of its tightest limit`}
              className="pl-8"
            >
              <span aria-hidden="true" className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
                <ProfileTile profile={profile} />
              </span>
              <span className="min-w-0 flex-1 truncate">{profile.name}</span>
              <span aria-hidden="true" className="flex w-14 shrink-0 flex-col gap-0.5">
                {short && <Meter variant="line" label={short.label} value={short.value} />}
                {long && <Meter variant="line" label={long.label} value={long.value} />}
              </span>
              <span className="w-8 shrink-0 text-right text-micro tabular-nums text-muted-foreground">
                {Math.round(top * 100)}%
              </span>
            </Sidebar.MenuButton>
          }
        />
        <Popover.Content side="right" align="end" sideOffset={12} className="w-72 gap-3">
          <div className="flex items-center gap-2">
            <ProfileTile profile={profile} />
            <Popover.Title>{profile.name}</Popover.Title>
            <Badge size="compact" color={profile.provider === 'compatible' ? 'teal' : 'gray'}>
              {profile.plan}
            </Badge>
          </div>
          <Popover.Description className="font-mono">
            {profile.provider === 'compatible' ? profile.baseUrl : profile.configDir}
          </Popover.Description>
          <SizeProvider size="compact">
            <div className="flex flex-col gap-2.5">
              {profile.limits.map(limit => (
                <Meter key={limit.label} label={limit.label} value={limit.value} detail={limit.detail} />
              ))}
            </div>
          </SizeProvider>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="text-caption text-muted-foreground">
              {profile.running} running · {profile.defaultModel}
            </span>
            <Button variant="ghost" size="compact" leadingIcon={Settings} onClick={onManage}>
              Profiles
            </Button>
          </div>
        </Popover.Content>
      </Popover>
    </Sidebar.MenuItem>
  )
}

interface ProfileUsageProps {
  /** The profiles to show. Defaults to the mock jobiflow, work, work-personal and zcode profiles. */
  profiles?: Profile[]
  /** Called by a popover's Profiles button. */
  onManage?: () => void
}

/**
 * How much each profile has left, in the sidebar, at a glance.
 *
 * Sessions of every profile already sit side by side in the sidebar, so it
 * needs no profile switch; what it needs is where there is room. Each row
 * is a profile: its tile and name, two thin lines for its short limit (the
 * 5-hour session) above its long one (the week), and the share of the
 * tightest, so a profile near a limit stands out by its amber or red line
 * rather than by a number to read. Press a row for the details: every
 * limit with its reset time, the config dir or base URL, what runs there.
 *
 * Put it in a `Sidebar.Group` (the session sidebar puts it in its footer).
 *
 * @example {@include ./examples.mdx}
 */
export default function ProfileUsage({ profiles = PROFILES, onManage }: ProfileUsageProps) {
  return (
    <Sidebar.Menu aria-label="Profile usage">
      {profiles.map(profile => (
        <UsageRow key={profile.id} profile={profile} onManage={onManage} />
      ))}
    </Sidebar.Menu>
  )
}

export type { ProfileUsageProps }
