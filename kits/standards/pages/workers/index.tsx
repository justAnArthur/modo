/*!
 * Local addition: the just-standards Workers screen on mock data.
 */

'use client'

import WorkerList from '../../blocks/worker-list'
import { AppWindow, ScreenHeader } from '../../mock/app-window'
import { WORKERS } from '../../mock/status'

/**
 * The worker presets a failing cell can be handed to, as the workspace
 * defines them: two fixers, on sonnet and opus, that accept edits, and a
 * reviewer that only plans. It is the WorkerList block in the app's window.
 *
 * @example {@include ./examples.mdx}
 */
export default function Workers() {
  return (
    <AppWindow title="Workers" current="workers">
      <ScreenHeader
        title="Workers"
        lead="Claude Code presets: each fix runs in a worktree and ends in a pull request."
      />
      <WorkerList workers={WORKERS} />
    </AppWindow>
  )
}
