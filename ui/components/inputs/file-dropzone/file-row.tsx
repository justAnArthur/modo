/*
 * Local addition (not part of Fluid Functionalism): one file in a list of
 * picked or uploaded files, shown on FileDropzone's page as `FileDropzone.Row`.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { FIELD_ACTION_RADIUS } from '../../../lib/field-classes'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import Button from '../../button'
import { formatFileSize } from './variants'

/** Where a file is in its upload: `idle` (picked), `uploading`, `done` or `error`. */
type FileRowStatus = 'idle' | 'uploading' | 'done' | 'error'

interface FileRowProps {
  /** The picked file: its name, size and type fill the row. */
  file?: File
  /** File name, for a file you only know by its metadata (one already uploaded). Wins over `file`. */
  name?: string
  /** File size in bytes. Wins over `file`. */
  fileSize?: number
  /** MIME type; an image shows the image glyph. Wins over `file`. */
  type?: string
  /** Image URL shown in place of the glyph, e.g. an object URL of the file or the server's preview. */
  thumbnail?: string
  /** Glyph in place of the file or image one. */
  icon?: IconComponent
  /** Where the file is in its upload; sets the status glyph and the progress bar. Defaults to `"idle"`. */
  status?: FileRowStatus
  /** Upload progress from 0 to 100, shown as a bar while `status` is `"uploading"`. */
  progress?: number
  /** Accessible name of the upload's bar, and the status line while no `progress` is known. Defaults to `"Uploading"`. */
  uploadingLabel?: string
  /** The line under the name in place of the size, e.g. "Uploaded 2 min ago". */
  description?: ReactNode
  /** An error message in place of the size line; the row reads as failed. */
  error?: ReactNode
  /** Shows a remove button and is called when it is pressed. */
  onRemove?: () => void
  /** Accessible name of the remove button. Defaults to `"Remove file"`. */
  removeLabel?: string
  /** More controls before the remove button, e.g. a download link or a menu. */
  actions?: ReactNode
  /** Locale for the size (`1,5 MB` in `"sk-SK"`). Defaults to the browser's. */
  locale?: Intl.LocalesArgument
  /** Dims the row and its actions. Defaults to `false`. */
  disabled?: boolean
  /** Pins the row to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the row. */
  className?: string
}

// Literal tables: UnoCSS only generates the classes it can read whole.
const THUMB = { default: 'size-8', compact: 'size-7' }
const ROW_PAD = { default: 'py-1.5', compact: 'py-1' }

function StatusGlyph({ status, size }: { status: FileRowStatus; size: SizeVariant }) {
  const Done = useIcon('circle-check')
  const Failed = useIcon('circle-alert')
  const reduced = useReduceMotion()
  const icon = useSize(size).icon
  const shown = status === 'done' || status === 'error'

  return (
    // Decorative: the meta line carries the error, the bar the progress.
    <span aria-hidden="true" className="inline-grid shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {shown && (
          <motion.span
            key={status}
            className={cn(
              'col-start-1 row-start-1 flex',
              status === 'done' ? 'text-status-success' : 'text-destructive',
            )}
            // Under reduced motion the glyphs only fade.
            initial={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.8, transition: spring.fast.exit }}
            transition={spring.fast}
          >
            {status === 'done' ? <Done size={icon} strokeWidth={2} /> : <Failed size={icon} strokeWidth={2} />}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

function UploadBar({ progress, label }: { progress: number; label: string }) {
  const value = Math.min(Math.max(progress, 0), 100)

  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className="mt-1 block h-1 overflow-hidden rounded-full bg-accent"
    >
      <motion.span
        className="block h-full origin-left rounded-full bg-foreground"
        initial={false}
        animate={{ scaleX: value / 100 }}
        transition={spring.moderate}
      />
    </span>
  )
}

/** One file in a list: its glyph or thumbnail, name, size or status, and a remove button. */
function FileRow({
  file,
  name: nameProp,
  fileSize: fileSizeProp,
  type: typeProp,
  thumbnail,
  icon,
  status = 'idle',
  progress,
  uploadingLabel = 'Uploading',
  description,
  error,
  onRemove,
  removeLabel = 'Remove file',
  actions,
  locale,
  disabled = false,
  size: sizeProp,
  className,
}: FileRowProps) {
  const size = useSize(sizeProp)
  const shape = useShape()
  const FileIcon = useIcon('file')
  const ImageIcon = useIcon('image')
  const Remove = useIcon('x')

  const name = nameProp ?? file?.name ?? ''
  const bytes = fileSizeProp ?? file?.size
  const type = typeProp ?? file?.type ?? ''
  const Glyph = icon ?? (type.startsWith('image/') ? ImageIcon : FileIcon)
  const shown = error ? 'error' : status
  const uploading = shown === 'uploading'
  const sizeText = bytes != null ? formatFileSize(bytes, locale) : undefined
  const progressText = progress != null ? `${Math.round(progress)}%` : uploadingLabel
  const meta = error ?? description ?? (uploading ? [sizeText, progressText].filter(Boolean).join(' · ') : sizeText)

  return (
    <div
      data-status={shown}
      data-disabled={disabled || undefined}
      className={cn(
        'flex min-w-0 items-center transition-opacity duration-fast',
        size.gap,
        size.itemPx,
        ROW_PAD[size.variant],
        shape.item,
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground',
          THUMB[size.variant],
          FIELD_ACTION_RADIUS[shape.variant],
        )}
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="size-full object-cover" />
        ) : (
          <Glyph size={size.icon} strokeWidth={1.5} />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-foreground weight-normal', size.text)} title={name}>
          {name}
        </span>
        {meta != null && meta !== '' && (
          <span
            className={cn(
              'truncate',
              size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
              error ? 'text-destructive weight-medium' : 'text-muted-foreground weight-normal',
            )}
          >
            {meta}
          </span>
        )}
        {uploading && progress != null && <UploadBar progress={progress} label={uploadingLabel} />}
      </div>

      <StatusGlyph status={shown} size={size.variant} />
      {actions}
      {onRemove && (
        <Button variant="ghost" size="icon-compact" aria-label={removeLabel} disabled={disabled} onClick={onRemove}>
          <Remove strokeWidth={1.5} />
        </Button>
      )}
    </div>
  )
}

export type { FileRowProps, FileRowStatus }
export { FileRow }
export default FileRow
