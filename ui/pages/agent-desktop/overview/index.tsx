/*!
 * Local addition: the agent desktop's overview — every session of every
 * project and profile on one board, with each profile's limits on top.
 */

'use client'

import { PROFILES } from '../../../blocks/agent-desktop/mock'
import { ProfileTile } from '../../../blocks/agent-desktop/profile-switcher'
import SessionBoard, { type BoardView } from '../../../blocks/agent-desktop/session-board'
import SessionSidebar from '../../../blocks/agent-desktop/session-sidebar'
import Meter from '../../../components/meter'
import Sidebar from '../../../components/navigation/sidebar'
import { SizeProvider } from '../../../primitives/sizes'

interface OverviewProps {
  /** The board's view. Defaults to `'state'`. */
  view?: BoardView
  /** Start with the sessions sidebar open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * Mission control: what every session needs from you, across every project
 * and profile, without opening one.
 *
 * The strip on top is each profile's tightest limit, so you see where there
 * is room before you start something. Below it the session board sorts
 * every session by what it needs (needs you, running, to review, idle) or
 * groups them by project. The sidebar's Overview row opens it.
 *
 * @example {@include ./examples.mdx}
 */
export default function Overview({ view = 'state', sidebar = true }: OverviewProps) {
  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <SessionSidebar className="h-full" defaultValue="overview" />
        <Sidebar.Inset className="@container min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">Overview</span>
          </header>
          <main className="flex w-full flex-col gap-6 px-6 pb-8 pt-2">
            <SizeProvider size="compact">
              <section aria-label="Profile limits" className="grid gap-x-6 gap-y-3 @xl:grid-cols-2 @4xl:grid-cols-4">
                {PROFILES.map(profile => {
                  const tightest = [...profile.limits].sort((a, b) => b.value - a.value)[0]
                  return (
                    <div key={profile.id} className="flex min-w-0 items-center gap-2">
                      <ProfileTile profile={profile} />
                      {tightest && (
                        <Meter
                          className="min-w-0 flex-1"
                          label={`${profile.name} · ${tightest.label}`}
                          value={tightest.value}
                          detail={`${Math.round(tightest.value * 100)}%`}
                        />
                      )}
                    </div>
                  )
                })}
              </section>
            </SizeProvider>
            <SessionBoard defaultView={view} />
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { OverviewProps }
