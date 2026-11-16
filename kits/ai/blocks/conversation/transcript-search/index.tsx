/*!
 * Local addition: the AI app's search across transcripts. A query field,
 * project / profile / date filters, and the matching lines grouped by
 * session with a line of context on each side. The input keeps focus while
 * the arrow keys move one fluid highlight through the hits, as Command's
 * list does; Enter opens the hit.
 */

'use client'

import { FluidHoverHighlight, useFluidHover, useRegisterFluidHoverItem } from '@justanarthur/modo-ui'
import Kbd from '@justanarthur/modo-ui/components/kbd'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/scroll-area'
import { type KeyboardEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react'
import { useIcon } from '../../../lib/icons'
import type { Profile, Project } from '../../../lib/types'

export interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  /** The message's text; a hit is one of its lines. */
  text: string
  /** When it was sent, as it reads ("14:02", "Mon"). */
  when: string
}

export interface TranscriptSession {
  id: string
  title: string
  /** The project's path, matched against `projects`. */
  project: string
  /** The profile id it ran under. */
  profile: string
  /** Days since its last message; the date filter reads it. */
  daysAgo: number
  messages: TranscriptMessage[]
}

export type TranscriptDateRange = 'any' | 'today' | 'week' | 'month'

/** The filters' "all" value: Select reads an empty string as no value. */
const ALL = '*'

const RANGES: TranscriptDateRange[] = ['any', 'today', 'week', 'month']

const RANGE_DAYS: Record<TranscriptDateRange, number> = {
  any: Number.POSITIVE_INFINITY,
  today: 0,
  week: 7,
  month: 30,
}

const RANGE_LABEL: Record<TranscriptDateRange, string> = {
  any: 'Any time',
  today: 'Today',
  week: 'Past 7 days',
  month: 'Past 30 days',
}

const ROLE_LABEL: Record<TranscriptMessage['role'], string> = { user: 'You', assistant: 'Claude', tool: 'Tool' }

/** Hits shown per session before the rest fold into "+N more". */
const PER_SESSION = 4

interface Hit {
  session: TranscriptSession
  message: TranscriptMessage
  before?: string
  line: string
  after?: string
}

function search(sessions: TranscriptSession[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return sessions
    .map(session => {
      const hits: Hit[] = []
      for (const message of session.messages) {
        const lines = message.text.split('\n')
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(q))
            hits.push({ session, message, before: lines[i - 1], line, after: lines[i + 1] })
        })
      }
      return { session, hits }
    })
    .filter(group => group.hits.length > 0)
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let from = 0
  for (let at = text.toLowerCase().indexOf(q, from); q && at !== -1; at = text.toLowerCase().indexOf(q, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false })
    parts.push({ text: text.slice(at, at + q.length), match: true })
    from = at + q.length
  }
  parts.push({ text: text.slice(from), match: false })
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-glyph bg-status-warning/16 text-foreground">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  )
}

function HitRow({
  hit,
  query,
  index,
  active,
  id,
  register,
  onHover,
  onOpen,
}: {
  hit: Hit
  query: string
  index: number
  active: boolean
  id: string
  register: (index: number, element: HTMLElement | null) => void
  onHover: (index: number) => void
  onOpen: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const shape = useShape()
  useRegisterFluidHoverItem(register, index, ref)

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the query field keeps focus and drives the keys (aria-activedescendant), as a combobox's options do
    <div
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onPointerMove={() => onHover(index)}
      onClick={onOpen}
      className={cn(
        'relative z-10 flex cursor-pointer gap-[var(--space-3)] px-[var(--space-2)] py-[var(--space-2)] text-caption',
        shape.item,
      )}
    >
      <span className="w-12 shrink-0 text-muted-foreground">{ROLE_LABEL[hit.message.role]}</span>
      <span className="flex min-w-0 flex-1 flex-col font-mono">
        {hit.before && <span className="truncate text-muted-foreground">{hit.before}</span>}
        <span className="truncate text-foreground">
          <Highlighted text={hit.line} query={query} />
        </span>
        {hit.after && <span className="truncate text-muted-foreground">{hit.after}</span>}
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground">{hit.message.when}</span>
    </div>
  )
}

interface TranscriptSearchPanelProps {
  /** The transcripts to search. */
  sessions: TranscriptSession[]
  /** The projects the filter offers. */
  projects: Project[]
  /** The profiles the filter offers. */
  profiles: Profile[]
  /** Controlled query. Pair with `onQueryChange`. */
  query?: string
  /** The query it starts with. Defaults to `''`. */
  defaultQuery?: string
  /** Called as the query changes. */
  onQueryChange?: (query: string) => void
  /** The project path it starts filtered to; empty for all. Defaults to `''`. */
  defaultProject?: string
  /** The profile id it starts filtered to; empty for all. Defaults to `''`. */
  defaultProfile?: string
  /** The date range it starts with. Defaults to `'any'`. */
  defaultRange?: TranscriptDateRange
  /** Called with the hit's session and message when a hit is opened (a click, or Enter on the lit one). */
  onOpen?: (sessionId: string, messageId: string) => void
  /** Classes for the root. */
  className?: string
}

