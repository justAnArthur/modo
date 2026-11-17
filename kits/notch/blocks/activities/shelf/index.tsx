/*!
 * Local addition: a notch app's file shelf, the files dragged onto the notch
 * to keep for later. Rebuilt from Just Notch's shelf plugin (`Shelf`, `Tile`,
 * `DropFlash`, `Count`) as presentational parts: the files and what to do
 * with them come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import ContextMenu from '@justanarthur/modo-ui/components/overlays/context-menu'
import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import {
  ArrowDownToLine,
  Check,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  Files,
  FileText,
  FileVideo,
  type LucideIcon,
  Send,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useRef } from 'react'

interface ShelfFile {
  /** What tells it apart: its path. */
  id: string
  /** Its name, shown under the tile. */
  name: string
  /** A preview: an image URL, or any element. Without one, an icon for the file's type. */
  thumbnail?: string | ReactNode
}

interface ShelfProps {
  /** The files on the shelf, in order (controlled). */
  value?: ShelfFile[]
  /** The files at first (uncontrolled). Defaults to `[]`. */
  defaultValue?: ShelfFile[]
  /** Called with the files left after Remove or Clear. */
  onValueChange?: (files: ShelfFile[]) => void
  /** Called on a double-click or the menu's Open. */
  onOpen?: (file: ShelfFile) => void
  /** Called on the menu's Show in Finder. */
  onReveal?: (file: ShelfFile) => void
  /** Called with every file on AirDrop; without it the button hides. */
  onAirDrop?: (files: ShelfFile[]) => void
  /** Called when a tile starts to be dragged out, for the host to start a native drag. */
  onDragOut?: (file: ShelfFile) => void
  /** Classes for the root, which fills its container. */
  className?: string
}

const DRAG_SLOP_PX = 4

const TYPES: [RegExp, LucideIcon][] = [
  [/\.(png|jpe?g|gif|webp|heic|svg|tiff?)$/i, FileImage],
  [/\.(mov|mp4|m4v|avi|mkv|webm)$/i, FileVideo],
  [/\.(mp3|m4a|wav|aiff?|flac|ogg)$/i, FileAudio],
  [/\.(zip|tar|gz|tgz|rar|7z|dmg)$/i, FileArchive],
  [/\.(m?[jt]sx?|json|css|html|swift|rs|go|py|rb|sh|ya?ml|toml)$/i, FileCode],
  [/\.(pdf|md|txt|rtf|docx?|pages|key|numbers|csv)$/i, FileText],
]

/** The icon for a file's type, from its name's extension. */
const iconFor = (name: string) => TYPES.find(([pattern]) => pattern.test(name))?.[1] ?? File

