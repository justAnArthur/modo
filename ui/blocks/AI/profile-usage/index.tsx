/*!
 * Local addition: the AI app's usage at a glance, read against time.
 * One Sidebar row lists every profile by name with its session limit and its
 * tightest weekly limit as pace bars (the share colored by whether it lasts
 * until its reset, a tick where an even spend would be); a press opens one
 * Popover with every limit, its pace and its reset.
 */

'use client'

import Button from '../../../components/button'
import List, { LIST_POPOVER } from '../../../components/list'
import Sidebar from '../../../components/navigation/sidebar'
import Popover from '../../../components/overlays/popover'
import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import { duration, type LimitPace, paceOf, percent, VERDICT_TEXT } from '../pace'
import { PaceBar } from '../pace-bar'
import type { Profile } from '../types'

const VERDICT_WORD = { free: 'on pace', watch: 'only just', tight: 'too fast' } as const

/** The session limit and the weekly one that lands highest. */
function glanceLimits(limits: LimitPace[]) {
  const [session, ...weekly] = limits
  const worstWeekly = [...weekly].sort((a, b) => b.projected - a.projected)[0]
  return [session, worstWeekly].filter((pace): pace is LimitPace => pace !== undefined)
}

interface ProfileUsageProps {
  /** The profiles to show. */
  profiles: Profile[]
  /** Called by the popover's Profiles button. */
  onManage?: () => void
}

/**
 * How much each profile has left, read against the time until each limit
 * resets, in one sidebar row.
 *
 * A share alone raises the wrong alarm: 78% of a weekly limit that resets
 * tomorrow is room to spend, while 42% of a session an hour in is not. So
 * every bar is colored by whether its limit lasts until its reset at the
 * current pace (grey when it does, amber when only just, red when it runs
 * out first), and carries a tick where an even spend would be by now: a
 * fill past the tick is spending faster than the window refills. The row
 * lists every profile by name with its session limit over its tightest
 * weekly one; press it for every limit with its share and time to reset.
 *
 * Put it in a Sidebar (the session sidebar puts it in its footer).
 *
 * @example {@include ./examples.mdx}
 */
export default function ProfileUsage({ profiles, onManage }: ProfileUsageProps) {
  const Settings = useIcon('settings')
  const paces = profiles.map(paceOf)

  return (
    <Sidebar.Menu aria-label="Profile usage">
      <Sidebar.MenuItem>
        <Popover>
          <Popover.Trigger
            render={
              <Sidebar.MenuButton
                aria-label={`Usage pace of ${profiles.length} profiles`}
                className="h-auto py-[var(--space-2)]"
              >
                <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-x-[var(--space-2)] gap-y-[var(--space-2)]">
                  {paces.map(({ profile, limits, binding }) => (
                    <span key={profile.id} className="contents">
                      <span
                        className={cn(
                          'truncate text-caption',
                          binding.verdict === 'free' ? 'text-foreground' : VERDICT_TEXT[binding.verdict],
                        )}
                      >
                        {profile.name}
                      </span>
                      <span className="flex flex-col gap-1">
                        {glanceLimits(limits).map(pace => (
                          <PaceBar key={pace.limit.label} pace={pace} />
                        ))}
                      </span>
                    </span>
                  ))}
                </span>
              </Sidebar.MenuButton>
            }
          />
          <Popover.Content side="right" align="end" sideOffset={12} className={LIST_POPOVER}>
            <SizeProvider size="default">
              <p className="m-0 px-[var(--space-2)] text-caption text-muted-foreground">
                The tick is where an even spend would be by now; a fill past it spends faster than the window refills.
              </p>
              {paces.map(({ profile, limits, binding }) => (
                <List.Section
                  key={profile.id}
                  title={`${profile.name} · ${profile.plan}`}
                  aside={<span className={VERDICT_TEXT[binding.verdict]}>{VERDICT_WORD[binding.verdict]}</span>}
                >
                  {limits.map(pace => (
                    <List.Row key={pace.limit.label} label={pace.limit.label}>
                      <PaceBar pace={pace} className="w-16" />
                      <span className="w-24 pr-[var(--space-3)] text-right text-caption tabular-nums text-muted-foreground">
                        {percent(pace.limit.value)} · {duration(pace.limit.resetsInHours)}
                      </span>
                    </List.Row>
                  ))}
                </List.Section>
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