/** The search on its own, without the Dialog: the field, the filters and the hits. */
function TranscriptSearchPanel({
  sessions,
  projects,
  profiles,
  query,
  defaultQuery = '',
  onQueryChange,
  defaultProject = '',
  defaultProfile = '',
  defaultRange = 'any',
  onOpen,
  className,
}: TranscriptSearchPanelProps) {
  const [q, setQ] = useControllableState(query, defaultQuery, onQueryChange)
  const [project, setProject] = useState(defaultProject || ALL)
  const [profile, setProfile] = useState(defaultProfile || ALL)
  const [range, setRange] = useState<TranscriptDateRange>(defaultRange)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { itemRects, isMeasured, registerItem } = useFluidHover(containerRef)
  const shape = useShape()
  const listId = useId()
  const SearchIcon = useIcon('search')

  const scoped = sessions.filter(
    s =>
      (project === ALL || s.project === project) &&
      (profile === ALL || s.profile === profile) &&
      s.daysAgo <= RANGE_DAYS[range],
  )
  const groups = search(scoped, q).map(g => ({ ...g, shown: g.hits.slice(0, PER_SESSION) }))
  const hits = groups.flatMap(g => g.shown)
  const current = Math.min(active, hits.length - 1)
  const rect = isMeasured && current >= 0 ? (itemRects[current] ?? null) : null
  const total = groups.reduce((n, g) => n + g.hits.length, 0)

  const open = (hit: Hit | undefined) => hit && onOpen?.(hit.session.id, hit.message.id)
  const onKeyDown = (event: KeyboardEvent) => {
    if (hits.length === 0) return
    const step = (by: number) => setActive(a => (Math.min(a, hits.length - 1) + by + hits.length) % hits.length)
    if (event.key === 'ArrowDown') step(1)
    else if (event.key === 'ArrowUp') step(-1)
    else if (event.key === 'Home') setActive(0)
    else if (event.key === 'End') setActive(hits.length - 1)
    else if (event.key === 'Enter') open(hits[current])
    else return
    event.preventDefault()
  }

  const projectLabel = (path: string) => projects.find(p => p.path === path)?.label ?? path
  const profileLabel = (id: string) => profiles.find(p => p.id === id)?.name ?? id
  let index = 0

  return (
    <div className={cn('flex min-h-0 flex-col gap-[var(--space-3)]', className)}>
      <Input
        autoFocus
        variant="bordered"
        icon={SearchIcon}
        placeholder="Search every transcript…"
        aria-label="Search transcripts"
        role="combobox"
        aria-expanded={hits.length > 0}
        aria-controls={listId}
        aria-activedescendant={current >= 0 ? `${listId}-${current}` : undefined}
        value={q}
        onValueChange={value => {
          setQ(value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
      />

      <div className="flex flex-wrap items-center gap-[var(--space-1)]">
        <Select value={project} onValueChange={setProject} size="compact">
          <Select.Trigger variant="borderless" aria-label="Project" />
          <Select.Content>
            {[{ label: 'All projects', path: ALL }, ...projects].map((p, i) => (
              <Select.Item key={p.path} index={i} value={p.path}>
                {p.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Select value={profile} onValueChange={setProfile} size="compact">
          <Select.Trigger variant="borderless" aria-label="Profile" />
          <Select.Content>
            {[{ name: 'All profiles', id: ALL }, ...profiles].map((p, i) => (
              <Select.Item key={p.id} index={i} value={p.id}>
                {p.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Select value={range} onValueChange={value => setRange(RANGES.find(r => r === value) ?? 'any')} size="compact">
          <Select.Trigger variant="borderless" aria-label="Date" />
          <Select.Content>
            {RANGES.map((r, i) => (
              <Select.Item key={r} index={i} value={r}>
                {RANGE_LABEL[r]}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        {q.trim() && (
          <span
            aria-live="polite"
            className="ml-auto pr-[var(--space-2)] text-caption tabular-nums text-muted-foreground"
          >
            {total === 0
              ? 'No matches'
              : `${total} ${total === 1 ? 'match' : 'matches'} in ${groups.length} ${groups.length === 1 ? 'session' : 'sessions'}`}
          </span>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
        <div
          ref={containerRef}
          id={listId}
          role="listbox"
          aria-label="Matches"
          className="@container relative flex flex-col gap-[var(--space-3)]"
        >
          <FluidHoverHighlight rect={rect} session={0} className={shape.bg} />
          {groups.map(group => (
            <section key={group.session.id} aria-label={group.session.title} className="flex flex-col">
              <div className="flex items-baseline gap-[var(--space-2)] px-[var(--space-2)] pb-[var(--space-1)]">
                <span className="min-w-0 truncate text-body weight-medium text-foreground">{group.session.title}</span>
                <span className="min-w-0 truncate text-caption text-muted-foreground">
                  {projectLabel(group.session.project)} · {profileLabel(group.session.profile)}
                </span>
                <span className="ml-auto shrink-0 text-caption tabular-nums text-muted-foreground">
                  {group.hits.length > group.shown.length ? `+${group.hits.length - group.shown.length} more` : ''}
                </span>
              </div>
              {group.shown.map(hit => {
                const i = index++
                return (
                  <HitRow
                    key={`${hit.message.id}-${hit.line}`}
                    hit={hit}
                    query={q}
                    index={i}
                    id={`${listId}-${i}`}
                    active={i === current}
                    register={registerItem}
                    onHover={setActive}
                    onOpen={() => open(hit)}
                  />
                )
              })}
            </section>
          ))}
          {q.trim() && total === 0 && (
            <span className="px-[var(--space-4)] py-[var(--space-6)] text-center text-body text-muted-foreground">
              Nothing in {scoped.length} {scoped.length === 1 ? 'transcript' : 'transcripts'} says “{q.trim()}”.
            </span>
          )}
          {!q.trim() && (
            <span className="px-[var(--space-4)] py-[var(--space-6)] text-center text-body text-muted-foreground">
              Search what you asked, what Claude answered and what the tools printed, across {scoped.length}{' '}
              {scoped.length === 1 ? 'session' : 'sessions'}.
            </span>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center gap-[var(--space-3)] px-[var(--space-2)] text-caption text-muted-foreground">
        <span className="flex items-center gap-[var(--space-1)]">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span className="flex items-center gap-[var(--space-1)]">
          <Kbd>↵</Kbd> open
        </span>
        <span className="flex items-center gap-[var(--space-1)]">
          <Kbd>Esc</Kbd> close
        </span>
      </div>
    </div>
  )
}

interface TranscriptSearchProps {
  /** The transcripts to search. */
  sessions: TranscriptSession[]
  /** The projects the filter offers. */
  projects: Project[]
  /** The profiles the filter offers. */
  profiles: Profile[]
  /** The control that opens it. */
  trigger?: ReactElement
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** The query it starts with. Defaults to `''`. */
  defaultQuery?: string
  /** The project path it starts filtered to; empty for all. Defaults to `''`. */
  defaultProject?: string
  /** The profile id it starts filtered to; empty for all. Defaults to `''`. */
  defaultProfile?: string
  /** The date range it starts with. Defaults to `'any'`. */
  defaultRange?: TranscriptDateRange
  /** Called with the hit's session and message when a hit is opened; the dialog closes. */
  onOpen?: (sessionId: string, messageId: string) => void
}

/**
 * Searches every session's transcript at once: what you asked, what Claude
 * answered, what the tools printed.
 *
 * Each matching line shows with the line before and after it, the match
 * marked, grouped under its session with the session's project and profile.
 * Narrow it by project, by profile, or to today, the past week or the past
 * month. The field keeps focus: the arrow keys move one highlight through
 * the hits (Home and End jump), the pointer moves it too, and Enter or a
 * click hands the session and message to `onOpen` and closes the dialog.
 * The dialog sits near the top so it keeps still while the hits change;
 * `TranscriptSearch.Panel` is the same search without it.
 *
 * Statics:
 * - `TranscriptSearch.Panel` — the search on its own: the same props, minus the dialog's.
 *
 * @example {@include ./examples.mdx}
 */
const TranscriptSearch = Object.assign(
  function TranscriptSearch({
    trigger,
    open,
    defaultOpen = false,
    onOpenChange,
    onOpen,
    ...panel
  }: TranscriptSearchProps) {
    const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <Dialog.Trigger render={trigger} />}
        <Dialog.Content
          width="xl"
          position="top"
          aria-label="Search transcripts"
          className="flex h-[min(560px,76dvh)] flex-col p-4"
        >
          <TranscriptSearchPanel
            {...panel}
            className="flex-1"
            onOpen={(sessionId, messageId) => {
              onOpen?.(sessionId, messageId)
              setOpen(false)
            }}
          />
        </Dialog.Content>
      </Dialog>
    )
  },
  { Panel: TranscriptSearchPanel },
)

export type { TranscriptSearchPanelProps, TranscriptSearchProps }
export { TranscriptSearch, TranscriptSearchPanel }

export default TranscriptSearch
