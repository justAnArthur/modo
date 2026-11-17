/*!
 * Local addition: a notch app's recent files, the newest download or
 * screenshot as the hero and the ones before it beside it, ready to open or
 * drag out. Presentational: the files and what to do with them come in as
 * props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import type { SizeVariant } from '@justanarthur/modo-ui/lib/size-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useLift } from '@justanarthur/modo-ui/lib/surface-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Camera,
  Copy,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  FolderSearch,
  Trash2,
  X,
} from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'
import IslandFlash from '../../../components/island/island-flash'
import Widget from '../../../components/island/widget'
import { MINUTE, useEdgeClock } from '../../../lib/clock'

type RecentFilesSource = 'downloads' | 'screenshots'

interface RecentFile {
  /** What tells it apart: its path. */
  id: string
  /** Its name, with the extension: it picks the glyph when there is no thumbnail. */
  name: string
  /** Its size, in bytes. */
  size: number
  /** When it landed, in epoch ms. */
  addedAt: number
  /** The folder it is in. */
  source: RecentFilesSource
  /** A preview: an image URL, or any element. */
  thumbnail?: string | ReactNode
  /** Where a download came from: a site's domain. */
  from?: string
}

interface RecentDownload {
  /** What tells it apart. */
  id: string
  /** The file's name. */
  name: string
  /** Bytes in so far. */
  received: number
  /** The file's size, in bytes. */
  total: number
  /** The current speed, in bytes per second. */
  rate: number
  /** Where it comes from: a site's domain. */
  from?: string
}

interface RecentFilesProps {
  /** The files of both folders, in any order: each folder lists newest first. */
  files: RecentFile[]
  /** A download under way: it takes the hero on Downloads, with its progress and speed. */
  download?: RecentDownload | null
  /** The folder shown (controlled). */
  value?: RecentFilesSource
  /** The folder shown at first (uncontrolled). Defaults to `'downloads'`. */
  defaultValue?: RecentFilesSource
  /** Called with the folder when the switch is pressed. */
  onValueChange?: (source: RecentFilesSource) => void
  /** Called by Open, or a press on a file in the list. */
  onOpen?: (file: RecentFile) => void
  /** Called by Show in Finder. */
  onReveal?: (file: RecentFile) => void
  /** Called by Copy, to put the file on the clipboard. */
  onCopy?: (file: RecentFile) => void
  /** Called when a file starts to be dragged out, with the drag event, for the host to start a native drag. Without it nothing drags. */
  onDragStart?: (file: RecentFile, event: DragEvent) => void
  /** Called by Move to Trash. */
  onDelete?: (file: RecentFile) => void
  /** Called by Clear with the folder whose list to clear; without it the button hides. */
  onClear?: (source: RecentFilesSource) => void
  /** Called by the download's Cancel. */
  onCancelDownload?: (download: RecentDownload) => void
  /** The moment the times are read at, in epoch ms. Defaults to now, re-read on each minute. */
  now?: number
  /** Step on the size ladder. Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root, which fills its container. */
  className?: string
}

const SOURCE_LABEL: Record<RecentFilesSource, string> = { downloads: 'Downloads', screenshots: 'Screenshots' }
const SOURCE_ICON: Record<RecentFilesSource, IconComponent> = { downloads: ArrowDownToLine, screenshots: Camera }

/** Rows the downloads list shows, and tiles the screenshots grid, before saying how many more. */
const ROWS = 3
const TILES = 6

const TYPES: [RegExp, IconComponent][] = [
  [/\.(png|jpe?g|gif|webp|heic|svg|tiff?)$/i, FileImage],
  [/\.(mov|mp4|m4v|avi|mkv|webm)$/i, FileVideo],
  [/\.(mp3|m4a|wav|aiff?|flac|ogg)$/i, FileAudio],
  [/\.(zip|tar|gz|tgz|rar|7z|dmg|xip)$/i, FileArchive],
  [/\.(m?[jt]sx?|json|css|html|swift|rs|go|py|rb|sh|ya?ml|toml)$/i, FileCode],
  [/\.(pdf|md|txt|rtf|docx?|pages|key|numbers|csv)$/i, FileText],
]

/** The glyph for a file's type, from its name's extension. */
const iconFor = (name: string) => TYPES.find(([pattern]) => pattern.test(name))?.[1] ?? File

