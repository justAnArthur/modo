/*!
 * Local addition: the AI app's empty state — a new session before its
 * first message: where it runs (project, profile, worktree), the composer,
 * starters and the project's recent sessions.
 */

'use client'

import Card from '@justanarthur/modo-ui/components/card'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import FluidHover from '@justanarthur/modo-ui/primitives/fluid-hover'
import Composer from '../../blocks/composer'
import SessionSidebar from '../../blocks/session-sidebar'
import { STATUS_GLYPH } from '../../lib/status-glyph'
import { COMPOSER, GROUPS, MODELS, PROFILES, SESSIONS, ZCODE_MODELS } from '../../mock/mock'

const STARTERS = [
  { title: 'Review the current diff', description: 'Runs /review on what changed since main' },
  { title: 'Fix the failing CI on #23', description: 'Reads the logs, fixes, pushes, watches' },
  { title: 'Explain this repo', description: 'A map of the packages and how they build' },
]

interface NewSessionProps {
  /** The profile the session starts under. Defaults to `'jobiflow'`. */
  profile?: string
  /** Start with the sessions sidebar open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * A new session before its first message: where it will run, and the
 * fastest ways to start.
 *
 * The composer's row holds the three choices that cannot change later:
 * the project folder, the profile (each its own Claude config dir or
 * provider, with its limits in the switcher) and whether to work in a new
 * git worktree. A compatible provider's profile offers its own models in the
 * composer. Below come starters for common first asks and the project's
 * recent sessions, each with its state.
 *
 * @example {@include ./examples.mdx}
 */
export default function NewSession({ profile = 'jobiflow', sidebar = true }: NewSessionProps) {
  const recent = GROUPS[0]?.sessions ?? []
  const models = PROFILES.find(p => p.id === profile)?.provider === 'compatible' ? ZCODE_MODELS : MODELS

  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <SessionSidebar {...SESSIONS} className="h-full" defaultValue="new" />
        <Sidebar.Inset className="@container min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">New session</span>
          </header>
          <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 pb-8 pt-[8vh]">
            <h1 className="m-0 text-display text-foreground">What should we work on?</h1>
            <Composer
              {...COMPOSER}
              target
              defaultProfile={profile}
              placeholder="Describe the task, or type / for commands"
              context={0}
              models={models}
            />
            <section aria-label="Starters" className="flex flex-col gap-2">
              <span className="text-caption text-muted-foreground">Start with</span>
              <Card.Group columns={3} className="-mx-3">
                {STARTERS.map((starter, i) => (
                  <Card key={starter.title} index={i} onClick={() => {}} size="compact">
                    <Card.Header>
                      <Card.Title>{starter.title}</Card.Title>
                      <Card.Description>{starter.description}</Card.Description>
                    </Card.Header>
                  </Card>
                ))}
              </Card.Group>
            </section>
            <section aria-label="Recent in modo" className="flex flex-col gap-2">
              <span className="text-caption text-muted-foreground">Recent in modo</span>
              <FluidHover className="-mx-3">
                {recent.map(session => {
                  const Glyph = STATUS_GLYPH[session.status]
                  return (
                    <FluidHover.Item key={session.id} className="gap-2">
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        {Glyph ? (
                          <Glyph size={14} />
                        ) : (
                          <span className="size-2 rounded-full border border-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body text-foreground">{session.title}</span>
                      <span className="shrink-0 text-caption text-muted-foreground">
                        {session.profile} · {session.updated}
                      </span>
                    </FluidHover.Item>
                  )
                })}
              </FluidHover>
            </section>
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { NewSessionProps }
