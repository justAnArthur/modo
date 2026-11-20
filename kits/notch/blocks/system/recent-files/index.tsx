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
  Inbox,
  Share,
  Trash2,
  X,
} from 'lucide-react'
import { type DragEvent, type ReactNode, useEffect, useState } from 'react'
import IslandFlash from '../../../components/island/island-flash'
import Widget, { type WidgetLayout } from '../../../components/island/widget'
import { MINUTE, useEdgeClock } from '../../../lib/clock'
import { confirmWindow } from '../../../lib/motion'

/** Where a file is: the Downloads folder, the screenshots folder, or the shelf of files dropped on the notch to keep (`Kept`). */
type RecentFilesSource = 'downloads' | 'screenshots' | 'shelf'

/** The shelf's room: what it holds, what it may hold, and how long it keeps a file. */
interface RecentFilesShelf {
  /** Bytes kept. */
  bytes: number
  /** Bytes it may keep. */
  limitBytes: number
  /** Hours a file stays before it goes, or `null` to keep files until removed. */
  expiryHours: number | null
}

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
  /** The files of every source, in any order: each lists newest first. */
  files: RecentFile[]
  /** A download under way: it takes the hero on Downloads, with its progress and speed. */
  download?: RecentDownload | null
  /** The sources the switch offers, in order. Defaults to all three: Downloads, Screenshots and Kept. */
  sources?: RecentFilesSource[]
  /** The shelf's room, said on Kept's context line: how full it is and how long it keeps files. */
  shelf?: RecentFilesShelf
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
  /** Called by AirDrop, to share the file; without it the button hides. */
  onAirDrop?: (file: RecentFile) => void
  /** Called when a file starts to be dragged out, with the drag event, for the host to start a native drag. Without it nothing drags. */
  onDragStart?: (file: RecentFile, event: DragEvent) => void
  /** Called by Move to Trash. */
  onDelete?: (file: RecentFile) => void
  /** Called by Clear's second press with the source whose list to clear (the first press asks "Clear N files?"); without it the button hides. */
  onClear?: (source: RecentFilesSource) => void
  /** Called by the download's Cancel. */
  onCancelDownload?: (download: RecentDownload) => void
  /** The moment the times are read at, in epoch ms. Defaults to now, re-read on each minute. */
  now?: number
  /** `tall` is the open island's tall snap: the switch across the top, the newest file large with its actions, and every earlier file of the folder as a grid of named tiles. Defaults to `'fit'`. */
  layout?: WidgetLayout
  /** Step on the size ladder. Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root, which fills its container. */
  className?: string
}

const SOURCES: RecentFilesSource[] = ['downloads', 'screenshots', 'shelf']
const SOURCE_LABEL: Record<RecentFilesSource, string> = {
  downloads: 'Downloads',
  screenshots: 'Screenshots',
  shelf: 'Kept',
}
const SOURCE_ICON: Record<RecentFilesSource, IconComponent> = {
  downloads: ArrowDownToLine,
  screenshots: Camera,
  shelf: Inbox,
}
const SAVED: Record<RecentFilesSource, string> = {
  downloads: 'Downloaded',
  screenshots: 'Screenshot saved',
  shelf: 'Kept',
}
const EMPTY: Record<RecentFilesSource, { title: string; description: string }> = {
  downloads: { title: 'No downloads yet', description: 'Files you download land here, ready to open or drag out.' },
  screenshots: {
    title: 'No screenshots yet',
    description: 'Take one with ⇧⌘4 and it shows up here, ready to drag into a message.',
  },
  shelf: { title: 'Nothing kept', description: 'Drop files on the notch to keep them.' },
}

