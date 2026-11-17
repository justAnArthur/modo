/*!
 * Local addition: a notch app's clipboard history, the latest clip as the
 * hero and the ones before it beside it, pinned ones on top. Presentational:
 * the clips and what to do with them come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import type { SizeVariant } from '@justanarthur/modo-ui/lib/size-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useLift } from '@justanarthur/modo-ui/lib/surface-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import { ClipboardList, Copy, File, Image, Link2, Palette, Pause, Pin, Play, Search, Trash2, Type } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import IslandFlash from '../../../components/island/island-flash'
import Widget, { type WidgetLayout } from '../../../components/island/widget'
import { MINUTE, useEdgeClock } from '../../../lib/clock'

type ClipboardClipKind = 'text' | 'link' | 'image' | 'color' | 'file'

interface ClipboardClip {
  /** What tells it apart. */
  id: string
  /** What was copied: it picks the glyph and how the clip previews. */
  kind: ClipboardClipKind
  /** The clip as text: the text, the URL, the color as copied (`#5B8DEF`), the file's or image's name. */
  content: string
  /** One line more: a link's page title, an image's size, a color in another notation, a file's size. */
  detail?: string
  /** A picture: an image's thumbnail or a link's favicon, as a URL or any element. */
  preview?: string | ReactNode
  /** A color clip's paint, any CSS color; defaults to `content`. */
  color?: string
  /** The app it was copied from. */
  app?: string
  /** When it was copied, in epoch ms. */
  copiedAt: number
}

interface ClipboardHistoryProps {
  /** The clips, in any order: pinned ones list first, the rest newest first. */
  clips: ClipboardClip[]
  /** The selected clip's id, shown as the hero (controlled). */
  value?: string
  /** The selected clip at first (uncontrolled). Defaults to the first in the list. */
  defaultValue?: string
  /** Called with a clip's id when it is picked, by a press or the arrow keys. */
  onValueChange?: (id: string) => void
  /** The pinned clips' ids (controlled). */
  pinned?: string[]
  /** The pinned clips at first (uncontrolled). Defaults to `[]`. */
  defaultPinned?: string[]
  /** Called with the new ids when a clip is pinned or unpinned. */
  onPinnedChange?: (pinned: string[]) => void
  /** The search (controlled): clips whose text, detail or app hold it stay. */
  query?: string
  /** The search at first (uncontrolled). Defaults to `''`. */
  defaultQuery?: string
  /** Called with the search as it is typed. */
  onQueryChange?: (query: string) => void
  /** Copying is not recorded (controlled). */
  paused?: boolean
  /** Copying is not recorded at first (uncontrolled). Defaults to `false`. */
  defaultPaused?: boolean
  /** Called with the new state when pause or resume is pressed. */
  onPausedChange?: (paused: boolean) => void
  /** The frontmost app, when it is one whose copies are never kept (a password manager): a chip says so. */
  ignoredApp?: string
  /** Called by Copy, a row's double-click or Enter, with the clip to put back on the clipboard. */
  onCopy?: (clip: ClipboardClip) => void
  /** Called by Delete with the clip to drop from the history. */
  onDelete?: (clip: ClipboardClip) => void
  /** The moment the times are read at, in epoch ms. Defaults to now, re-read on each minute. */
  now?: number
  /** `tall` is the open island's tall snap: the search across the top, every clip as a two-line row with its picture, and the selected clip in full beside them with its actions. Defaults to `'fit'`. */
  layout?: WidgetLayout
  /** Step on the size ladder. Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root, which fills its container. */
  className?: string
}

/** Rows the list shows before it says how many more. */
const ROWS = 3

const KIND_ICON: Record<ClipboardClipKind, IconComponent> = {
  text: Type,
  link: Link2,
  image: Image,
  color: Palette,
  file: File,
}

const KIND_LABEL: Record<ClipboardClipKind, string> = {
  text: 'Text',
  link: 'Link',
  image: 'Image',
  color: 'Color',
  file: 'File',
}

