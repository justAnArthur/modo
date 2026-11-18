/*!
 * Local addition: a notch app's plugin library, the listing and one plugin's
 * page, for a page of the settings window. Presentational: the entries, their
 * states and the permissions' explanations come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import List from '@justanarthur/modo-ui/components/data-display/list'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import Progress from '@justanarthur/modo-ui/components/feedback/progress'
import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Skeleton from '@justanarthur/modo-ui/primitives/content/skeleton'
import { ChevronLeft, ChevronRight, Globe, Library, Puzzle, ShieldCheck, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'

/** Where a plugin stands: on the shelf, installed, behind, unusable here, on its way in, or failed. */
type LibraryEntryState =
  | { status: 'not-installed' }
  | { status: 'installed' }
  | { status: 'update-available'; from: string; to: string }
  | { status: 'incompatible'; reason: string }
  | { status: 'installing'; progress: number; phase: string }
  | { status: 'error'; message: string }

interface LibraryEntry {
  id: string
  name: string
  /** The library's version. */
  version: string
  /** One line on what it adds. */
  description: string
  /** Who publishes it. */
  author?: string
  /** Its glyph, or an image URL. Defaults to a puzzle piece. */
  icon?: IconComponent | string
  /** The permission ids it asks for; `permissionInfo` names and explains them. */
  permissions?: string[]
  /** The hosts it talks to, such as `api.github.com`. */
  hosts?: string[]
  state: LibraryEntryState
  /** The full description, on its page. Defaults to `description`. */
  details?: ReactNode
  /** Screenshots on its page, each an image (or any node) the frame crops to 16:10. */
  screenshots?: ReactNode[]
  /** Its source repository's URL, linked on its page. */
  source?: string
}

interface LibraryPermission {
  /** A short name, on the chip and the row. */
  label: string
  /** What the plugin can do with it, in plain words. */
  description: string
}

interface LibraryActions {
  /** Called by Install, and by Retry on an entry that failed. */
  onInstall?: (id: string) => void
  /** Called by Update. */
  onUpdate?: (id: string) => void
  /** Called by Uninstall. */
  onUninstall?: (id: string) => void
}

interface LibraryListingProps extends LibraryActions {
  /** The library's plugins, in the order shown. Defaults to `[]`. */
  entries?: LibraryEntry[]
  /** Names and explanations of the permissions, by id; an unknown id shows as itself. Defaults to `{}`. */
  permissionInfo?: Record<string, LibraryPermission>
  /** Called with an entry's id by its chevron, to open its page. */
  onOpen?: (id: string) => void
  /** The library is being fetched: placeholder rows. Defaults to `false`. */
  loading?: boolean
  /** The library couldn't be fetched: this line, in place of the list. */
  error?: ReactNode
  /** Called by Try Again under `error`; without it the button hides. */
  onRetry?: () => void
  /** The caption over the list. Defaults to `'Available'`. */
  title?: string
  /** Classes for the root. */
  className?: string
}

interface LibraryDetailProps extends LibraryActions {
  entry: LibraryEntry
  /** Names and explanations of the permissions, by id. Defaults to `{}`. */
  permissionInfo?: Record<string, LibraryPermission>
  /** Called by the back button; without it the button hides. */
  onBack?: () => void
  /** The back button's label. Defaults to `'Library'`. */
  backLabel?: string
  /** Called with `source` by its link; without it the link opens in a new tab. */
  onOpenSource?: (url: string) => void
  /** Classes for the root. */
  className?: string
}

function EntryIcon({ icon = Puzzle, size }: { icon?: IconComponent | string; size: 'row' | 'hero' }) {
  const shape = useShape()

  if (typeof icon === 'string')
    return (
      <img
        src={icon}
        alt=""
        className={cn('shrink-0 object-cover', size === 'row' ? 'size-4 rounded-sm' : cn('size-12', shape.container))}
      />
    )

  const Icon = icon
  if (size === 'row') return <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center bg-muted text-muted-foreground ring-1 ring-border',
        shape.container,
      )}
    >
      <Icon size={24} strokeWidth={1.5} />
    </span>
  )
}

function StateBadge({ state }: { state: LibraryEntryState }) {
  if (state.status === 'installed') return <Badge size="compact">Installed</Badge>
  if (state.status === 'update-available')
    return (
      <Badge size="compact" color="blue">
        Update
      </Badge>
    )
  if (state.status === 'incompatible')
    return (
      <Badge size="compact" color="amber">
        Incompatible
      </Badge>
    )
  if (state.status === 'error')
    return (
      <Badge size="compact" color="red">
        Failed
      </Badge>
    )
  return null
}

/** The version, or the step an update takes. */
function versionOf(entry: LibraryEntry) {
  return entry.state.status === 'update-available' ? `${entry.state.from} → ${entry.state.to}` : entry.version
}

/** Why the entry can't be used as it is: an incompatibility or a failure, else nothing. */
function Problem({ state }: { state: LibraryEntryState }) {
  if (state.status === 'incompatible') return <span className="text-status-warning">{state.reason}</span>
  if (state.status === 'error') return <span className="text-status-error">{state.message}</span>
  return null
}

