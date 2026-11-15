/*!
 * Local addition: usage concept "runway" — time instead of share: each
 * profile's line is the time until its next reset, filled as far as its
 * budget lasts at this pace. Full means use it freely; a countdown shows only
 * when one runs out first.
 */

'use client'

import type { Profile } from '../mock'
import { PopoverRow, PopoverSection } from '../popover-rows'
import { ProfileTile } from '../profile-switcher'
import { duration, type LimitPace, paceOf } from './pace'
import { RunwayLine, UsageFrame } from './parts'

function runway(pace: LimitPace) {
  const resets = duration(pace.window.resetsInHours)
  return pace.verdict === 'tight' ? `out ${duration(pace.runsOutInHours)} of ${resets}` : `resets ${resets}`
}

export default function RunwayConcept({ profiles, form }: { profiles: Profile[]; form: 'sidebar' | 'detail' }) {
  const paces = profiles.map(paceOf)
  const short = paces.filter(p => p.binding.verdict === 'tight')

  return (
    <UsageFrame
      form={form}
      label={
        short.length > 0
          ? `Runs out before reset: ${short.map(p => `${p.profile.name} in ${duration(p.binding.runsOutInHours)}`).join(', ')}`
          : 'Every profile lasts until its reset'
      }
      glance={
        <span className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]">
          {paces.map(({ profile, binding }) => (
            <span key={profile.id} className="flex min-w-0 max-w-14 flex-1 flex-col items-center gap-[var(--space-1)]">
              <span className="flex h-4 items-center gap-1">
                <ProfileTile profile={profile} className="size-4" />
                {binding.verdict === 'tight' && (
                  <span className="text-micro-compact tabular-nums text-status-error">
                    {duration(binding.runsOutInHours)}
                  </span>
                )}
              </span>
              <RunwayLine pace={binding} className="w-full" />
            </span>
          ))}
        </span>
      }
      detail={
        <>
          <p className="px-[var(--space-2)] text-caption text-muted-foreground">
            Each line is the time until the limit resets, filled as far as what is left lasts at the pace so far.
          </p>
          {paces.map(({ profile, limits }) => (
            <PopoverSection key={profile.id} title={`${profile.name} · ${profile.plan}`}>
              {limits.map(pace => (
                <PopoverRow key={pace.limit.label} label={pace.limit.label}>
                  <RunwayLine pace={pace} className="w-14" />
                  <span className="w-28 whitespace-nowrap pr-[var(--space-3)] text-right text-caption tabular-nums text-muted-foreground">
                    {runway(pace)}
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