/** How long ago, as a phrase: `just now`, `2 min ago`, `3 h ago`, `2 d ago`. */
function ago(ms: number) {
  const minutes = Math.floor(ms / MINUTE)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`
  return `${Math.floor(minutes / (24 * 60))} d ago`
}

/** How long ago, as a row's end: `now`, `2m`, `3h`, `2d`. */
function short(ms: number) {
  const minutes = Math.floor(ms / MINUTE)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / (24 * 60))}d`
}

/** A link's host without `www.`, else the text as given. */
function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** A link's path and query, the part the domain leaves out. */
function path(url: string) {
  try {
    const { pathname, search } = new URL(url)
    return `${pathname}${search}`.replace(/^\/$/, '')
  } catch {
    return ''
  }
}

const paint = (clip: ClipboardClip) => clip.color ?? clip.content

function Picture({ preview, className }: { preview: string | ReactNode; className?: string }) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden', className)}>
      {typeof preview === 'string' ? (
        <img alt="" src={preview} draggable={false} className="size-full object-cover" />
      ) : (
        preview
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-border ring-inset"
      />
    </span>
  )
}

/** The clip's mark at a row's start: a swatch, a thumbnail or favicon, else its kind's glyph. */
function Mark({ clip }: { clip: ClipboardClip }) {
  if (clip.kind === 'color')
    return <span aria-hidden className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: paint(clip) }} />
  if (clip.preview != null) return <Picture preview={clip.preview} className="size-4 rounded-sm" />
  const Icon = KIND_ICON[clip.kind]
  return <Icon size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
}

const hasMedia = (clip: ClipboardClip) => clip.kind === 'image' || clip.kind === 'color' || clip.kind === 'file'

/** The clip's picture beside the hero: an image's thumbnail, a color's swatch, a file's glyph on a tile. */
function Media({ clip }: { clip: ClipboardClip }) {
  const level = useLift(1)
  if (clip.kind === 'image' && clip.preview != null)
    return <Picture preview={clip.preview} className="h-24 w-36 rounded-xl" />
  if (clip.kind === 'color')
    return (
      <span
        aria-hidden
        className="size-24 shrink-0 rounded-xl ring-1 ring-border ring-inset"
        style={{ backgroundColor: paint(clip) }}
      />
    )
  if (clip.kind === 'file' || clip.kind === 'image')
    return (
      <span
        className={cn('flex size-24 items-center justify-center rounded-xl text-muted-foreground', SURFACE_BG[level])}
      >
        {clip.kind === 'file' ? <File size={28} strokeWidth={1.25} /> : <Image size={28} strokeWidth={1.25} />}
      </span>
    )
  return null
}

/** The clip as the hero: the text over two lines, a link's domain, a name. */
function Body({ clip }: { clip: ClipboardClip }) {
  if (clip.kind === 'text')
    return <p className="line-clamp-2 min-w-0 text-title weight-medium break-words text-foreground">{clip.content}</p>
  if (clip.kind === 'link')
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title
          leading={clip.preview != null && <Picture preview={clip.preview} className="size-4 rounded-sm" />}
        >
          {domain(clip.content)}
        </Widget.Title>
        {clip.detail && <Widget.Subtitle>{clip.detail}</Widget.Subtitle>}
      </div>
    )
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Widget.Title className={cn(clip.kind === 'color' && 'font-mono')}>{clip.content}</Widget.Title>
      {clip.detail && <Widget.Subtitle>{clip.detail}</Widget.Subtitle>}
    </div>
  )
}

/** What the line under the hero says: the text's length, a link's path, else nothing beyond the detail. */
function fact(clip: ClipboardClip) {
  if (clip.kind === 'text') return `${clip.content.length} characters`
  if (clip.kind === 'link') return path(clip.content)
  return undefined
}

interface HeroProps {
  clip: ClipboardClip
  pinned: boolean
  onPin: () => void
  onCopy?: (clip: ClipboardClip) => void
  onDelete?: (clip: ClipboardClip) => void
}