function EntryAction({ entry, onInstall, onUpdate, onUninstall }: LibraryActions & { entry: LibraryEntry }) {
  const { state } = entry

  if (state.status === 'not-installed')
    return (
      <Button variant="secondary" size="compact" onClick={() => onInstall?.(entry.id)}>
        Install
      </Button>
    )

  if (state.status === 'update-available')
    return (
      <Button variant="secondary" size="compact" onClick={() => onUpdate?.(entry.id)}>
        Update
      </Button>
    )

  if (state.status === 'installed')
    return (
      <Button variant="ghost" size="compact" onClick={() => onUninstall?.(entry.id)}>
        Uninstall
      </Button>
    )

  if (state.status === 'error')
    return (
      <Button variant="ghost" size="compact" onClick={() => onInstall?.(entry.id)}>
        Retry
      </Button>
    )

  if (state.status === 'installing')
    return (
      <span className="flex min-w-0 items-center gap-2 pr-3">
        <span className="truncate text-caption text-muted-foreground">{state.phase}</span>
        <Progress
          className="w-20 shrink-0"
          value={state.progress}
          max={1}
          aria-label={`Installing ${entry.name}: ${state.phase}`}
        />
      </span>
    )

  return null
}

function Chips({ entry, permissionInfo }: { entry: LibraryEntry; permissionInfo: Record<string, LibraryPermission> }) {
  const permissions = entry.permissions ?? []
  const hosts = entry.hosts ?? []
  if (permissions.length === 0 && hosts.length === 0) return null

  return (
    <span className="flex flex-wrap gap-1">
      {permissions.map(id => (
        <Badge key={id} variant="outline" size="compact">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            {permissionInfo[id]?.label ?? id}
          </span>
        </Badge>
      ))}
      {hosts.map(host => (
        <Badge key={host} variant="outline" size="compact">
          <span className="inline-flex items-center gap-1">
            <Globe size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            {host}
          </span>
        </Badge>
      ))}
    </span>
  )
}

