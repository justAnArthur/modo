/*!
 * Local addition: the first-launch screen of the just-standards app, four
 * steps from an empty machine to a first business: the workspace folder,
 * the Claude Code profile, GitHub and the first business. Presentational:
 * what is set up so far and the callbacks come in as props; the folder
 * picker, `standards workspace init` and the rest run outside.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Check, FolderOpen, FolderPlus, Plus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { ClaudeProfile } from '../../lib/types'
import BusinessForm, { type BusinessFormProps } from '../business-form'
import GithubStatus, { type GithubStatusProps } from '../github-status'

export type OnboardingStep = 'workspace' | 'profile' | 'github' | 'business'

type StepState = 'done' | 'current' | 'todo' | 'skipped'

const STEPS: { id: OnboardingStep; title: string; skippable: boolean }[] = [
  { id: 'workspace', title: 'Workspace folder', skippable: false },
  { id: 'profile', title: 'Claude Code profile', skippable: false },
  { id: 'github', title: 'GitHub', skippable: true },
  { id: 'business', title: 'First business', skippable: true },
]

function Glyph({ state, number }: { state: StepState; number: number }) {
  if (state === 'done')
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success/16 text-status-success">
        <Check size={14} strokeWidth={2} />
      </span>
    )
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-micro weight-medium tabular-nums',
        state === 'current' ? 'bg-foreground text-background' : 'border border-border text-muted-foreground',
      )}
    >
      {number}
    </span>
  )
}

interface StepProps {
  number: number
  title: string
  state: StepState
  /** A done step's value, a line under its title. */
  summary?: ReactNode
  /** Beside the title: Skip, Change, Set up. */
  action?: ReactNode
  /** The current step's body. */
  children?: ReactNode
}

function Step({ number, title, state, summary, action, children }: StepProps) {
  const shape = useShape()
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className={cn('flex gap-3 border border-border p-4', shape.container)}
    >
      <Glyph state={state} number={number} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-h-6 items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className={cn('text-subtitle', state === 'todo' ? 'text-muted-foreground' : 'text-foreground')}>
              {title}
            </h2>
            {state === 'skipped' && <span className="text-caption text-muted-foreground">Skipped</span>}
            {state === 'done' && summary && (
              <span className="min-w-0 truncate text-caption text-muted-foreground">{summary}</span>
            )}
          </div>
          {action}
        </div>
        {state === 'current' && children}
      </div>
    </li>
  )
}

