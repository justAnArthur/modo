/*!
 * Local addition: usage concept "words" — no bars at all: the one thing worth
 * knowing in a sentence ("work: session out in 17m"), everything else folded
 * into "fine till reset", and per limit a plain line on what is left.
 */

'use client'

import { cn } from '../../../lib/utils'
import type { Profile } from '../mock'
import { PopoverSection } from '../popover-rows'
import { ProfileTile } from '../profile-switcher'
import { duration, type LimitPace, paceOf, percent, VERDICT_TEXT } from './pace'
import { UsageFrame } from './parts'

function sentence(pace: LimitPace) {
  const left = `${percent(1 - pace.limit.value)} left`
  const resets = `resets in ${duration(pace.window.resetsInHours)}`
  if (pace.verdict === 'tight') return `${left}, out in ${duration(pace.runsOutInHours)} at this pace; ${resets}`
  if (pace.verdict === 'watch') return `${left}, only just lasts at this pace; ${resets}`
  return `${left}, ${resets}: use it freely`
}

function headline(pace: LimitPace) {
  const what = pace.limit.label.replace(/ \(.*\)$/, '').toLowerCase()
  return pace.verdict === 'tight' ? `${what} out in ${duration(pace.runsOutInHours)}` : `${what} only just lasts`
}

export default function WordsConcept({ profiles, form }: { profiles: Profile[]; form: 'sidebar' | 'detail' }) {
  const paces = profiles.map(paceOf)
  const concerns = paces
    .filter(p => p.binding.verdict !== 'free')
    .sort((a, b) => a.binding.runsOutInHours - b.binding.runsOutInHours || b.binding.projected - a.binding.projected)
  const first = concerns[0]
  const calm = paces.filter(p => p !== first)

  return (
    <UsageFrame
      form={form}
      label={first ? `${first.profile.name}: ${headline(first.binding)}` : 'All profiles fine till reset'}
      rowClassName="h-auto py-[var(--space-2)]"
      glance={
        <span className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
          {first && (
            <span className="flex min-w-0 items-center gap-[var(--space-2)] text-body">
              <ProfileTile profile={first.profile} className="size-4" />
              <span className="truncate">
                <span className="text-foreground">{first.profile.name} </span>
                <span className={VERDICT_TEXT[first.binding.verdict]}>{headline(first.binding)}</span>
              </span>
            </span>
          )}
          <span className="flex min-w-0 items-center gap-[var(--space-2)] text-caption text-muted-foreground">
            <span className="flex shrink-0 gap-0.5">
              {calm.map(p => (
                <ProfileTile key={p.profile.id} profile={p.profile} className="size-4" />
              ))}
            </span>
            <span className="truncate">{first ? 'others fine till reset' : 'all fine till reset'}</span>
          </span>
        </span>
      }
      detail={paces.map(({ profile, limits }) => (
        <PopoverSection key={profile.id} title={`${profile.name} · ${profile.plan}`}>
          {limits.map(pace => (
            <div
              key={pace.limit.label}
              className="flex flex-col py-[var(--space-1)] pl-[var(--space-2)] pr-[var(--space-3)]"
            >
              <span className="text-body text-foreground">{pace.limit.label}</span>
              <span
                className={cn(
                  'text-caption',
                  pace.verdict === 'free' ? 'text-muted-foreground' : VERDICT_TEXT[pace.verdict],
                )}
              >
                {sentence(pace)}
              </span>
            </div>
          ))}
        </PopoverSection>
      ))}
    />
  )
}
