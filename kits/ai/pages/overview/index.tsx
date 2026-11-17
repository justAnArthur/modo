/*!
 * Local addition: the AI app's overview — the sessions sidebar
 * widened into the page. The sidebar keeps its header and usage and trades
 * its session list for filters that narrow the board; the list itself moves
 * into the board, where every row opens in place.
 */

'use client'

import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import { useState } from 'react'
import SessionBoard, { type BoardView, type SessionFilter } from '../../blocks/sessions/session-board'
import SessionSidebar from '../../blocks/sessions/session-sidebar'
import type { Session } from '../../lib/types'
import { ARCHIVED, GROUPS, PINNED, PROFILES, SESSIONS } from '../../mock/mock'

interface OverviewProps {
  /** The board's view. Defaults to `'project'`. */
  view?: BoardView
  /** Sessions open on the board at first, by id. Defaults to the canvas session, which waits on you. */
  open?: string[]
  /** The board's filter at first, as picked in the sidebar. Defaults to `'all'`. */
  filter?: SessionFilter
  /** Start with the sessions sidebar open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * Mission control: every session of every project and profile, what each
 * one is doing, and the answers it waits on, on one page.
 *
 * The overview is the sessions sidebar, widened. Its session list is the
 * board, in the same groups and order, with a column for each session's
 * profile, project, status and last activity. Allow a permission or stop a
 * run from its row; open rows in place to read the latest turn, answer the
 * pending prompt or reply, several at once, each lifted into its own card.
 * "By state" regroups them by what they need.
 *
 * The sidebar keeps its header (Overview, New session, search) and each
 * profile's usage, and lists filters for the board instead: by state, by
 * project and by profile, each with its count. Pick one and the board
 * narrows to it; Overview, or "Show all" on the board, brings everything
 * back. Answer a session on the board and the counts follow.
 *
 * @example {@include ./examples.mdx}
 */
export default function Overview({
  view = 'project',
  open = ['canvas'],
  filter = 'all',
  sidebar = true,
}: OverviewProps) {
  const [shown, setShown] = useState<SessionFilter>(filter)
  const [patches, setPatches] = useState<Record<string, Partial<Session>>>({})
  const live = (s: Session): Session => ({ ...s, ...patches[s.id], children: s.children?.map(live) })

  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <SessionSidebar
          className="h-full"
          list="filters"
          pinned={PINNED.map(live)}
          groups={GROUPS.map(g => ({ ...g, sessions: g.sessions.map(live) }))}
          archived={ARCHIVED}
          profiles={PROFILES}
          onOpenSettings={() => {}}
          value={shown === 'all' ? 'overview' : shown}
          onValueChange={v => {
            if (v === 'overview') setShown('all')
            else if (v.includes(':')) setShown(v as SessionFilter)
          }}
        />
        <Sidebar.Inset className="min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">Overview</span>
          </header>
          <main className="flex w-full flex-col px-3 pb-8">
            <SessionBoard
              {...SESSIONS}
              defaultView={view}
              defaultOpen={open}
              filter={shown}
              onFilterChange={setShown}
              onPatch={(id, p) => setPatches(prev => ({ ...prev, [id]: { ...prev[id], ...p } }))}
            />
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { OverviewProps }