/** Pin, Delete and Copy for the selected clip. */
function Actions({ clip, pinned, onPin, onCopy, onDelete }: HeroProps) {
  return (
    <div className="-mr-1 flex shrink-0 items-center gap-0.5">
      <Widget.Action icon={Pin} label={pinned ? 'Unpin' : 'Pin'} pressed={pinned} onClick={onPin} />
      {onDelete && <Widget.Action icon={Trash2} label="Delete" onClick={() => onDelete(clip)} />}
      <Button variant="primary" size="compact" leadingIcon={Copy} className="ml-1.5" onClick={() => onCopy?.(clip)}>
        Copy
      </Button>
    </div>
  )
}

function Hero(props: HeroProps) {
  const { clip } = props
  const line = fact(clip)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Body clip={clip} />
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Widget.Meta>{line && <Widget.MetaItem icon={KIND_ICON[clip.kind]}>{line}</Widget.MetaItem>}</Widget.Meta>
        <Actions {...props} />
      </div>
    </div>
  )
}

interface ListProps {
  order: ClipboardClip[]
  selected: number
  pinned: string[]
  now: number
  searching: boolean
  onPick: (id: string) => void
  onCopy?: (clip: ClipboardClip) => void
}

/** The clips around the selected one, pinned first, three at most, the selected one lit one surface up. */
function List({ order, selected, pinned, now, searching, onPick, onCopy }: ListProps) {
  const level = useLift(1)
  if (!order.length)
    return <span className="flex h-7 items-center text-body text-muted-foreground">No clips match</span>

  const start = Math.max(0, Math.min(selected - ROWS + 1, order.length - ROWS))
  const shown = order.slice(start, start + ROWS)
  const more = order.length - start - shown.length
  const groups = [
    { label: 'Pinned', clips: shown.filter(clip => pinned.includes(clip.id)) },
    { label: searching ? 'Matches' : 'Recent', clips: shown.filter(clip => !pinned.includes(clip.id)) },
  ].filter(group => group.clips.length)

  return (
    <FluidHover className="-mx-2 flex flex-col gap-0" role="listbox" aria-label="Clipboard history">
      {groups.map((group, g) => (
        <div key={group.label} role="presentation" className="flex min-w-0 flex-col">
          <div className="flex h-6 items-center justify-between px-2 text-caption text-muted-foreground">
            <span>{group.label}</span>
            {g === groups.length - 1 && more > 0 && <span className="tabular-nums">{more} more</span>}
          </div>
          {group.clips.map(clip => {
            const index = order.indexOf(clip)
            const current = index === selected
            return (
              <FluidHover.Item
                key={clip.id}
                index={index - start}
                role="option"
                aria-selected={current}
                tabIndex={-1}
                className={cn('h-7 px-2', current && SURFACE_BG[level])}
                onClick={() => onPick(clip.id)}
                onDoubleClick={() => onCopy?.(clip)}
              >
                <Widget.Row
                  className="w-full"
                  trailing={
                    <>
                      {pinned.includes(clip.id) && <Pin size={11} strokeWidth={1.5} aria-label="Pinned" />}
                      <span className="w-6 text-right tabular-nums">{short(now - clip.copiedAt)}</span>
                    </>
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Mark clip={clip} />
                    <span className="min-w-0 truncate">
                      {clip.kind === 'link' ? domain(clip.content) : clip.content}
                    </span>
                  </span>
                </Widget.Row>
              </FluidHover.Item>
            )
          })}
        </div>
      ))}
    </FluidHover>
  )
}

/** A tall row's picture: a swatch, a thumbnail or favicon, else its kind's glyph, on a tile one surface up. */
function Tile({ clip }: { clip: ClipboardClip }) {
  const level = useLift(1)
  if (clip.kind === 'color')
    return (
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-lg ring-1 ring-border ring-inset"
        style={{ backgroundColor: paint(clip) }}
      />
    )
  if (clip.kind === 'image' && clip.preview != null)
    return <Picture preview={clip.preview} className="size-8 rounded-lg" />
  const Icon = KIND_ICON[clip.kind]
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground',
        SURFACE_BG[level],
      )}
    >
      {clip.kind === 'link' && clip.preview != null ? (
        <Picture preview={clip.preview} className="size-4 rounded-sm" />
      ) : (
        <Icon size={15} strokeWidth={1.5} />
      )}
    </span>
  )
}