interface OnboardingProps {
  /** The workspace folder, once picked or created. */
  workspace?: string
  /** Called on Choose folder (and Change): the app opens a folder picker. */
  onPickWorkspace?: () => void
  /** Called on Create new: the app asks where, then runs `standards workspace init`. */
  onCreateWorkspace?: () => void
  /** The Claude Code profiles on this machine, with whether each is signed in. */
  profiles: ClaudeProfile[]
  /** The config dir of the profile picked for the default workers. */
  profile?: string
  /** Called with a profile's config dir when it is picked. */
  onProfileChange?: (configDir: string) => void
  /** The GitHub step: GithubStatus's props. */
  github: GithubStatusProps
  /** The first business's name, once it is saved. */
  business?: string
  /** The first business's form, opened by Add a business (its Cancel closes it): BusinessForm's props. */
  businessForm: Omit<BusinessFormProps, 'onCancel' | 'onClose' | 'onDelete'>
  /** The steps skipped (controlled). Pair with `onSkippedChange`. */
  skipped?: OnboardingStep[]
  /** The steps skipped at first, for an uncontrolled screen. Defaults to none. */
  defaultSkipped?: OnboardingStep[]
  /** Called with the skipped steps on Skip, or on Set up for a skipped one. */
  onSkippedChange?: (skipped: OnboardingStep[]) => void
  /** Called on Open just-standards, offered once the workspace and the profile are set. */
  onFinish?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * The app's first launch, a full page: from nothing to a first business in
 * four steps, each in a card with its state.
 *
 * Workspace folder picks a folder you have or creates one (with
 * `businesses/` and the default workers). Claude Code profile lists the
 * profiles on this machine, each with the account signed in to it or "Not
 * signed in"; the one picked runs the default workers. GitHub is
 * GithubStatus: signed in, or Sign in and the device code. First business
 * opens BusinessForm in place.
 *
 * Each step is done (a check, and its value under the title), current (its
 * number filled, its body open), still to do (muted), or skipped. The
 * current step is the first neither done nor skipped. GitHub and the first
 * business can be skipped, and a skipped step offers Set up to come back;
 * a done workspace or profile offers Change. Open just-standards waits for
 * the workspace and the profile. Works controlled (`skipped` +
 * `onSkippedChange`) or uncontrolled (`defaultSkipped`).
 *
 * @example {@include ./examples.mdx}
 */
export default function Onboarding({
  workspace,
  onPickWorkspace,
  onCreateWorkspace,
  profiles,
  profile,
  onProfileChange,
  github,
  business,
  businessForm,
  skipped: skippedProp,
  defaultSkipped = [],
  onSkippedChange,
  onFinish,
  className,
}: OnboardingProps) {
  const [skipped, setSkipped] = useControllableState(skippedProp, defaultSkipped, onSkippedChange)
  const [changingProfile, setChangingProfile] = useState(false)
  const [adding, setAdding] = useState(false)
  const picked = profiles.find(p => p.configDir === profile)

  const done: Record<OnboardingStep, boolean> = {
    workspace: Boolean(workspace),
    profile: Boolean(picked) && !changingProfile,
    github: Boolean(github.status?.loggedIn),
    business: Boolean(business),
  }
  const current = STEPS.find(step => !done[step.id] && !skipped.includes(step.id))?.id
  const stateOf = (id: OnboardingStep): StepState => {
    if (done[id]) return 'done'
    if (id === current) return 'current'
    return skipped.includes(id) ? 'skipped' : 'todo'
  }
  const skip = (id: OnboardingStep) => setSkipped([...skipped, id])
  const unskip = (id: OnboardingStep) => setSkipped(skipped.filter(step => step !== id))

  function actionOf(id: OnboardingStep, skippable: boolean) {
    const state = stateOf(id)
    if (state === 'skipped')
      return (
        <Button variant="ghost" size="compact" onClick={() => unskip(id)}>
          Set up
        </Button>
      )
    if (state === 'current' && skippable)
      return (
        <Button variant="ghost" size="compact" onClick={() => skip(id)}>
          Skip
        </Button>
      )
    if (state !== 'done') return null
    if (id === 'workspace')
      return (
        <Button variant="ghost" size="compact" onClick={onPickWorkspace}>
          Change
        </Button>
      )
    if (id === 'profile')
      return (
        <Button variant="ghost" size="compact" onClick={() => setChangingProfile(true)}>
          Change
        </Button>
      )
    return null
  }

  const body: Record<OnboardingStep, ReactNode> = {
    workspace: (
      <>
        <p className="text-body text-muted-foreground">
          The folder that holds your businesses and workers. Pick one you have, or create a new one.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="compact" leadingIcon={FolderOpen} onClick={onPickWorkspace}>
            Choose folder…
          </Button>
          <Button variant="secondary" size="compact" leadingIcon={FolderPlus} onClick={onCreateWorkspace}>
            Create new…
          </Button>
        </div>
      </>
    ),
    profile: (
      <>
        <p className="text-body text-muted-foreground">The Claude Code profile the workers run on.</p>
        <ChoiceList
          label="Claude Code profile"
          value={profile ?? ''}
          onValueChange={next => {
            setChangingProfile(false)
            onProfileChange?.(next)
          }}
          className="-mx-2"
          options={profiles.map(p => ({
            value: p.configDir,
            label: p.label,
            content: (
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="shrink-0">{p.label}</span>
                <span className="min-w-0 truncate font-mono text-caption text-muted-foreground">{p.configDir}</span>
                <span className="ml-auto shrink-0 text-caption text-muted-foreground">
                  {p.signedIn ? (p.account ?? 'Signed in') : 'Not signed in'}
                </span>
              </span>
            ),
          }))}
        />
      </>
    ),
    github: (
      <>
        <p className="text-body text-muted-foreground">So fixes can open pull requests, and you can merge them here.</p>
        <GithubStatus {...github} />
      </>
    ),
    business: adding ? (
      <BusinessForm {...businessForm} onCancel={() => setAdding(false)} className="rounded-xl border border-border" />
    ) : (
      <>
        <p className="text-body text-muted-foreground">
          Something you run: a site, an app, the repos behind them, and the packs of standards it is measured against.
        </p>
        <div>
          <Button size="compact" leadingIcon={Plus} onClick={() => setAdding(true)}>
            Add a business
          </Button>
        </div>
      </>
    ),
  }

  const summary: Record<OnboardingStep, ReactNode> = {
    workspace: <span className="font-mono">{workspace}</span>,
    profile: picked && [picked.label, picked.signedIn ? picked.account : 'not signed in'].filter(Boolean).join(' · '),
    github: github.status?.user && `Signed in as ${github.status.user}`,
    business,
  }

  return (
    <div className={cn('flex min-h-full w-full justify-center bg-background px-6 py-12', className)}>
      <div className="flex w-full max-w-xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-display text-foreground">Set up just-standards</h1>
          <p className="text-body text-muted-foreground">
            Four steps to a business measured against its standards, and a worker to fix what fails.
          </p>
        </header>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {STEPS.map((step, index) => (
            <Step
              key={step.id}
              number={index + 1}
              title={step.title}
              state={stateOf(step.id)}
              summary={summary[step.id]}
              action={actionOf(step.id, step.skippable)}
            >
              {body[step.id]}
            </Step>
          ))}
        </ol>
        <footer className="flex items-center justify-between gap-3">
          <span className="text-caption text-muted-foreground">You can change all of this later in Settings.</span>
          <Button disabled={!done.workspace || !done.profile} onClick={onFinish}>
            Open just-standards
          </Button>
        </footer>
      </div>
    </div>
  )
}

export type { OnboardingProps }
export { Onboarding }
