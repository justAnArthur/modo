/*!
 * Local addition: the AI app's "Add profile" flow. A Dialog stepper: pick a
 * kind (a Claude account in its own config dir, or an Anthropic-compatible
 * provider), name it, sign in (`claude login`, or a test request against the
 * provider), done; or, in `'sign-in'` mode, the sign-in step alone for an
 * existing profile. The sign-in itself runs outside; its state comes in
 * through `signIn`.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Copy from '@justanarthur/modo-ui/components/actions/copy'
import Accordion from '@justanarthur/modo-ui/components/containers/accordion'
import List from '@justanarthur/modo-ui/components/data-display/list'
import LogView from '@justanarthur/modo-ui/components/data-display/log-view'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Input, { Label } from '@justanarthur/modo-ui/components/inputs/input'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactElement, type ReactNode, useId, useState } from 'react'
import { type IconName, useIcon } from '../../../lib/icons'
import type { Profile } from '../../../lib/types'

export type OnboardingStep = 'kind' | 'details' | 'sign-in' | 'done'

/** The model each Claude tier maps to on a compatible provider (`ANTHROPIC_DEFAULT_<TIER>_MODEL`). */
export interface ModelMapping {
  opus: string
  sonnet: string
  haiku: string
}

/** What the form holds while a profile is being added. */
export interface ProfileDraft {
  kind: Profile['provider']
  name: string
  configDir: string
  baseUrl: string
  /** The env var the API key is read from; the key itself never enters the app. */
  apiKeyEnv: string
  models: ModelMapping
}

/** Where the sign-in (or, for a compatible provider, the test request) stands. */
export interface SignInStatus {
  state: 'idle' | 'waiting' | 'success' | 'failed'
  /** The CLI's output so far, one string per line (ANSI colors read). */
  log: string[]
  /** The sign-in page `claude login` opened, to open again or copy. */
  url?: string
  /** The signed-in account, once it succeeded. */
  account?: string
  /** The account's plan, once it succeeded. */
  plan?: string
  /** Why it failed. */
  error?: string
}

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'kind', label: 'Kind' },
  { id: 'details', label: 'Details' },
  { id: 'sign-in', label: 'Sign in' },
  { id: 'done', label: 'Done' },
]

const EMPTY_DRAFT: ProfileDraft = {
  kind: 'anthropic',
  name: '',
  configDir: '',
  baseUrl: '',
  apiKeyEnv: '',
  models: { opus: '', sonnet: '', haiku: '' },
}

const IDLE: SignInStatus = { state: 'idle', log: [] }

function configDirFor(draft: ProfileDraft) {
  return draft.configDir || (draft.name ? `~/.claude-${draft.name}` : '')
}

function ready(draft: ProfileDraft) {
  if (!draft.name) return false
  if (draft.kind === 'anthropic') return true
  return Boolean(draft.baseUrl && draft.apiKeyEnv)
}

function toProfile(draft: ProfileDraft, signIn: SignInStatus): Profile {
  const compatible = draft.kind === 'compatible'
  return {
    id: draft.name,
    name: draft.name,
    configDir: configDirFor(draft),
    provider: draft.kind,
    baseUrl: compatible ? draft.baseUrl : undefined,
    plan: signIn.plan ?? (compatible ? 'API key' : ''),
    account: signIn.account ?? (compatible ? draft.baseUrl : ''),
    defaultModel: compatible ? draft.models.sonnet || draft.models.opus : (signIn.plan ?? ''),
    limits: [],
    running: 0,
  }
}