/** Every clip as a two-line row: its picture, its text, where and when; pinned first, the selected one lit one surface up. */
function SheetList({ order, selected, pinned, now, searching, onPick, onCopy }: ListProps) {
  const level = useLift(1)
  if (!order.length)
    return <span className="flex h-12 items-center text-body text-muted-foreground">No clips match</span>

  const groups = [
    { label: 'Pinned', clips: order.filter(clip => pinned.includes(clip.id)) },
    { label: searching ? 'Matches' : 'Recent', clips: order.filter(clip => !pinned.includes(clip.id)) },
  ].filter(group => group.clips.length)

  return (
    <FluidHover className="-mx-2 flex flex-col gap-0" role="listbox" aria-label="Clipboard history">
      {groups.map(group => (
        <div key={group.label} role="presentation" className="flex min-w-0 flex-col">
          <div className="flex h-7 items-end justify-between px-2 pb-1 text-caption text-muted-foreground">
            <span>{group.label}</span>
            <span className="tabular-nums">{group.clips.length}</span>
          </div>
          {group.clips.map(clip => {
            const index = order.indexOf(clip)
            const current = index === selected
            return (
              <FluidHover.Item
                key={clip.id}
                index={index}
                role="option"
                aria-selected={current}
                tabIndex={-1}
                className={cn('h-12 px-2', current && SURFACE_BG[level])}
                onClick={() => onPick(clip.id)}
                onDoubleClick={() => onCopy?.(clip)}
              >
                <span className="flex w-full min-w-0 items-center gap-3">
                  <Tile clip={clip} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body text-foreground">
                      {clip.kind === 'link' ? (clip.detail ?? domain(clip.content)) : clip.content}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {[
                        clip.kind === 'link' ? domain(clip.content) : (clip.app ?? KIND_LABEL[clip.kind]),
                        short(now - clip.copiedAt),
                      ].join(' · ')}
                    </span>
                  </span>
                  {pinned.includes(clip.id) && (
                    <Pin size={12} strokeWidth={1.5} aria-label="Pinned" className="shrink-0 text-muted-foreground" />
                  )}
                </span>
              </FluidHover.Item>
            )
          })}
        </div>
      ))}
    </FluidHover>
  )
}

/** The selected clip in full: the whole text, the link with its title and address, the image or the color large, the file on a tile. */
function Full({ clip }: { clip: ClipboardClip }) {
  const level = useLift(1)
  if (clip.kind === 'text')
    return (
      <p className="line-clamp-8 min-w-0 whitespace-pre-wrap text-title weight-medium break-words text-foreground">
        {clip.content}
      </p>
    )
  if (clip.kind === 'link')
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <Widget.Title
          leading={clip.preview != null && <Picture preview={clip.preview} className="size-5 rounded-md" />}
        >
          {clip.detail ?? domain(clip.content)}
        </Widget.Title>
        <span className="min-w-0 text-body break-all text-muted-foreground">{clip.content}</span>
      </div>
    )

  const picture =
    clip.kind === 'color' ? (
      <span
        aria-hidden
        className="block h-36 w-full rounded-2xl ring-1 ring-border ring-inset"
        style={{ backgroundColor: paint(clip) }}
      />
    ) : clip.kind === 'image' && clip.preview != null ? (
      <Picture preview={clip.preview} className="aspect-[16/10] w-full rounded-2xl" />
    ) : (
      <span
        className={cn(
          'flex h-36 w-full items-center justify-center rounded-2xl text-muted-foreground',
          SURFACE_BG[level],
        )}
      >
        {clip.kind === 'file' ? <File size={40} strokeWidth={1.25} /> : <Image size={40} strokeWidth={1.25} />}
      </span>
    )
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {picture}
      <div className="flex min-w-0 flex-col gap-0.5">
        <Widget.Title className={cn(clip.kind === 'color' && 'font-mono')}>{clip.content}</Widget.Title>
        {clip.detail && <Widget.Subtitle>{clip.detail}</Widget.Subtitle>}
      </div>
    </div>
  )
}