const count = (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`

interface TileProps {
  file: ShelfFile
  index: number
  onOpen?: (file: ShelfFile) => void
  onReveal?: (file: ShelfFile) => void
  onRemove: (file: ShelfFile) => void
  onDragOut?: (file: ShelfFile) => void
}

function Thumbnail({ file }: { file: ShelfFile }) {
  const Icon = iconFor(file.name)
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3 text-muted-foreground">
      {typeof file.thumbnail === 'string' ? (
        <img alt="" src={file.thumbnail} draggable={false} className="size-full object-cover" />
      ) : (
        (file.thumbnail ?? <Icon size={20} strokeWidth={1.5} />)
      )}
    </span>
  )
}

function Tile({ file, index, onOpen, onReveal, onRemove, onDragOut }: TileProps) {
  const reduced = useReduceMotion()
  // The drag starts once the pointer moves: started on press, it would swallow the click and double-click.
  const press = useRef<{ x: number; y: number }>(undefined)
  return (
    <motion.div
      layout={!reduced}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.9, transition: spring.moderate.exit }}
      transition={spring.moderate}
    >
      <ContextMenu size="compact">
        <ContextMenu.Trigger>
          <FluidHover.Item
            index={index}
            title={file.name}
            className="h-auto w-20 flex-col items-center justify-start gap-1.5 p-1.5"
            onPointerDown={event => {
              if (event.button === 0) press.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerMove={event => {
              const start = press.current
              if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_SLOP_PX) return
              press.current = undefined
              onDragOut?.(file)
            }}
            onPointerUp={() => {
              press.current = undefined
            }}
            onDoubleClick={() => onOpen?.(file)}
          >
            <Thumbnail file={file} />
            <span className="w-full truncate text-center text-micro text-foreground">{file.name}</span>
          </FluidHover.Item>
        </ContextMenu.Trigger>
        <ContextMenu.Content className="dark text-foreground">
          <ContextMenu.Item index={0} label="Open" onSelect={() => onOpen?.(file)} />
          <ContextMenu.Item index={1} label="Show in Finder" onSelect={() => onReveal?.(file)} />
          <ContextMenu.Separator />
          <ContextMenu.Item index={2} icon={Trash2} label="Remove from shelf" onSelect={() => onRemove(file)} />
        </ContextMenu.Content>
      </ContextMenu>
    </motion.div>
  )
}

/** The compact island's left wing: the shelf's glyph. */
function ShelfLeading() {
  return <Files size={16} strokeWidth={1.5} className="text-foreground" />
}

/** The compact island's right wing: how many files are on the shelf. */
function ShelfTrailing({ count: n }: { count: number }) {
  return <span className="text-caption weight-medium tabular-nums text-foreground">{n}</span>
}

interface ShelfDropProps {
  /** `dragging` while files hover over the notch, `added` once they dropped. */
  phase: 'dragging' | 'added'
  /** How many files are being dragged, or were added. */
  count: number
  /** How many files the shelf holds once they dropped. Defaults to `count`. */
  total?: number
  /** Classes for the target. */
  className?: string
}

/** The island's flash while files are dragged over the notch: a dashed drop target, then a check once they land. */
function ShelfDrop({ phase, count: n, total = n, className }: ShelfDropProps) {
  const reduced = useReduceMotion()
  const added = phase === 'added'
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-3 rounded-xl border px-3 transition-[border-color] duration-moderate',
        added ? 'border-transparent' : 'border-dashed border-brand',
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={phase}
          className={cn('flex shrink-0', added ? 'text-status-success' : 'text-brand')}
          initial={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 0.6, transition: spring.fast.exit }}
          transition={spring.moderate}
        >
          {added ? <Check size={16} strokeWidth={2} /> : <ArrowDownToLine size={16} strokeWidth={1.5} />}
        </motion.span>
      </AnimatePresence>
      <span className="min-w-0 flex-1 truncate text-body weight-semibold text-foreground">
        {added ? 'Added to shelf' : 'Drop to shelf'}
      </span>
      <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
        {added ? `${total} on shelf` : count(n)}
      </span>
    </div>
  )
}

/**
 * A notch app's shelf: files dragged onto the notch, kept in a strip to drag
 * out again, open, AirDrop or clear.
 *
 * Each file is a tile with its thumbnail, or an icon for its type, and its
 * name. A double-click opens it; a right-click (a long press on touch) opens
 * a ContextMenu with Open, Show in Finder and Remove from shelf, grown from
 * the press point; one fluid hover highlight runs along the strip, which
 * scrolls sideways when it holds more than fits. Moving a pressed tile calls
 * `onDragOut`, for the host to start a native drag. A header counts the
 * files and holds AirDrop and Clear. Removing and clearing change the files
 * through `value` / `onValueChange`, or here from `defaultValue`; tiles fade
 * in and out as the strip closes up. An empty shelf says how to fill it.
 *
 * The other forms are parts: `Shelf.Drop`, the flash while files hover over
 * the notch (a dashed drop target in the brand hue) and once they land;
 * `Shelf.Leading` and `Shelf.Trailing` for the compact island's wings.
 *
 * @example {@include ./examples.mdx}
 */
function Shelf({
  value,
  defaultValue = [],
  onValueChange,
  onOpen,
  onReveal,
  onAirDrop,
  onDragOut,
  className,
}: ShelfProps) {
  const [files, setFiles] = useControllableState(value, defaultValue, onValueChange)

  if (files.length === 0)
    return (
      <div className={cn('flex size-full items-center justify-center', className)}>
        <EmptyState
          size="compact"
          icon={Files}
          title="Shelf is empty"
          description="Drag files onto the notch to keep them here."
        />
      </div>
    )

  return (
    <div className={cn('flex size-full flex-col gap-2', className)}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-caption tabular-nums text-muted-foreground">{count(files.length)}</span>
        <div className="-mr-3 flex items-center gap-1">
          {onAirDrop && (
            <Button variant="ghost" size="compact" leadingIcon={Send} onClick={() => onAirDrop(files)}>
              AirDrop
            </Button>
          )}
          <Button variant="ghost" size="compact" leadingIcon={Trash2} onClick={() => setFiles([])}>
            Clear
          </Button>
        </div>
      </div>
      <FluidHover axis="x" className="-mx-3 flex min-h-0 flex-1 items-start overflow-x-auto overflow-y-hidden px-1.5">
        <AnimatePresence initial={false}>
          {files.map((file, i) => (
            <Tile
              key={file.id}
              file={file}
              index={i}
              onOpen={onOpen}
              onReveal={onReveal}
              onRemove={removed => setFiles(files.filter(f => f.id !== removed.id))}
              onDragOut={onDragOut}
            />
          ))}
        </AnimatePresence>
      </FluidHover>
    </div>
  )
}

Shelf.Drop = ShelfDrop
Shelf.Leading = ShelfLeading
Shelf.Trailing = ShelfTrailing

export default Shelf

export type { ShelfDropProps, ShelfFile, ShelfProps }
export { Shelf, ShelfDrop, ShelfLeading, ShelfTrailing }