/** Bytes as `2.4 MB`, `840 KB` or `1.2 GB`. */
function bytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${n >= 100e6 ? Math.round(n / 1e6) : (n / 1e6).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1e3))} KB`
}

/** Bytes in of a total, in the total's unit: `48 of 120 MB`. */
function part(n: number, total: number) {
  const [unit, scale] = total >= 1e9 ? ['GB', 1e9] : total >= 1e6 ? ['MB', 1e6] : ['KB', 1e3]
  const digits = total / scale < 10 ? 1 : 0
  return `${(n / scale).toFixed(digits)} of ${(total / scale).toFixed(digits)} ${unit}`
}

/** How long ago, as a phrase: `just now`, `12 min ago`, `2 h ago`, `3 d ago`. */
function ago(ms: number) {
  const minutes = Math.floor(ms / MINUTE)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`
  return `${Math.floor(minutes / (24 * 60))} d ago`
}

/** How long ago, as a row's figure: `now`, `12 min`, `2 h`, `3 d`. */
function short(ms: number) {
  const minutes = Math.floor(ms / MINUTE)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes} min`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h`
  return `${Math.floor(minutes / (24 * 60))} d`
}

/** Seconds as `11 s left`, `4 min left`. */
function left(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} s left`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min left`
  return `${Math.floor(seconds / 3600)} h ${Math.ceil((seconds % 3600) / 60)} min left`
}

/** Drag props for a file, when the host takes drags. */
const dragOf = (file: RecentFile, onDragStart?: RecentFilesProps['onDragStart']) =>
  onDragStart ? { draggable: true, onDragStart: (event: DragEvent) => onDragStart(file, event) } : {}

// Literal tables: UnoCSS only generates the classes it can read whole.
const TILE = { default: 'size-24 rounded-xl', compact: 'size-20 rounded-xl' }

function Thumbnail({
  file,
  className,
  glyph = 28,
}: {
  file: { name: string; thumbnail?: string | ReactNode }
  className: string
  glyph?: number
}) {
  const level = useLift(1)
  const Icon = iconFor(file.name)
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden text-muted-foreground',
        file.thumbnail == null && SURFACE_BG[level],
        className,
      )}
    >
      {typeof file.thumbnail === 'string' ? (
        <img alt="" src={file.thumbnail} draggable={false} className="size-full object-cover" />
      ) : (
        (file.thumbnail ?? <Icon size={glyph} strokeWidth={1.25} />)
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-border ring-inset"
      />
    </span>
  )
}

interface HeroProps {
  file: RecentFile
  now: number
  props: RecentFilesProps
}

/** The newest file: its name, size, age and where it came from, Show in Finder, Copy, Move to Trash and Open. */
function Hero({ file, now, props }: HeroProps) {
  const { onOpen, onReveal, onCopy, onDelete } = props
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title>{file.name}</Widget.Title>
        <Widget.Subtitle>
          {[bytes(file.size), ago(now - file.addedAt), file.from && `from ${file.from}`].filter(Boolean).join(' · ')}
        </Widget.Subtitle>
      </div>
      <div className="-mr-1 flex min-w-0 items-center justify-end gap-0.5">
        {onReveal && <Widget.Action icon={FolderSearch} label="Show in Finder" onClick={() => onReveal(file)} />}
        {onCopy && <Widget.Action icon={Copy} label="Copy" onClick={() => onCopy(file)} />}
        {onDelete && <Widget.Action icon={Trash2} label="Move to Trash" onClick={() => onDelete(file)} />}
        <Button
          variant="primary"
          size="compact"
          leadingIcon={ArrowUpRight}
          className="ml-1.5"
          onClick={() => onOpen?.(file)}
        >
          Open
        </Button>
      </div>
    </div>
  )
}

/** The download under way: its name, the progress as a line, how much, how fast and how long, and Cancel. */
function Downloading({
  download,
  onCancel,
}: {
  download: RecentDownload
  onCancel?: (download: RecentDownload) => void
}) {
  const share = download.received / download.total
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <Widget.Title className="flex-1">{download.name}</Widget.Title>
        <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{Math.round(share * 100)}%</span>
        {onCancel && (
          <span className="-my-1 -mr-1 flex shrink-0">
            <Widget.Action icon={X} label="Cancel download" onClick={() => onCancel(download)} />
          </span>
        )}
      </div>
      <Meter variant="line" value={share} tone="default" label={`${download.name}, ${Math.round(share * 100)}%`} />
      <Widget.Meta>
        <Widget.MetaItem>{part(download.received, download.total)}</Widget.MetaItem>
        <Widget.MetaItem>{bytes(download.rate)}/s</Widget.MetaItem>
        <Widget.MetaItem>{left((download.total - download.received) / Math.max(1, download.rate))}</Widget.MetaItem>
      </Widget.Meta>
    </div>
  )
}

/** An empty folder's tile: its glyph one surface up. */
function Empty({ source, className }: { source: RecentFilesSource; className: string }) {
  const level = useLift(1)
  const Icon = SOURCE_ICON[source]
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center text-muted-foreground', SURFACE_BG[level], className)}
    >
      <Icon size={28} strokeWidth={1.25} />
    </span>
  )
}