/** The facts under the full clip: its kind, its length or a link's domain, the time it was copied. */
function Facts({ clip }: { clip: ClipboardClip }) {
  const words = clip.content.trim().split(/\s+/).length
  return (
    <Widget.Meta>
      <Widget.MetaItem icon={KIND_ICON[clip.kind]}>{KIND_LABEL[clip.kind]}</Widget.MetaItem>
      {clip.kind === 'text' && (
        <Widget.MetaItem>
          {words} {words === 1 ? 'word' : 'words'} · {clip.content.length} characters
        </Widget.MetaItem>
      )}
      {clip.kind === 'link' && <Widget.MetaItem>{domain(clip.content)}</Widget.MetaItem>}
      <Widget.MetaItem>
        Copied {new Date(clip.copiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Widget.MetaItem>
    </Widget.Meta>
  )
}

/** The selected clip beside the list, held in view as the list scrolls: where it came from, the clip in full, its facts and actions. */
function Detail(props: HeroProps & { now: number }) {
  const { clip, now } = props
  return (
    <div className="sticky top-0 flex min-w-0 flex-col gap-3">
      <Widget.Header icon={KIND_ICON[clip.kind]}>
        {[clip.app ?? KIND_LABEL[clip.kind], ago(now - clip.copiedAt)].join(' · ')}
      </Widget.Header>
      <Full clip={clip} />
      <Facts clip={clip} />
      <div className="flex justify-end pt-1">
        <Actions {...props} />
      </div>
    </div>
  )
}

/** The compact island's left wing: the clipboard glyph. */
function ClipboardHistoryLeading() {
  return <ClipboardList size={16} strokeWidth={1.5} className="text-foreground" />
}

/** The compact island's right wing: how many clips came in since the island was last open. */
function ClipboardHistoryTrailing({ count }: { count: number }) {
  return (
    <span className="text-caption weight-semibold tabular-nums text-foreground">
      {count}
      <span className="sr-only"> new clips</span>
    </span>
  )
}

interface CopiedProps {
  /** The clip that was copied. */
  clip: ClipboardClip
  /** Called by Pin; without it the button hides. */
  onPin?: (clip: ClipboardClip) => void
}

/** The island's flash when something is copied: the clip's picture or glyph, `Copied`, its preview and Pin. */
function ClipboardHistoryCopied({ clip, onPin }: CopiedProps) {
  const level = useLift(1)
  const Icon = KIND_ICON[clip.kind]
  const tile =
    clip.kind === 'color' ? (
      <span
        aria-hidden
        className="size-9 rounded-lg ring-1 ring-border ring-inset"
        style={{ backgroundColor: paint(clip) }}
      />
    ) : clip.kind === 'image' && clip.preview != null ? (
      <Picture preview={clip.preview} className="size-9 rounded-lg" />
    ) : (
      <span
        className={cn('flex size-9 items-center justify-center rounded-lg text-muted-foreground', SURFACE_BG[level])}
      >
        <Icon size={16} strokeWidth={1.5} />
      </span>
    )
  return (
    <IslandFlash
      icon={tile}
      title={`Copied ${KIND_LABEL[clip.kind].toLowerCase()}`}
      caption={clip.kind === 'link' ? domain(clip.content) : clip.content}
      action={
        onPin && (
          <Button variant="secondary" size="compact" leadingIcon={Pin} onClick={() => onPin(clip)}>
            Pin
          </Button>
        )
      }
    />
  )
}

/**
 * A notch app's clipboard history: the latest clip as the hero, the ones
 * before it beside it, pinned ones on top.
 *
 * The hero is the selected clip, the newest until another is picked, shown
 * as what it is: text over two lines, a link as its domain with the page's
 * title, an image as its thumbnail, a color as a swatch with its value, a
 * file as a tile with its name and size. The context line says where it was
 * copied and how long ago; under the hero, its length or a link's path,
 * Pin, Delete and Copy.
 *
 * Beside it, past a hairline, a search over the history and the clips
 * themselves: pinned ones first, then the rest newest first, each a row of
 * its swatch, thumbnail or glyph, its text and how long ago. Three show at
 * a time, around the selected one, with a count of the rest. The arrow keys
 * move the selection from anywhere in the widget (the search included),
 * Enter copies it, and a double-click copies a row. The selection, the pins
 * and the search each work both ways (`value`, `pinned`, `query`, with
 * their `default…` and `on…Change`).
 *
 * Recording pauses from the context line (`paused`), and an app whose
 * copies are never kept, such as a password manager, shows as a chip
 * (`ignoredApp`). With no clips it says what will show up here, or that
 * the history is paused.
 *
 * At the open island's tall snap (`layout="tall"`) it becomes a sheet: the
 * search across the top with the pause and the chips beside it, then a
 * master and detail split. On the left every clip, not three, as a row of
 * two lines: its swatch, thumbnail or glyph on a tile, its text (a link's
 * page title), and where and when it was copied, pinned ones first. On the
 * right, past a hairline and held in view as the list scrolls, the
 * selected clip in full: the whole text over up to eight lines, a link's
 * title with its whole address, an image or a color large, a file on a
 * tile; under it its kind, its length in words and characters, the time
 * it was copied, and Pin, Delete and Copy. The keys work as in the fit
 * layout.
 *
 * `ClipboardHistory.Leading` and `ClipboardHistory.Trailing` show the
 * glyph and the count of new clips in the compact island's wings, and
 * `ClipboardHistory.Copied` is the flash when something is copied.
 *
 * @example {@include ./examples.mdx}
 */
const ClipboardHistory = Object.assign(
  function ClipboardHistory({
    clips,
    value: valueProp,
    defaultValue,
    onValueChange,
    pinned: pinnedProp,
    defaultPinned = [],
    onPinnedChange,
    query: queryProp,
    defaultQuery = '',
    onQueryChange,
    paused: pausedProp,
    defaultPaused = false,
    onPausedChange,
    ignoredApp,
    onCopy,
    onDelete,
    now: nowProp,
    layout = 'fit',
    size,
    className,
  }: ClipboardHistoryProps) {
    const ticking = useEdgeClock(0, nowProp === undefined, MINUTE)
    const now = nowProp ?? ticking
    const [value, setValue] = useControllableState<string | undefined>(valueProp, defaultValue, onValueChange)
    const [pinned, setPinned] = useControllableState(pinnedProp, defaultPinned, onPinnedChange)
    const [query, setQuery] = useControllableState(queryProp, defaultQuery, onQueryChange)
    const [paused, setPaused] = useControllableState(pausedProp, defaultPaused, onPausedChange)

    const status = (
      <>
        {paused ? <Widget.Chip>Paused</Widget.Chip> : ignoredApp && <Widget.Chip>Ignoring {ignoredApp}</Widget.Chip>}
        <Widget.Action
          icon={paused ? Play : Pause}
          label={paused ? 'Resume history' : 'Pause history'}
          onClick={() => setPaused(!paused)}
        />
      </>
    )

    if (!clips.length)
      return (
        <Widget.Message
          icon={paused ? Pause : ClipboardList}
          title={paused ? 'Clipboard history is paused' : 'Copy something'}
          description={
            paused
              ? 'Nothing you copy is kept until you resume.'
              : 'Text, links, images and colors you copy show up here, newest first.'
          }
          actions={
            paused && (
              <Button variant="secondary" size="compact" leadingIcon={Play} onClick={() => setPaused(false)}>
                Resume
              </Button>
            )
          }
          className={className}
        />
      )

    const needle = query.trim().toLowerCase()
    const matches = needle
      ? clips.filter(clip => [clip.content, clip.detail, clip.app].some(s => s?.toLowerCase().includes(needle)))
      : clips
    const newest = [...matches].sort((a, b) => b.copiedAt - a.copiedAt)
    const order = [
      ...newest.filter(clip => pinned.includes(clip.id)),
      ...newest.filter(clip => !pinned.includes(clip.id)),
    ]
    const found = order.findIndex(clip => clip.id === value)
    const selected = found < 0 ? Math.max(0, order.indexOf(newest[0]!)) : found
    const hero = order[selected] ?? clips[0]!
    const heroPinned = pinned.includes(hero.id)
    const togglePin = () => setPinned(heroPinned ? pinned.filter(id => id !== hero.id) : [...pinned, hero.id])

    const onKeyDown = (event: KeyboardEvent) => {
      const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
      if (step) {
        event.preventDefault()
        const next = order[Math.max(0, Math.min(order.length - 1, selected + step))]
        if (next) setValue(next.id)
        return
      }
      if (event.key === 'Enter' && order[selected]) {
        event.preventDefault()
        onCopy?.(order[selected])
      }
    }

    const search = (
      <Input
        size="compact"
        icon={Search}
        placeholder="Search clips"
        aria-label="Search clips"
        value={query}
        onValueChange={setQuery}
      />
    )
    const listProps = { order, selected, pinned, now, searching: !!needle, onPick: setValue, onCopy }

    if (layout === 'tall')
      return (
        // biome-ignore lint/a11y/noStaticElementInteractions: the keys bubble up from the search and the rows
        <div className={cn('flex min-w-0 flex-col', className)} onKeyDown={onKeyDown}>
          <Widget.Sheet size={size} className="gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0 flex-1">{search}</div>
              <span className="-mr-1 flex shrink-0 items-center gap-1.5">{status}</span>
            </div>
            <div className="flex min-w-0 items-stretch gap-5">
              <div className="w-[46%] min-w-0 shrink-0">
                <SheetList {...listProps} />
              </div>
              <div className="min-w-0 flex-1 border-l border-border pl-5">
                <Detail
                  clip={hero}
                  pinned={heroPinned}
                  onPin={togglePin}
                  onCopy={onCopy}
                  onDelete={onDelete}
                  now={now}
                />
              </div>
            </div>
          </Widget.Sheet>
        </div>
      )

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the keys bubble up from the search and the rows
      <div className={cn('flex min-h-0 flex-col', className)} onKeyDown={onKeyDown}>
        <Widget
          size={size}
          className="flex-1"
          aside={
            <div className="flex min-w-0 flex-col gap-1">
              {search}
              <List {...listProps} />
            </div>
          }
          media={hasMedia(hero) && <Media clip={hero} />}
        >
          <Widget.Header icon={KIND_ICON[hero.kind]} trailing={status}>
            {[hero.app ?? KIND_LABEL[hero.kind], ago(now - hero.copiedAt)].join(' · ')}
          </Widget.Header>
          <Hero clip={hero} pinned={heroPinned} onPin={togglePin} onCopy={onCopy} onDelete={onDelete} />
        </Widget>
      </div>
    )
  },
  {
    Leading: ClipboardHistoryLeading,
    Trailing: ClipboardHistoryTrailing,
    Copied: ClipboardHistoryCopied,
  },
)

export default ClipboardHistory

export type { ClipboardClip, ClipboardClipKind, ClipboardHistoryProps }
export { ClipboardHistory, ClipboardHistoryCopied, ClipboardHistoryLeading, ClipboardHistoryTrailing }
