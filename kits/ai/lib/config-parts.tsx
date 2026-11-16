/*!
 * Local addition: what the AI app's config forms share — the three scopes a
 * setting can live in, the file each scope writes, a labelled field, and a
 * segmented pick over a few string values.
 */

'use client'

import { Label } from '@justanarthur/modo-ui/components/inputs/input'
import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactNode, useId } from 'react'

/** Where a setting lives: your config dir, the repo (checked in), or the repo's local, git-ignored file. */
export type ConfigScope = 'user' | 'project' | 'local'

export const SCOPES: { value: ConfigScope; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'project', label: 'Project' },
  { value: 'local', label: 'Local' },
]

export const SCOPE_NOTE: Record<ConfigScope, string> = {
  user: 'Every project, for this profile only.',
  project: 'Checked in: everyone working in the repo.',
  local: 'This repo, on this machine only; git-ignored.',
}

/** The settings file a scope writes. */
export function settingsFile(scope: ConfigScope, configDir: string) {
  if (scope === 'project') return '.claude/settings.json'
  if (scope === 'local') return '.claude/settings.local.json'
  return `${configDir}/settings.json`
}

/** A label over its control, with a hint or an error under it. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string
  /** The control, given the id its label points at. */
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
      <Label htmlFor={id} invalid={Boolean(error)}>
        {label}
      </Label>
      {children(id)}
      {(error || hint) && (
        <span className={cn('text-caption', error ? 'text-destructive' : 'text-muted-foreground')}>
          {error ?? hint}
        </span>
      )}
    </div>
  )
}

/** A caption over a control that has no single input to label: a segmented pick, a list. */
export function Fieldset({ legend, hint, children }: { legend: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-[var(--space-1)] border-0 p-0">
      <legend className="mb-[var(--space-1)] p-0 text-caption text-muted-foreground">{legend}</legend>
      {children}
      {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
    </fieldset>
  )
}

/** A segmented pick over a few values, on subtle Tabs. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onValueChange: (value: T) => void
}) {
  return (
    <Tabs variant="subtle" value={value} onValueChange={next => onValueChange(next as T)} className="self-start">
      <Tabs.List aria-label={label}>
        {options.map(o => (
          <Tabs.Item key={o.value} value={o.value} label={o.label} />
        ))}
      </Tabs.List>
    </Tabs>
  )
}