interface ListProps {
  files: RecentFile[]
  now: number
  onOpen?: (file: RecentFile) => void
  onDragStart?: RecentFilesProps['onDragStart']
}

/** Earlier downloads as rows: how long ago, the file's glyph and name, its size. */
function Rows({ files, now, onOpen, onDragStart }: ListProps) {
  return (
    <FluidHover className="-mx-2 flex flex-col gap-0">
      {files.slice(0, ROWS).map((file, index) => {
        const Icon = iconFor(file.name)
        return (
          <FluidHover.Item
            key={file.id}
            index={index}
            title={file.name}
            className="h-7 px-2"
            onClick={() => onOpen?.(file)}
            {...dragOf(file, onDragStart)}
          >
            <Widget.Row className="w-full" leading={short(now - file.addedAt)} trailing={bytes(file.size)}>
              <span className="flex min-w-0 items-center gap-2">
                <Icon size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{file.name}</span>
              </span>
            </Widget.Row>
          </FluidHover.Item>
        )
      })}
    </FluidHover>
  )
}

/** Earlier screenshots as a grid of image tiles. */
function Tiles({ files, onOpen, onDragStart }: Omit<ListProps, 'now'>) {
  return (
    <FluidHover columns={3} className="-m-1 grid-cols-3 gap-0" highlightClassName="rounded-lg">
      {files.slice(0, TILES).map((file, index) => (
        <FluidHover.Item
          key={file.id}
          index={index}
          title={file.name}
          aria-label={file.name}
          className="min-h-0 p-1"
          onClick={() => onOpen?.(file)}
          {...dragOf(file, onDragStart)}
        >
          <Thumbnail file={file} glyph={16} className="aspect-[16/10] w-full rounded-md" />
        </FluidHover.Item>
      ))}
    </FluidHover>
  )
}

/** The compact island's left wing: the download glyph, or the camera for a screenshot. */
function RecentFilesLeading({ source = 'downloads' }: { source?: RecentFilesSource }) {
  const Icon = SOURCE_ICON[source]
  return <Icon size={16} strokeWidth={1.5} className="text-foreground" />
}

interface TrailingProps {
  /** A download under way: its progress shows. */
  download?: RecentDownload | null
  /** Otherwise, how many files came in since the island was open. */
  count?: number
}

/** The compact island's right wing: a download's progress, else the count of new files. */
function RecentFilesTrailing({ download, count = 0 }: TrailingProps) {
  return (
    <span className="text-caption weight-semibold tabular-nums text-foreground">
      {download ? `${Math.round((download.received / download.total) * 100)}%` : count}
    </span>
  )
}

/** The split island's bubble: a download's progress as a ring. */
function RecentFilesMinimal({ download }: { download: RecentDownload }) {
  const share = download.received / download.total
  return (
    <Meter
      variant="ring"
      className="size-5.5"
      size="compact"
      tone="default"
      value={share}
      label={`${download.name}, ${Math.round(share * 100)}%`}
    />
  )
}

interface SavedProps {
  /** The file that landed. */
  file: RecentFile
  /** Called by Open; without it the button hides. */
  onOpen?: (file: RecentFile) => void
}

/** The island's flash when a file lands: its thumbnail or glyph, `Downloaded` or `Screenshot saved`, and Open. */
function RecentFilesSaved({ file, onOpen }: SavedProps) {
  return (
    <IslandFlash
      icon={<Thumbnail file={file} glyph={16} className="size-9 rounded-lg" />}
      title={file.source === 'screenshots' ? 'Screenshot saved' : 'Downloaded'}
      caption={`${file.name} · ${bytes(file.size)}`}
      action={
        onOpen && (
          <Button variant="secondary" size="compact" onClick={() => onOpen(file)}>
            Open
          </Button>
        )
      }
    />
  )
}

/**
 * A notch app's recent files: the newest download or screenshot as the
 * hero, the ones before it beside it, ready to open or drag out.
 *
 * The hero is the folder's newest file: its thumbnail, or its type's
 * glyph on a tile, then its name, its size, how long ago it landed and
 * where it came from, with Show in Finder, Copy, Move to Trash and Open.
 * Beside it, past a hairline, a switch picks the folder, Downloads or
 * Screenshots (`value` / `defaultValue` / `onValueChange`), over the ones
 * before the newest: downloads as rows of age, glyph, name and size, and
 * screenshots as a grid of image tiles, since a screenshot is found by
 * its look. A press opens a file, and with `onDragStart` every picture and
 * row drags out (the host starts the native drag); Clear empties the list.
 *
 * While a download is under way (`download`) it takes the hero on
 * Downloads: its name, the progress as a modo-ui Meter line, how much is
 * in, the speed and the time left, and Cancel. An empty folder says what
 * will land in it, the switch still beside it.
 *
 * `RecentFiles.Leading` and `RecentFiles.Trailing` show the glyph and the
 * download's progress (or the count of new files) in the compact island's
 * wings, `RecentFiles.Minimal` the progress as a ring in the split
 * island's bubble, and `RecentFiles.Saved` is the flash when a file lands.
 *
 * @example {@include ./examples.mdx}
 */