const count = (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`

/** The shelf's room in words: `120 MB of 1 GB · kept 24 h`. */
const roomOf = (shelf: RecentFilesShelf) =>
  [`${bytes(shelf.bytes)} of ${bytes(shelf.limitBytes)}`, shelf.expiryHours !== null && `kept ${shelf.expiryHours} h`]
    .filter(Boolean)
    .join(' · ')

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
const SHEET_TILE = { default: 'h-32 w-48 rounded-2xl', compact: 'h-28 w-42 rounded-2xl' }

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
  /** At the tall snap the facts add where a download came from; the short island leaves it out. */
  full: boolean
}

/** The newest file: its name, then its size and age (and, tall, where it came from), Show in Finder, AirDrop, Copy, Move to Trash and Open. */
function Hero({ file, now, props, full }: HeroProps) {
  const { onOpen, onReveal, onAirDrop, onCopy, onDelete } = props
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title>{file.name}</Widget.Title>
        <Widget.Subtitle>
          {[bytes(file.size), ago(now - file.addedAt), full && file.from && `from ${file.from}`]
            .filter(Boolean)
            .join(' · ')}
        </Widget.Subtitle>
      </div>
      <div className="-mr-1 flex min-w-0 items-center justify-end gap-0.5">
        {onReveal && <Widget.Action icon={FolderSearch} label="Show in Finder" onClick={() => onReveal(file)} />}
        {onAirDrop && <Widget.Action icon={Share} label="AirDrop" onClick={() => onAirDrop(file)} />}
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

/** Earlier files as rows: the file's glyph and name, then its size and how long ago, name first for scanning. */
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
            <Widget.Row
              className="w-full"
              trailing={<span className="tabular-nums">{`${bytes(file.size)} · ${short(now - file.addedAt)}`}</span>}
            >
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

/** Every earlier file as a grid of tiles, five across: its thumbnail or glyph, its name, its size and age. */
function Grid({ files, now, onOpen, onDragStart }: ListProps) {
  return (
    <FluidHover columns={5} className="-m-1.5 grid-cols-5 gap-0" highlightClassName="rounded-xl">
      {files.map((file, index) => (
        <FluidHover.Item
          key={file.id}
          index={index}
          title={file.name}
          className="min-h-0 flex-col items-stretch gap-1.5 p-1.5 text-left"
          onClick={() => onOpen?.(file)}
          {...dragOf(file, onDragStart)}
        >
          <Thumbnail file={file} glyph={24} className="aspect-[4/3] w-full rounded-lg" />
          <span className="flex min-w-0 flex-col px-0.5">
            <span className="truncate text-caption text-foreground">{file.name}</span>
            <span className="truncate text-micro tabular-nums text-muted-foreground">
              {bytes(file.size)} · {short(now - file.addedAt)}
            </span>
          </span>
        </FluidHover.Item>
      ))}
    </FluidHover>
  )
}

interface ClearButtonProps {
  files: number
  armed: boolean
  setArmed: (armed: boolean) => void
  onClear: () => void
}

/** Clear in two presses: the first arms it ("Clear 3 files?", in the destructive hue) for a moment, the second clears. */
function ClearButton({ files, armed, setArmed, onClear }: ClearButtonProps) {
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), confirmWindow)
    return () => clearTimeout(timer)
  }, [armed, setArmed])
  return (
    <Button
      variant={armed ? 'destructive' : 'ghost'}
      size="compact"
      className="-mr-2 h-6 px-2"
      aria-live="polite"
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onClear()
      }}
    >
      {armed ? `Clear ${count(files)}?` : 'Clear'}
    </Button>
  )
}

/** The compact island's left wing: the source's glyph: the download arrow, the camera, the shelf. */
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

/** The island's flash when a file lands: its thumbnail or glyph, `Downloaded`, `Screenshot saved` or `Kept`, and Open. */
function RecentFilesSaved({ file, onOpen }: SavedProps) {
  return (
    <IslandFlash
      icon={<Thumbnail file={file} glyph={16} className="size-9 rounded-lg" />}
      title={SAVED[file.source]}
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
 * Beside it, past a hairline, a switch picks the source, Downloads,
 * Screenshots or Kept, the shelf of files dropped on the notch (`sources`
 * picks which; `value` / `defaultValue` / `onValueChange`), over the ones
 * before the newest: downloads and kept files as rows of glyph, name, then
 * size and age, and screenshots as a grid of image tiles, since a
 * screenshot is found by its look. A press opens a file, and with
 * `onDragStart` every picture and row drags out (the host starts the native
 * drag). Clear empties the list in two presses: the first asks
 * "Clear N files?" for a moment, the second clears. On Kept the context
 * line says how full the shelf is, and at the tall snap how long it keeps
 * files (`shelf`).
 * With `onAirDrop` the hero shares the file over AirDrop.
 *
 * While a download is under way (`download`) it takes the hero on
 * Downloads: its name, the progress as a modo-ui Meter line, how much is
 * in, the speed and the time left, and Cancel. An empty source says what
 * will land in it (on Kept: "Drop files on the notch to keep them"), the
 * switch still beside it. At the short island the hero's facts are its
 * size and age; the tall snap adds where a download came from.
 *
 * At the open island's tall snap (`layout="tall"`) it becomes a sheet:
 * the switch and Clear across the top; the newest file (or the download
 * under way) large beside its name, its facts and its actions; then every
 * earlier file of the folder, not three, as a grid five across, each tile
 * its thumbnail or its type's glyph over its name, its size and how long
 * ago it landed. Downloads and screenshots read alike there, since a tile
 * has room for both the look and the name; the grid scrolls with the
 * island, and every tile opens on a press and drags out like the rows.
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
      sources = SOURCES,
      shelf,
      value: valueProp,
      defaultValue = 'downloads',
      onValueChange,
      onOpen,
      onDragStart,
      onClear,
      onCancelDownload,
      now: nowProp,
      layout = 'fit',
      size,
      className,
    } = props
    const ticking = useEdgeClock(0, nowProp === undefined, MINUTE)
    const now = nowProp ?? ticking
    const [source, setSource] = useControllableState(valueProp, defaultValue, onValueChange)
    const [armedFor, setArmedFor] = useState<RecentFilesSource | null>(null)
    const armed = armedFor === source
    const step = size ?? 'default'

    const shown = files.filter(file => file.source === source).sort((a, b) => b.addedAt - a.addedAt)
    const active = source === 'downloads' ? download : undefined
    const [newest, ...rest] = shown
    const earlier = active ? shown : rest
    const limit = source === 'screenshots' ? TILES : ROWS

    const empty = !newest && !active
    // The shelf's room: in full at the tall snap; the short island says only how full it is.
    const room =
      source === 'shelf' && shelf && shelf.bytes > 0
        ? layout === 'tall'
          ? roomOf(shelf)
          : `${bytes(shelf.bytes)} of ${bytes(shelf.limitBytes)}`
        : undefined
    const header = (
      <Widget.Header icon={SOURCE_ICON[source]}>
        {active
          ? ['Downloading', active.from].filter(Boolean).join(' · ')
          : [SOURCE_LABEL[source], shown.length > 0 && count(shown.length), room].filter(Boolean).join(' · ')}
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

    const tabs = (
      <Tabs variant="subtle" size="compact" value={source} onValueChange={v => setSource(v as RecentFilesSource)}>
        <Tabs.List className="-ml-2">
          {sources.map(item => (
            <Tabs.Item key={item} value={item} label={SOURCE_LABEL[item]} />
          ))}
        </Tabs.List>
      </Tabs>
    )
    // Armed per source, so switching sources leaves a pending Clear behind.
    const clear = onClear && !empty && (
      <ClearButton
        files={shown.length}
        armed={armed}
        setArmed={on => setArmedFor(on ? source : null)}
        onClear={() => onClear(source)}
      />
    )
    const nothing = (
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title>{EMPTY[source].title}</Widget.Title>
        <span className="text-pretty text-caption text-muted-foreground">
          {EMPTY[source].description}
          {source === 'shelf' && shelf?.expiryHours != null && ` They stay for ${shelf.expiryHours} h.`}
        </span>
      </div>
    )

    if (layout === 'tall')
      return (
        <Widget.Sheet size={size} className={className}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            {tabs}
            {clear}
          </div>

          <div className="flex min-w-0 items-center gap-6">
            {active ? (
              <Thumbnail file={active} glyph={40} className={SHEET_TILE[step]} />
            ) : newest ? (
              <span {...dragOf(newest, onDragStart)} className={cn('shrink-0', onDragStart && 'cursor-grab')}>
                <Thumbnail file={newest} glyph={40} className={SHEET_TILE[step]} />
              </span>
            ) : (
              <Empty source={source} className={SHEET_TILE[step]} />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {header}
              {active ? (
                <Downloading download={active} onCancel={onCancelDownload} />
              ) : newest ? (
                <Hero file={newest} now={now} props={props} full />
              ) : (
                nothing
              )}
            </div>
          </div>

          {earlier.length > 0 && (
            <Widget.Section
              label={active ? 'Latest' : 'Earlier'}
              trailing={<span className="tabular-nums">{earlier.length}</span>}
            >
              <div className="pt-1.5">
                <Grid files={earlier} now={now} onOpen={onOpen} onDragStart={onDragStart} />
              </div>
            </Widget.Section>
          )}
        </Widget.Sheet>
      )

    return (
      <Widget
        size={size}
        className={cn('h-full', className)}
        media={media}
        aside={
          <div className="flex min-w-0 flex-col gap-1.5">
            {/* The short island's aside has no room for the tabs beside "Clear 4 files?": the confirm takes their row. */}
            <div className="flex h-7 min-w-0 items-center justify-between gap-2">
              {!armed && tabs}
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-caption tabular-nums text-muted-foreground">
                {!armed && earlier.length > limit && <span>{earlier.length - limit} more</span>}
                {clear}
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
          <Hero file={newest} now={now} props={props} full={false} />
        ) : (
          nothing
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

export type { RecentDownload, RecentFile, RecentFilesProps, RecentFilesShelf, RecentFilesSource }
export { RecentFiles, RecentFilesLeading, RecentFilesMinimal, RecentFilesSaved, RecentFilesTrailing }
