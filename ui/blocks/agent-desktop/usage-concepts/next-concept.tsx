/*!
 * Local addition: usage concept "next" — the row answers where to put the
 * next session: the profile with the most room until its resets, the others
 * queued behind it by headroom, a dot on any that runs out early.
 */

'use client'

import { cn } from '../../../lib/utils'
import type { Profile } from '../mock'
import { PopoverRow, PopoverSection } from '../popover-rows'
import { ProfileTile } from '../profile-switcher'
import { byHeadroom, percent, VERDICT_FILL } from './pace'
import { PaceBar, UsageFrame } from './parts'

export default function NextConcept({ profiles, form }: { profiles: Profile[]; form: 'sidebar' | 'detail' }) {
  const ranked = byHeadroom(profiles)
  const [best, ...rest] = ranked
  if (!best) return null

  return (
    <UsageFrame
      form={form}
      label={`Next session on ${best.profile.name}, ${percent(best.spare)} spare till reset`}
      glance={
        <span className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]">
          <ProfileTile profile={best.profile} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body text-foreground">{best.profile.name}</span>
            <span className="truncate text-caption text-muted-foreground">{percent(best.spare)} spare till reset</span>
          </span>
          <span className="flex shrink-0 gap-1">
            {rest.map(({ profile, binding }) => (
              <span key={profile.id} className="flex flex-col items-center gap-0.5">
                <ProfileTile profile={profile} className="size-4" />
                <span
                  className={cn('size-1 rounded-full', binding.verdict !== 'free' && VERDICT_FILL[binding.verdict])}
                />
              </span>
            ))}
          </span>
        </span>
      }
      detail={
        <PopoverSection title="Next session" aside={best.profile.name}>
          {ranked.map(({ profile, binding, spare }) => (
            <PopoverRow key={profile.id} label={profile.name} className="gap-[var(--space-2)]">
              <PaceBar pace={binding} project className="w-16" />
              <span className="w-28 pr-[var(--space-3)] text-right text-caption tabular-nums text-muted-foreground">
                {binding.verdict === 'tight' ? 'runs out first' : `${percent(spare)} spare`}
              </span>
            </PopoverRow>
          ))}
          <p className="px-[var(--space-2)] pt-[var(--space-1)] text-caption text-muted-foreground">
            Ranked by what each profile's tightest limit has left at its reset, at the pace so far. The light part of a
            bar is where that pace lands.
          </p>
        </PopoverSection>
      }
    />
  )
}