function LibraryDetail({
  entry,
  permissionInfo = {},
  onBack,
  backLabel = 'Library',
  onOpenSource,
  onInstall,
  onUpdate,
  onUninstall,
  className,
}: LibraryDetailProps) {
  const shape = useShape()
  const { state } = entry
  const permissions = entry.permissions ?? []
  const hosts = entry.hosts ?? []
  const screenshots = entry.screenshots ?? []

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {onBack && (
        <Button
          variant="ghost"
          size="compact"
          className="-ml-2.5 self-start"
          leadingIcon={ChevronLeft}
          onClick={onBack}
        >
          {backLabel}
        </Button>
      )}

      <div className="flex items-center gap-4">
        <EntryIcon icon={entry.icon} size="hero" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-subtitle weight-semibold text-foreground">{entry.name}</span>
            <StateBadge state={state} />
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {[versionOf(entry), entry.author && `by ${entry.author}`].filter(Boolean).join(' · ')}
          </span>
        </div>
        {state.status !== 'installing' && (
          <div className="flex shrink-0 items-center gap-1">
            {state.status === 'update-available' && (
              <Button variant="ghost" size="compact" onClick={() => onUninstall?.(entry.id)}>
                Uninstall
              </Button>
            )}
            <EntryAction entry={entry} onInstall={onInstall} onUpdate={onUpdate} onUninstall={onUninstall} />
          </div>
        )}
      </div>

      {state.status === 'installing' && (
        <Progress label={state.phase} showValue value={state.progress} max={1} format={{ style: 'percent' }} />
      )}
      {(state.status === 'incompatible' || state.status === 'error') && (
        <p className="m-0 text-body">
          <Problem state={state} />
        </p>
      )}

      {screenshots.length > 0 && (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
          {screenshots.map((shot, i) => (
            <div
              key={i}
              className={cn(
                'aspect-[16/10] w-64 shrink-0 snap-start overflow-hidden ring-1 ring-border [&>img]:size-full [&>img]:object-cover',
                shape.container,
              )}
            >
              {shot}
            </div>
          ))}
        </div>
      )}

      <div className="text-body text-foreground">{entry.details ?? entry.description}</div>

      <List>
        {permissions.length > 0 && (
          <List.Section title="Permissions">
            {permissions.map(id => (
              <List.Row
                key={id}
                label={
                  <span className="flex min-w-0 items-center gap-2">
                    <ShieldCheck size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{permissionInfo[id]?.label ?? id}</span>
                  </span>
                }
                description={permissionInfo[id]?.description}
              />
            ))}
          </List.Section>
        )}
        {hosts.length > 0 && (
          <List.Section title="Network">
            {hosts.map(host => (
              <List.Row
                key={host}
                label={
                  <span className="flex min-w-0 items-center gap-2">
                    <Globe size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{host}</span>
                  </span>
                }
              />
            ))}
          </List.Section>
        )}
        <List.Section title="Information">
          <List.Row label={<span className="text-muted-foreground">Version</span>}>
            <span className="min-w-0 truncate pr-3 text-body text-foreground">{versionOf(entry)}</span>
          </List.Row>
          {entry.author && (
            <List.Row label={<span className="text-muted-foreground">Author</span>}>
              <span className="min-w-0 truncate pr-3 text-body text-foreground">{entry.author}</span>
            </List.Row>
          )}
          {entry.source && (
            <List.Row label={<span className="text-muted-foreground">Source</span>}>
              <Button
                variant="link"
                className="min-w-0 pr-3"
                render={<a href={entry.source} target="_blank" rel="noreferrer" />}
                onClick={event => {
                  if (!onOpenSource || !entry.source) return
                  event.preventDefault()
                  onOpenSource(entry.source)
                }}
              >
                <span className="truncate">{entry.source.replace(/^https?:\/\//, '')}</span>
              </Button>
            </List.Row>
          )}
        </List.Section>
      </List>
    </div>
  )
}

/**
 * A notch app's plugin library: what can be installed, what's installed and
 * what's behind, each plugin's own page, for a page of the settings window.
 *
 * Rows on the settings window's rhythm (a modo-ui List): the plugin's glyph,
 * name and version, a Badge for where it stands, its line, outline chips for
 * the permissions it asks for and the hosts it talks to, and its author. At
 * the row's end its action (Install, Update, Uninstall, or Retry after a
 * failure), or, while it installs, the phase and a Progress bar, and a
 * chevron to its page. An incompatible plugin says why, in place of an
 * action; a failed one shows its error.
 *
 * `LibraryListing.Detail` is one plugin's page: its glyph, name, version and
 * author with the action, the screenshots in a row that scrolls, the full
 * description, then the permissions explained in plain words, the hosts and
 * the source link.
 *
 * While `loading` the rows are placeholders; with `error` (the library is
 * offline) a line and Try Again stand in for the list; an empty library
 * says so. Nothing is fetched or kept here: the entries, their states and
 * the permissions' explanations come in as props, and the host decides
 * which page shows (`onOpen`, `onBack`).
 *
 * Statics:
 * - `LibraryListing.Detail` — one plugin's page: `entry`, `permissionInfo`,
 *   the actions, `onBack`, `onOpenSource`.
 *
 * @example {@include ./examples.mdx}
 */
const LibraryListing = Object.assign(
  function LibraryListing({
    entries = [],
    permissionInfo = {},
    onOpen,
    loading = false,
    error,
    onRetry,
    title = 'Available',
    onInstall,
    onUpdate,
    onUninstall,
    className,
  }: LibraryListingProps) {
    if (error)
      return (
        <EmptyState
          className={className}
          icon={WifiOff}
          title="Library unavailable"
          description={error}
          actions={
            onRetry && (
              <Button variant="secondary" size="compact" onClick={onRetry}>
                Try Again
              </Button>
            )
          }
        />
      )

    if (loading)
      return (
        <List className={className}>
          <List.Section title={title}>
            {[0, 1, 2].map(i => (
              <List.Row
                key={i}
                label={
                  <span className="flex items-center gap-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-3 w-28" />
                  </span>
                }
                description={<Skeleton className="h-3 w-64" />}
              />
            ))}
          </List.Section>
        </List>
      )

    if (entries.length === 0)
      return (
        <EmptyState
          className={className}
          icon={Library}
          title="No plugins yet"
          description="The library has nothing to install right now."
        />
      )

    return (
      <List className={className}>
        <List.Section title={title} aside={`${entries.length}`}>
          {entries.map(entry => (
            <List.Row
              key={entry.id}
              label={
                <span className="flex min-w-0 items-center gap-2">
                  <EntryIcon icon={entry.icon} size="row" />
                  <span className="truncate">{entry.name}</span>
                  <span className="shrink-0 text-caption text-muted-foreground">{versionOf(entry)}</span>
                  <StateBadge state={entry.state} />
                </span>
              }
              description={
                <span className="flex flex-col gap-1.5">
                  <span>
                    {entry.description}
                    {entry.author && <span> · by {entry.author}</span>}
                  </span>
                  <Problem state={entry.state} />
                  <Chips entry={entry} permissionInfo={permissionInfo} />
                </span>
              }
            >
              <EntryAction entry={entry} onInstall={onInstall} onUpdate={onUpdate} onUninstall={onUninstall} />
              {onOpen && (
                <Button variant="ghost" size="icon" aria-label={`About ${entry.name}`} onClick={() => onOpen(entry.id)}>
                  <ChevronRight />
                </Button>
              )}
            </List.Row>
          ))}
        </List.Section>
      </List>
    )
  },
  { Detail: LibraryDetail },
)

export default LibraryListing

export type {
  LibraryActions,
  LibraryDetailProps,
  LibraryEntry,
  LibraryEntryState,
  LibraryListingProps,
  LibraryPermission,
}
export { LibraryDetail, LibraryListing }
