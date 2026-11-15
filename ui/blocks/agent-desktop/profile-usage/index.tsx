/*!
 * Local addition: the agent desktop's usage at a glance — one Sidebar row
 * with every profile inline as its tile over two thin limit lines; a press
 * opens one Popover with each profile's limits, reset times and runs.
 */

'use client'

import Button from '../../../components/button'
import Meter from '../../../components/meter'
import Sidebar from '../../../components/navigation/sidebar'
import Popover from '../../../components/overlays/popover'
import { useIcon } from '../../../lib/icon-context'
import { SizeProvider } from '../../../primitives/sizes'
import { PROFILES, type Profile } from '../mock'
import { POPOVER_FRAME, PopoverRow, PopoverSection } from '../popover-rows'
import { ProfileTile } from '../profile-switcher'

function tightest(profile: Profile) {
  return Math.max(...profile.limits.map(l => l.value))
}

/** A profile in the row: its tile above its 5-hour and weekly lines. */
function ProfileGlance({ profile }: { profile: Profile }) {
  const [short, long] = profile.limits
  return (
    <span className="flex w-7 shrink-0 flex-col items-center gap-[var(--space-1)]">
      <ProfileTile profile={profile} className="size-4" />
      <span className="flex w-full flex-col gap-0.5">
        {short && <Meter variant="line" label={short.label} value={short.value} />}
        {long && <Meter variant="line" label={long.label} value={long.value} />}
      </span>
    </span>
  )
}

interface ProfileUsageProps {
  /** The profiles to show. Defaults to the mock jobiflow, work, work-personal and zcode profiles. */
  profiles?: Profile[]
  /** Called by the popover's Profiles button. */
  onManage?: () => void
}

/**
 * How much each profile has left, in one sidebar row.
 *
 * Sessions of every profile already sit side by side in the sidebar, so it
 * needs no profile switch, only where there is room. The row shows every
 * profile at once: its tile above two thin lines, the 5-hour session over
 * the week, so a profile near a limit stands out by its amber or red line
 * without a number to read. Press the row for the details: per profile,
 * every limit with its share and reset time, and what runs there.
 *
 * Put it in a Sidebar (the session sidebar puts it in its footer).
 *
 * @example {@include ./examples.mdx}
 */
export default function ProfileUsage({ profiles = PROFILES, onManage }: ProfileUsageProps) {
  const Settings = useIcon('settings')
  const worst = [...profiles].sort((a, b) => tightest(b) - tightest(a))[0]

  return (
    <Sidebar.Menu aria-label="Profile usage">
      <Sidebar.MenuItem>
        <Popover>
          <Popover.Trigger
            render={
              <Sidebar.MenuButton
                size="lg"
                aria-label={
                  worst
                    ? `Usage of ${profiles.length} profiles; tightest: ${worst.name} at ${Math.round(tightest(worst) * 100)}%`
                    : 'Usage'
                }
              >
                <span className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]">
                  {profiles.map(profile => (
                    <ProfileGlance key={profile.id} profile={profile} />
                  ))}
                </span>
              </Sidebar.MenuButton>
            }
          />
          <Popover.Content side="right" align="end" sideOffset={12} className={POPOVER_FRAME}>
            <SizeProvider size="default">
              {profiles.map(profile => (
                <PopoverSection
                  key={profile.id}
                  title={`${profile.name} · ${profile.plan}`}
                  aside={profile.running > 0 ? `${profile.running} running` : undefined}
                >
                  {profile.limits.map(limit => (
                    <PopoverRow key={limit.label} label={limit.label}>
                      <Meter variant="line" className="w-14" label={limit.label} value={limit.value} />
                      <span className="w-28 pr-[var(--space-3)] text-right text-caption tabular-nums text-muted-foreground">
                        {limit.detail}
                      </span>
                    </PopoverRow>
                  ))}
                </PopoverSection>
              ))}
              <div className="flex justify-end">
                <Button variant="ghost" size="compact" leadingIcon={Settings} onClick={onManage}>
                  Profiles
                </Button>
              </div>
            </SizeProvider>
          </Popover.Content>
        </Popover>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  )
}

export type { ProfileUsageProps }