const RecentFiles = Object.assign(
  function RecentFiles(props: RecentFilesProps) {
    const {
      files,
      download,
      value: valueProp,
      defaultValue = 'downloads',
      onValueChange,
      onOpen,
      onDragStart,
      onClear,
      onCancelDownload,
      now: nowProp,
      size,
      className,
    } = props
    const ticking = useEdgeClock(0, nowProp === undefined, MINUTE)
    const now = nowProp ?? ticking
    const [source, setSource] = useControllableState(valueProp, defaultValue, onValueChange)
    const step = size ?? 'default'

    const shown = files.filter(file => file.source === source).sort((a, b) => b.addedAt - a.addedAt)
    const active = source === 'downloads' ? download : undefined
    const [newest, ...rest] = shown
    const earlier = active ? shown : rest
    const limit = source === 'screenshots' ? TILES : ROWS

    const empty = !newest && !active
    const header = (
      <Widget.Header icon={SOURCE_ICON[source]}>
        {active
          ? ['Downloading', active.from].filter(Boolean).join(' · ')
          : [SOURCE_LABEL[source], shown.length && `${shown.length} ${shown.length === 1 ? 'file' : 'files'}`]
              .filter(Boolean)
              .join(' · ')}
      </Widget.Header>
    )

    const media = active ? (
      <Thumbnail file={active} className={TILE[step]} />
    ) : newest ? (
      <span {...dragOf(newest, onDragStart)} className={cn(onDragStart && 'cursor-grab')}>
        <Thumbnail file={newest} className={TILE[step]} />
      </span>
    ) : (
      <Empty source={source} className={TILE[step]} />
    )

    return (
      <Widget
        size={size}
        className={cn('h-full', className)}
        media={media}
        aside={
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Tabs
                variant="subtle"
                size="compact"
                value={source}
                onValueChange={v => setSource(v as RecentFilesSource)}
              >
                <Tabs.List className="-ml-2">
                  <Tabs.Item value="downloads" label="Downloads" />
                  <Tabs.Item value="screenshots" label="Screenshots" />
                </Tabs.List>
              </Tabs>
              <span className="flex shrink-0 items-center gap-1.5 text-caption tabular-nums text-muted-foreground">
                {earlier.length > limit && <span>{earlier.length - limit} more</span>}
                {onClear && !empty && (
                  <Button variant="ghost" size="compact" className="-mr-2 h-6 px-2" onClick={() => onClear(source)}>
                    Clear
                  </Button>
                )}
              </span>
            </div>
            {empty ? null : earlier.length === 0 ? (
              <span className="flex h-7 items-center text-body text-muted-foreground">Nothing earlier</span>
            ) : source === 'screenshots' ? (
              <Tiles files={earlier} onOpen={onOpen} onDragStart={onDragStart} />
            ) : (
              <Rows files={earlier} now={now} onOpen={onOpen} onDragStart={onDragStart} />
            )}
          </div>
        }
      >
        {header}
        {active ? (
          <Downloading download={active} onCancel={onCancelDownload} />
        ) : newest ? (
          <Hero file={newest} now={now} props={props} />
        ) : (
          <div className="flex min-w-0 flex-col gap-0.5">
            <Widget.Title>{source === 'downloads' ? 'No downloads yet' : 'No screenshots yet'}</Widget.Title>
            <span className="text-pretty text-caption text-muted-foreground">
              {source === 'downloads'
                ? 'Files you download land here, ready to open or drag out.'
                : 'Take one with ⇧⌘4 and it shows up here, ready to drag into a message.'}
            </span>
          </div>
        )}
      </Widget>
    )
  },
  {
    Leading: RecentFilesLeading,
    Trailing: RecentFilesTrailing,
    Minimal: RecentFilesMinimal,
    Saved: RecentFilesSaved,
  },
)

export default RecentFiles

export type { RecentDownload, RecentFile, RecentFilesProps, RecentFilesSource }
export { RecentFiles, RecentFilesLeading, RecentFilesMinimal, RecentFilesSaved, RecentFilesTrailing }
