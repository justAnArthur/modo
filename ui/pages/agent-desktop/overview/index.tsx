/*!
 * Local addition: the agent desktop's overview — the sessions sidebar
 * widened into the page. The sidebar keeps its header and usage; its
 * session list moves into the board, where every row opens in place.
 */

'use client'

import SessionBoard, { type BoardView } from '../../../blocks/agent-desktop/session-board'
import SessionSidebar from '../../../blocks/agent-desktop/session-sidebar'
import Sidebar from '../../../components/navigation/sidebar'

interface OverviewProps {
  /** The board's view. Defaults to `'project'`. */
  view?: BoardView
  /** Sessions open on the board at first, by id. Defaults to the canvas session, which waits on you. */
  open?: string[]
  /** Start with the sessions sidebar open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * Mission control: every session of every project and profile, what each
 * one is doing, and the answers it waits on, on one page.
 *
 * The overview is the sessions sidebar, widened. While it is open the
 * sidebar keeps only its header (Overview, New session, search) and each
 * profile's usage at the bottom; its session list is the board, in the same
 * groups and order, with a column for each session's profile, project,
 * status and last activity. Allow a permission or stop a run from its row;
 * open rows in place to read the latest turn, answer the pending prompt or
 * reply, several at once. "By state" regroups them by what they need.
 *
 * @example {@include ./examples.mdx}
 */
export default function Overview({ view = 'project', open = ['canvas'], sidebar = true }: OverviewProps) {
  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <SessionSidebar className="h-full" defaultValue="overview" sessions={false} />
        <Sidebar.Inset className="min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">Overview</span>
          </header>
          <main className="flex w-full flex-col px-3 pb-8">
            <SessionBoard defaultView={view} defaultOpen={open} />
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { OverviewProps }
