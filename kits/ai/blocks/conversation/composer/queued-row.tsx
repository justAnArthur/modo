/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md.
 */

'use client'

import { Tooltip } from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useIcon } from '@justanarthur/modo-ui/lib/icon-context'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Reorder } from 'motion/react'
import type { QueuedMessage } from './shared'

interface QueuedRowProps {
  item: QueuedMessage
  index: number
  total: number
  reduceMotion: boolean
  isTouch: boolean
  onEdit: (item: QueuedMessage) => void
  onRemove: (item: QueuedMessage) => void
  onMove: (item: QueuedMessage, dir: -1 | 1) => void
}

/** A pending message: a recessed, draggable row. The top row dispatches next. */
function QueuedRow({ item, index, total, reduceMotion, isTouch, onEdit, onRemove, onMove }: QueuedRowProps) {
  const XIcon = useIcon('x')
  const ImageIcon = useIcon('image')
  const compactStep = useSize().variant === 'compact'
  const fileCount = item.files.length
  const label = item.text || `${fileCount} attachment${fileCount === 1 ? '' : 's'}`

  return (
    <Reorder.Item
      value={item}
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: spring.fast.exit }}
      transition={spring.fast}
      aria-label={`Queued message ${index + 1} of ${total}: ${label}`}
      tabIndex={0}
      onDoubleClick={() => onEdit(item)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          onEdit(item)
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          onRemove(item)
        } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault()
          onMove(item, e.key === 'ArrowUp' ? -1 : 1)
        }
      }}
      className={cn(
        'group/qrow flex items-center gap-2 rounded-lg bg-muted',
        compactStep ? 'h-7 px-2 text-body-compact' : 'h-8 px-2.5 text-body',
        'text-foreground/85 select-none outline-none',
        'cursor-grab active:cursor-grabbing',
        'focus-visible:ring-1 focus-visible:ring-focus-ring',
        'weight-normal',
      )}
    >
      {fileCount > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
          <ImageIcon size={13} />
          {item.text && <span className="tabular-nums">{fileCount}</span>}
        </span>
      )}
      {/* py-1/-my-1: truncate's overflow-hidden would clip glyphs outside the trimmed box. */}
      <span className="min-w-0 flex-1 truncate text-trim py-1 -my-1">{label}</span>
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          // Keeps the press from starting a drag and the click from reaching the row's edit.
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation()
            onRemove(item)
          }}
          aria-label={`Remove queued message: ${label}`}
          className={cn(
            'shrink-0 flex h-5 w-5 items-center justify-center rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-hover',
            // Touch has no hover to reveal it.
            isTouch ? 'opacity-100' : 'opacity-0 group-hover/qrow:opacity-100 focus-visible:opacity-100',
            'transition-opacity duration-fast cursor-pointer outline-none',
            'focus-visible:ring-1 focus-visible:ring-focus-ring',
          )}
        >
          <XIcon size={13} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </Reorder.Item>
  )
}

export { QueuedRow }
