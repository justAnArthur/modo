/*!
 * Local addition: the side pane's extensions slot, filled with usage —
 * every profile's limits as pace bars, read against the time until each
 * resets.
 */

'use client'

import Badge from '../../../components/badge'
import { useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { duration, paceOf, percent, VERDICT_TEXT } from '../pace'
import { PaceBar } from '../pace-bar'
import { PaneSection } from '../pane-parts'
import type { Profile } from '../types'

const VERDICT_WORD = { free: 'on pace', watch: 'only just', tight: 'too fast' } as const

interface UsagePaneProps {
  /** The profiles to read, each with its limits. */
  profiles: Profile[]
}

/**
 * The extensions slot, a pane your own MCP server or plugin provides: here,
 * usage across every profile.
 *
 * Each profile is a section with its plan and a verdict on its tightest
 * limit (on pace, only just, too fast); each limit is a pace bar whose tick
 * is where an even spend would be by now, with its share and the time
 * until it resets.
 *
 * @example {@include ./examples.mdx}
 */
export default function UsagePane({ profiles }: UsagePaneProps) {
  const size = useSize()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 pt-2">
        <span className="min-w-0 flex-1 text-caption text-muted-foreground">
          From your ai-app MCP server. The tick is where an even spend would be by now.
        </span>
        <Badge size="compact" color="violet" className="shrink-0">
          Extension
        </Badge>
      </div>
      {profiles.map(paceOf).map(({ profile, limits, binding }) => (
        <PaneSection
          key={profile.id}
          title={profile.name}
          meta={profile.plan}
          actions={
            <span className={cn('pr-1 text-caption', VERDICT_TEXT[binding.verdict])}>
              {VERDICT_WORD[binding.verdict]}
            </span>
          }
        >
          {limits.map(pace => (
            <div key={pace.limit.label} className={cn('flex items-center gap-2 px-2', size.control, size.text)}>
              <span className="min-w-0 flex-1 truncate text-foreground">{pace.limit.label}</span>
              <PaceBar pace={pace} className="w-16 shrink-0" />
              <span className="w-24 shrink-0 whitespace-nowrap text-right text-caption tabular-nums text-muted-foreground">
                {percent(pace.limit.value)} · {duration(pace.limit.resetsInHours)}
              </span>
            </div>
          ))}
        </PaneSection>
      ))}
    </div>
  )
}

export type { UsagePaneProps }
