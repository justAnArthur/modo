/*!
 * Local addition: usage concept "pace" — today's row of tiles over lines,
 * each line now carrying a tick where an even spend would be, and colored by
 * whether the limit lasts until its reset, not by its share.
 */

'use client'

import type { Profile } from '../mock'
import { PopoverRow, PopoverSection } from '../popover-rows'
import { ProfileTile } from '../profile-switcher'
import { duration, type LimitPace, paceOf, percent, VERDICT_TEXT } from './pace'
import { PaceBar, UsageFrame } from './parts'

const VERDICT_WORD = { free: 'on pace', watch: 'only just', tight: 'too fast' } as const

/** The session limit and the weekly one that lands highest. */
function glanceLimits(limits: LimitPace[]) {
  const [session, ...weekly] = limits
  const worstWeekly = [...weekly].sort((a, b) => b.projected - a.projected)[0]
  return [session, worstWeekly].filter((pace): pace is LimitPace => pace !== undefined)
}

export default function PaceConcept({ profiles, form }: { profiles: Profile[]; form: 'sidebar' | 'detail' }) {
  const paces = profiles.map(paceOf)

  return (
    <UsageFrame
      form={form}
      label={`Usage pace of ${profiles.length} profiles`}
      glance={
        <span className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]">
          {paces.map(({ profile, limits }) => (
            <span key={profile.id} className="flex min-w-0 max-w-12 flex-1 flex-col items-center gap-[var(--space-1)]">
              <ProfileTile profile={profile} className="size-4" />
              <span className="flex w-full flex-col gap-1">
                {glanceLimits(limits).map(pace => (
                  <PaceBar key={pace.limit.label} pace={pace} />
                ))}
              </span>
            </span>
          ))}
        </span>
      }
      detail={
        <>
          <p className="px-[var(--space-2)] text-caption text-muted-foreground">
            The tick is where an even spend would be by now; a fill past it is spending faster than the window refills.
          </p>
          {paces.map(({ profile, limits, binding }) => (
            <PopoverSection
              key={profile.id}
              title={`${profile.name} · ${profile.plan}`}
              aside={<span className={VERDICT_TEXT[binding.verdict]}>{VERDICT_WORD[binding.verdict]}</span>}
            >
              {limits.map(pace => (
                <PopoverRow key={pace.limit.label} label={pace.limit.label}>
                  <PaceBar pace={pace} className="w-16" />
                  <span className="w-24 pr-[var(--space-3)] text-right text-caption tabular-nums text-muted-foreground">
                    {percent(pace.limit.value)} · {duration(pace.window.resetsInHours)}
                  </span>
                </PopoverRow>
              ))}
            </PopoverSection>
          ))}
        </>
      }
    />
  )
}
