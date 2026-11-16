/*!
 * Local addition: the AI app's profiles screen — every Claude config
 * dir and compatible provider the app drives, with plan, limits and running
 * sessions, and the form that adds one.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Copy from '@justanarthur/modo-ui/components/copy'
import Badge from '@justanarthur/modo-ui/components/badge'
import Meter from '@justanarthur/modo-ui/components/meter'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ProfileOnboarding from '../../blocks/profiles/profile-onboarding'
import { ProfileTile } from '../../blocks/profiles/profile-switcher'
import SessionSidebar from '../../blocks/sessions/session-sidebar'
import { useIcon } from '../../lib/icons'
import type { Profile } from '../../lib/types'
import { PROFILES, SESSIONS } from '../../mock/mock'
import { SIGN_IN_WAITING } from '../../mock/mock-extras'

function ProfileCard({ profile, isDefault }: { profile: Profile; isDefault: boolean }) {
  const shape = useShape()
  return (
    <article className={cn('flex min-w-0 flex-col gap-4 border border-border p-4', shape.container)}>
      <div className="flex min-w-0 items-start gap-3">
        <ProfileTile profile={profile} className="mt-0.5" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-subtitle weight-semibold text-foreground">{profile.name}</span>
            <Badge size="compact" color={profile.provider === 'compatible' ? 'teal' : 'gray'}>
              {profile.plan}
            </Badge>
            {isDefault && (
              <Badge size="compact" variant="dot" color="gray">
                Default
              </Badge>
            )}
          </div>
          <span className="truncate text-caption text-muted-foreground">
            {profile.account} · {profile.defaultModel} · {profile.running} running
          </span>
        </div>
      </div>
      <Copy
        value={profile.provider === 'compatible' ? (profile.baseUrl ?? '') : `CLAUDE_CONFIG_DIR=${profile.configDir}`}
      />
      <div className="flex flex-col gap-2.5">
        {profile.limits.map(limit => (
          <Meter key={limit.label} label={limit.label} value={limit.value} detail={limit.detail} />
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {!isDefault && (
          <Button size="compact" variant="tertiary">
            Make default
          </Button>
        )}
        <Button size="compact" variant="ghost">
          {profile.provider === 'compatible' ? 'Edit provider' : 'Open config dir'}
        </Button>
        <Button size="compact" variant="ghost" className="ml-auto">
          {profile.provider === 'compatible' ? 'Remove' : 'Sign out'}
        </Button>
      </div>
    </article>
  )
}

function AddProfile() {
  const shape = useShape()
  const Plus = useIcon('plus')
  return (
    <section aria-label="Add a profile" className={cn('flex flex-col gap-4 bg-muted p-4', shape.container)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-title text-foreground">Add a profile</h2>
        <p className="m-0 text-caption text-muted-foreground">
          A Claude account gets its own config dir and signs in once; a compatible provider runs claude against its base
          URL.
        </p>
      </div>
      <div className="flex justify-end">
        <ProfileOnboarding
          taken={PROFILES.map(p => p.id)}
          signIn={SIGN_IN_WAITING}
          trigger={
            <Button size="compact" leadingIcon={Plus}>
              Add profile
            </Button>
          }
        />
      </div>
    </section>
  )
}

interface ProfilesProps {
  /** Start with the sessions sidebar open. Defaults to `true`. */
  sidebar?: boolean
}

/**
 * Every profile the app drives, side by side: which account or provider
 * it is, how much of its limits is left, and how to add another.
 *
 * Each card is one `claude` process's world: its config dir (or a
 * compatible provider's base URL) to copy, its plan, the account and
 * default model, how many sessions run there, and a meter per limit,
 * amber and red as each runs out. The default profile is where a new
 * session starts unless you pick another. The form at the end adds a
 * Claude account under a fresh config dir, or a provider such as Z.ai's
 * GLM behind an Anthropic-compatible URL.
 *
 * @example {@include ./examples.mdx}
 */
export default function Profiles({ sidebar = true }: ProfilesProps) {
  return (
    <div className="flex h-full min-h-[640px] w-full bg-background">
      <Sidebar.Provider className="h-full min-h-0" persist={false} mobileBreakpoint={0} defaultOpen={sidebar}>
        <SessionSidebar {...SESSIONS} className="h-full" defaultValue="" />
        <Sidebar.Inset className="@container min-h-0 min-w-0 overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 px-1.5">
            <Sidebar.Trigger />
            <span className="text-body weight-medium text-foreground">Profiles</span>
          </header>
          <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-8 pt-4">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-display text-foreground">Profiles</h1>
              <p className="m-0 text-body text-muted-foreground">
                4 profiles · 3 sessions running · usage refreshed 1 min ago
              </p>
            </div>
            <div className="grid gap-4 @2xl:grid-cols-2">
              {PROFILES.map((profile, i) => (
                <ProfileCard key={profile.id} profile={profile} isDefault={i === 0} />
              ))}
            </div>
            <AddProfile />
          </main>
        </Sidebar.Inset>
      </Sidebar.Provider>
    </div>
  )
}

export type { ProfilesProps }