function Stepper({ step }: { step: OnboardingStep }) {
  const Check = useIcon('check')
  const at = STEPS.findIndex(s => s.id === step)
  return (
    <ol aria-label="Steps" className="m-0 flex list-none items-center gap-[var(--space-2)] p-0">
      {STEPS.map((s, i) => (
        <li
          key={s.id}
          aria-current={i === at ? 'step' : undefined}
          className={cn(
            'flex items-center gap-[var(--space-1)] text-caption transition-[color] duration-fast',
            i <= at ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'flex size-4 items-center justify-center rounded-full text-micro tabular-nums transition-[background-color,color] duration-fast',
              i < at && 'bg-foreground text-background',
              i === at && 'bg-brand text-background',
              i > at && 'border border-border',
            )}
          >
            {i < at ? <Check size={10} strokeWidth={2.5} /> : i + 1}
          </span>
          {s.label}
          {i < STEPS.length - 1 && <span aria-hidden="true" className="ml-[var(--space-1)] h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  )
}

function KindOption({ icon, title, note }: { icon: IconName; title: string; note: string }) {
  const Icon = useIcon(icon)
  return (
    <span className="flex min-w-0 flex-1 items-start gap-[var(--space-3)]">
      <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-col">
        <span className="text-body text-foreground">{title}</span>
        <span className="text-caption text-muted-foreground">{note}</span>
      </span>
    </span>
  )
}

function Field({
  label,
  hint,
  value,
  placeholder,
  invalid,
  onChange,
}: {
  label: string
  hint?: ReactNode
  value: string
  placeholder?: string
  invalid?: boolean
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <Label htmlFor={id} invalid={invalid}>
        {label}
      </Label>
      <Input
        id={id}
        variant="bordered"
        value={value}
        placeholder={placeholder}
        invalid={invalid}
        onValueChange={onChange}
      />
      {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
    </div>
  )
}

function Details({
  draft,
  taken,
  onChange,
}: {
  draft: ProfileDraft
  taken: string[]
  onChange: (draft: ProfileDraft) => void
}) {
  const set = (patch: Partial<ProfileDraft>) => onChange({ ...draft, ...patch })
  const clash = taken.includes(draft.name)
  const name = (
    <Field
      label="Name"
      value={draft.name}
      placeholder={draft.kind === 'anthropic' ? 'work' : 'zcode'}
      invalid={clash}
      hint={clash ? 'A profile with this name exists.' : 'Shown in the sidebar and the profile switcher.'}
      onChange={value => set({ name: value.trim() })}
    />
  )

  if (draft.kind === 'anthropic')
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        {name}
        <Field
          label="Config dir"
          value={draft.configDir}
          placeholder={configDirFor(draft) || '~/.claude-work'}
          hint={
            <>
              Its own sign-in, settings, memory and limits. The app runs{' '}
              <code className="font-mono">CLAUDE_CONFIG_DIR={configDirFor(draft) || '…'} claude</code>.
            </>
          }
          onChange={value => set({ configDir: value })}
        />
      </div>
    )

  const tier = (key: keyof ModelMapping, label: string, placeholder: string) => (
    <List.Row key={key} label={label}>
      <Input
        aria-label={`${label} model`}
        variant="bordered"
        size="compact"
        className="w-48"
        value={draft.models[key]}
        placeholder={placeholder}
        onValueChange={value => set({ models: { ...draft.models, [key]: value } })}
      />
    </List.Row>
  )

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {name}
      <Field
        label="Base URL"
        value={draft.baseUrl}
        placeholder="https://api.z.ai/api/anthropic"
        hint="Set as ANTHROPIC_BASE_URL for this profile's sessions."
        onChange={value => set({ baseUrl: value.trim() })}
      />
      <Field
        label="API key env var"
        value={draft.apiKeyEnv}
        placeholder="ZAI_API_KEY"
        hint="Read from your shell and passed as ANTHROPIC_AUTH_TOKEN; the key never enters the app."
        onChange={value => set({ apiKeyEnv: value.trim() })}
      />
      <List.Section title="Model mapping" aside="What each Claude tier asks for">
        {tier('opus', 'Opus', 'GLM-4.6')}
        {tier('sonnet', 'Sonnet', 'GLM-4.6')}
        {tier('haiku', 'Haiku', 'GLM-4.5-Air')}
      </List.Section>
    </div>
  )
}

/** The code the sign-in page shows when its browser can't reach the CLI's localhost callback. */
function CodeField({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('')
  const id = useId()
  const trimmed = code.trim()
  return (
    <form
      className="flex flex-col gap-[var(--space-1)]"
      onSubmit={e => {
        e.preventDefault()
        if (!trimmed) return
        onSubmit(trimmed)
        setCode('')
      }}
    >
      <Label htmlFor={id} size="compact">
        The page shows a code instead? Paste it here
      </Label>
      <div className="flex items-center gap-[var(--space-2)]">
        <Input
          id={id}
          variant="bordered"
          size="compact"
          className="min-w-0 flex-1"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onValueChange={setCode}
        />
        <Button type="submit" variant="secondary" size="compact" disabled={!trimmed}>
          Submit
        </Button>
      </div>
    </form>
  )
}

function SignIn({
  draft,
  status,
  onRetry,
  onSubmitCode,
}: {
  draft: ProfileDraft
  status: SignInStatus
  onRetry?: () => void
  onSubmitCode?: (code: string) => void
}) {
  const CircleCheck = useIcon('circle-check')
  const CircleX = useIcon('circle-x')
  const External = useIcon('external-link')
  const Retry = useIcon('rotate-ccw')
  const compatible = draft.kind === 'compatible'
  const waiting = status.state === 'waiting'

  const head: Record<SignInStatus['state'], { icon: ReactNode; title: string; detail: ReactNode }> = {
    idle: {
      icon: <Spinner className="size-5" />,
      title: compatible ? 'Starting the test request…' : 'Starting claude login…',
      detail: compatible ? draft.baseUrl : configDirFor(draft),
    },
    waiting: {
      icon: <Spinner className="size-5" />,
      title: compatible ? `Testing ${draft.baseUrl}…` : 'Waiting for the browser…',
      detail: compatible
        ? `One short request with the key from $${draft.apiKeyEnv}.`
        : 'Finish signing in on the page that opened; this step moves on by itself.',
    },
    success: {
      icon: <CircleCheck size={16} strokeWidth={1.5} className="text-status-success" />,
      title: compatible ? 'The provider answered' : `Signed in as ${status.account ?? 'your account'}`,
      detail: status.plan ?? (compatible ? draft.models.sonnet : undefined),
    },
    failed: {
      icon: <CircleX size={16} strokeWidth={1.5} className="text-status-error" />,
      title: compatible ? 'The provider refused the request' : 'Sign-in did not finish',
      detail: status.error,
    },
  }
  const { icon, title, detail } = head[status.state]

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-start gap-[var(--space-3)]">
        {/* One 20px column for the spinner and the marks, so the title doesn't shift between states. */}
        <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
        <div aria-live="polite" className="flex min-w-0 flex-1 flex-col">
          <span className="text-body weight-medium text-foreground">{title}</span>
          {detail && <span className="text-caption text-muted-foreground">{detail}</span>}
        </div>
        {status.state === 'failed' && onRetry && (
          <Button variant="secondary" size="compact" leadingIcon={Retry} onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>

      {waiting && status.url && (
        <div className="flex items-center gap-[var(--space-2)]">
          <Copy
            value={status.url}
            size="compact"
            className="min-w-0 flex-1"
            labels={{ copy: 'Copy the sign-in link' }}
          />
          <Button variant="ghost" size="compact" leadingIcon={External} asChild>
            <a href={status.url} target="_blank" rel="noreferrer">
              Open again
            </a>
          </Button>
        </div>
      )}

      {waiting && !compatible && onSubmitCode && <CodeField onSubmit={onSubmitCode} />}

      {/* The CLI's own words, for when something looks off: folded away, and gone once it worked. */}
      {status.state !== 'success' && status.log.length > 0 && (
        <Accordion size="compact" highlight="trigger">
          <Accordion.Item value="output">
            <Accordion.Trigger>Show output</Accordion.Trigger>
            <Accordion.Content>
              <LogView label={compatible ? 'Test request' : 'claude login'} lines={status.log} maxHeight={180} wrap />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )}
    </div>
  )
}

function Summary({ draft, status }: { draft: ProfileDraft; status: SignInStatus }) {
  const compatible = draft.kind === 'compatible'
  return (
    <List>
      <List.Section title={draft.name}>
        <List.Row label="Kind">
          <span className="pr-[var(--space-3)] text-muted-foreground">
            {compatible ? 'Compatible provider' : 'Claude account'}
          </span>
        </List.Row>
        <List.Row label={compatible ? 'Base URL' : 'Config dir'}>
          <span className="min-w-0 truncate pr-[var(--space-3)] font-mono text-muted-foreground">
            {compatible ? draft.baseUrl : configDirFor(draft)}
          </span>
        </List.Row>
        {compatible ? (
          <List.Row label="Models">
            <span className="min-w-0 truncate pr-[var(--space-3)] text-muted-foreground">
              {[draft.models.opus, draft.models.sonnet, draft.models.haiku].filter(Boolean).join(' · ') ||
                'Provider default'}
            </span>
          </List.Row>
        ) : (
          <List.Row label="Account">
            <span className="min-w-0 truncate pr-[var(--space-3)] text-muted-foreground">
              {[status.account, status.plan].filter(Boolean).join(' · ')}
            </span>
          </List.Row>
        )}
      </List.Section>
    </List>
  )
}

/** Adding a new profile (the four steps), or signing an existing one in again (the sign-in step alone). */
export type OnboardingMode = 'add' | 'sign-in'

interface ProfileOnboardingPanelProps {
  /** `'add'` walks the four steps. `'sign-in'` signs an existing profile in again: the sign-in step alone, without the stepper or Back, titled "Sign in to <name>" (the name from `defaultDraft`); Done hands the profile to `onComplete` once it succeeds. The app starts the sign-in itself there, as no step is entered. Defaults to `'add'`. */
  mode?: OnboardingMode
  /** The step shown (controlled). Pair with `onStepChange`. Ignored in `'sign-in'` mode. */
  step?: OnboardingStep
  /** The step it starts on. Defaults to `'kind'`. Ignored in `'sign-in'` mode. */
  defaultStep?: OnboardingStep
  /** Called when Back or Continue moves to another step. */
  onStepChange?: (step: OnboardingStep) => void
  /** What the form starts with: a kind, a name, a provider's base URL and models. */
  defaultDraft?: Partial<ProfileDraft>
  /** Names already taken, so a clash is caught before the sign-in. */
  taken?: string[]
  /** Where the sign-in stands; the app runs `claude login` (or the test request) and reports back. Defaults to idle. */
  signIn?: SignInStatus
  /** Called on entering the sign-in step, with what the form holds: start `claude login` or the test request here. */
  onSignIn?: (draft: ProfileDraft) => void
  /** Called with the code the sign-in page shows when its browser can't reach the CLI's callback: pass it on to `claude login`. Given, a code field shows while the sign-in waits. */
  onSubmitCode?: (code: string) => void
  /** Called with the new profile when Add profile is pressed on the last step (Done, in `'sign-in'` mode). */
  onComplete?: (profile: Profile) => void
  /** Called when Cancel is pressed on the first step. */
  onCancel?: () => void
  /** Classes for the root. */
  className?: string
}

/** The stepper's body, without the Dialog: for a page of its own, or the docs. */
function ProfileOnboardingPanel({
  mode = 'add',
  step,
  defaultStep = 'kind',
  onStepChange,
  defaultDraft,
  taken = [],
  signIn = IDLE,
  onSignIn,
  onSubmitCode,
  onComplete,
  onCancel,
  className,
}: ProfileOnboardingPanelProps) {
  const [stepState, setCurrent] = useControllableState(step, defaultStep, onStepChange)
  const signInOnly = mode === 'sign-in'
  const current = signInOnly ? 'sign-in' : stepState
  const [draft, setDraft] = useState<ProfileDraft>({
    ...EMPTY_DRAFT,
    ...defaultDraft,
    models: { ...EMPTY_DRAFT.models, ...defaultDraft?.models },
  })
  const at = STEPS.findIndex(s => s.id === current)
  const compatible = draft.kind === 'compatible'

  const go = (next: OnboardingStep) => {
    if (next === 'sign-in') onSignIn?.(draft)
    setCurrent(next)
  }
  const back = signInOnly ? undefined : STEPS[at - 1]?.id
  const canContinue =
    current === 'kind' ||
    (current === 'details' && ready(draft) && !taken.includes(draft.name)) ||
    (current === 'sign-in' && signIn.state === 'success')

  const titles: Record<OnboardingStep, { title: string; description: string }> = {
    kind: {
      title: 'Add a profile',
      description: 'Each profile is its own claude process, with its own sign-in and limits.',
    },
    details: compatible
      ? {
          title: 'Point it at the provider',
          description: 'Sessions under this profile talk to the base URL instead of Anthropic.',
        }
      : {
          title: 'Name it and give it a home',
          description: 'A new config dir keeps this account apart from your others.',
        },
    'sign-in': signInOnly
      ? {
          title: draft.name ? `Sign in to ${draft.name}` : 'Sign in again',
          description: 'claude login opens your browser; sign in with the account this profile uses.',
        }
      : compatible
        ? { title: 'Test the connection', description: 'One request checks the URL, the key and the model mapping.' }
        : { title: 'Sign in', description: 'claude login opens your browser for the account this profile uses.' },
    done: { title: 'Ready', description: 'New sessions can run under it from the profile switcher.' },
  }

  return (
    <div className={cn('flex flex-col gap-[var(--space-5)]', className)}>
      {!signInOnly && <Stepper step={current} />}
      <div className="flex flex-col gap-[var(--space-1)]">
        <h2 className="m-0 text-title text-foreground">{titles[current].title}</h2>
        <p className="m-0 text-body text-muted-foreground">{titles[current].description}</p>
      </div>

      {current === 'kind' && (
        <ChoiceList
          label="Kind"
          value={draft.kind}
          onValueChange={kind => setDraft({ ...draft, kind: kind === 'compatible' ? 'compatible' : 'anthropic' })}
          options={[
            {
              value: 'anthropic',
              label: 'Claude account',
              content: (
                <KindOption
                  icon="user"
                  title="Claude account"
                  note="Sign in to claude.ai in a new config dir: another plan, another org."
                />
              ),
            },
            {
              value: 'compatible',
              label: 'Anthropic-compatible provider',
              content: (
                <KindOption
                  icon="server"
                  title="Anthropic-compatible provider"
                  note="A base URL and an API key, such as Z.ai's GLM coding plan."
                />
              ),
            },
          ]}
        />
      )}
      {current === 'details' && <Details draft={draft} taken={taken} onChange={setDraft} />}
      {current === 'sign-in' && (
        <SignIn draft={draft} status={signIn} onRetry={() => onSignIn?.(draft)} onSubmitCode={onSubmitCode} />
      )}
      {current === 'done' && <Summary draft={draft} status={signIn} />}

      <div className="flex items-center justify-end gap-[var(--space-2)]">
        {back ? (
          <Button variant="ghost" onClick={() => setCurrent(back)}>
            Back
          </Button>
        ) : (
          onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )
        )}
        {current === 'done' || signInOnly ? (
          <Button
            disabled={signInOnly && signIn.state !== 'success'}
            onClick={() => onComplete?.(toProfile(draft, signIn))}
          >
            {signInOnly ? 'Done' : 'Add profile'}
          </Button>
        ) : (
          <Button disabled={!canContinue} onClick={() => go(STEPS[at + 1]?.id ?? 'done')}>
            {current === 'details' ? (compatible ? 'Test connection' : 'Sign in') : 'Continue'}
          </Button>
        )}
      </div>
    </div>
  )
}

interface ProfileOnboardingProps {
  /** The control that opens it, such as the switcher's "Add profile" button. */
  trigger?: ReactElement
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** `'add'` walks the four steps. `'sign-in'` signs an existing profile in again: the sign-in step alone, without the stepper or Back, titled "Sign in to <name>" (the name from `defaultDraft`); Done hands the profile to `onComplete` once it succeeds. The app starts the sign-in itself there, as no step is entered. Defaults to `'add'`. */
  mode?: OnboardingMode
  /** The step shown (controlled). Pair with `onStepChange`. Ignored in `'sign-in'` mode. */
  step?: OnboardingStep
  /** The step it starts on. Defaults to `'kind'`. Ignored in `'sign-in'` mode. */
  defaultStep?: OnboardingStep
  /** Called when Back or Continue moves to another step. */
  onStepChange?: (step: OnboardingStep) => void
  /** What the form starts with: a kind, a name, a provider's base URL and models. */
  defaultDraft?: Partial<ProfileDraft>
  /** Names already taken, so a clash is caught before the sign-in. */
  taken?: string[]
  /** Where the sign-in stands; the app runs `claude login` (or the test request) and reports back. Defaults to idle. */
  signIn?: SignInStatus
  /** Called on entering the sign-in step, with what the form holds: start `claude login` or the test request here. */
  onSignIn?: (draft: ProfileDraft) => void
  /** Called with the code the sign-in page shows when its browser can't reach the CLI's callback: pass it on to `claude login`. Given, a code field shows while the sign-in waits. */
  onSubmitCode?: (code: string) => void
  /** Called with the new profile when Add profile is pressed on the last step (Done, in `'sign-in'` mode); the dialog closes. */
  onComplete?: (profile: Profile) => void
}

/**
 * Adds a profile: a Claude account in a config dir of its own, or an
 * Anthropic-compatible provider behind a base URL.
 *
 * Four steps, shown along the top. Pick the kind; name it and give it a
 * config dir (or a base URL, the env var that holds the API key, and which
 * model each Claude tier maps to); sign in; done. Entering the sign-in step
 * calls `onSignIn`, where the app starts `claude login` under the new
 * `CLAUDE_CONFIG_DIR` (or a test request against the provider) and feeds
 * its progress back through `signIn`: "waiting for the browser", then
 * success with the account and plan, or the error and a retry. Continue
 * waits for success. The last step hands the new profile to `onComplete`.
 * While it waits, the link sits in one row (copy it, or open it again);
 * with `onSubmitCode`, a field takes the code the page shows when its browser
 * can't reach the CLI. The CLI's raw output folds behind "Show output" and
 * goes once the sign-in succeeds.
 *
 * `mode="sign-in"` signs an existing profile in again: the sign-in step
 * alone, without the stepper or Back, titled after the profile in
 * `defaultDraft`, and Done instead of Continue. The app starts `claude
 * login` itself there (no step is entered), and Retry calls `onSignIn`.
 * The dialog grows out of its trigger; `ProfileOnboarding.Panel` is the same
 * stepper without it.
 *
 * Statics:
 * - `ProfileOnboarding.Panel` — the stepper on its own: the same props, minus the dialog's.
 *
 * @example {@include ./examples.mdx}
 */
const ProfileOnboarding = Object.assign(
  function ProfileOnboarding({
    trigger,
    open,
    defaultOpen = false,
    onOpenChange,
    onComplete,
    ...panel
  }: ProfileOnboardingProps) {
    const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <Dialog.Trigger render={trigger} />}
        <Dialog.Content
          width="lg"
          aria-label={
            panel.mode === 'sign-in' ? `Sign in to ${panel.defaultDraft?.name ?? 'the profile'}` : 'Add a profile'
          }
        >
          <ProfileOnboardingPanel
            {...panel}
            onCancel={() => setOpen(false)}
            onComplete={profile => {
              onComplete?.(profile)
              setOpen(false)
            }}
          />
        </Dialog.Content>
      </Dialog>
    )
  },
  { Panel: ProfileOnboardingPanel },
)

export type { ProfileOnboardingPanelProps, ProfileOnboardingProps }
export { ProfileOnboarding, ProfileOnboardingPanel }

export default ProfileOnboarding
