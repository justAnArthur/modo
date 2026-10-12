/*
 * Local addition (not part of Fluid Functionalism): a drag-and-drop zone that
 * hands picked files over and keeps none (no upload logic), and the row a
 * picked or uploaded file shows in (`file-row.tsx`). The zone is a label
 * around a visually hidden file input, joined to Base UI's Field like Input.
 */

import { Field } from '@base-ui/react/field'
import { motion } from 'motion/react'
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ForwardRefExoticComponent,
  forwardRef,
  type LabelHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useRef,
  useState,
} from 'react'
import { useFieldState } from '../../../lib/field-classes'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { FileRow } from './file-row'
import { type DragVerdict, dragVerdict, type FileRejection, sortFiles } from './variants'

interface FileDropzoneProps
  extends Omit<
    LabelHTMLAttributes<HTMLLabelElement>,
    'children' | 'className' | 'style' | 'id' | 'onChange' | 'htmlFor' | 'form'
  > {
  /** Called with the files that pass `accept`, `maxSize` and the count, after a pick or a drop. */
  onFilesChange?: (files: File[]) => void
  /** Called with the files turned away and why (`type`, `size`, `count`), after a pick or a drop. */
  onFilesRejected?: (rejections: FileRejection[]) => void
  /** File types the zone takes, as the file input reads them: `.pdf,image/*`. Defaults to any. */
  accept?: string
  /** Takes several files at once. Defaults to `false`. */
  multiple?: boolean
  /** Most files one pick or drop may add; the rest are rejected as `count`. Pass what is left when you keep a list. */
  maxFiles?: number
  /** Largest file in bytes; bigger ones are rejected as `size`. */
  maxSize?: number
  /** The main line. Defaults to `"Drop a file here or click to browse"` (`"files"` with `multiple`). */
  label?: ReactNode
  /** The line under it: the types and sizes the zone takes, e.g. "PDF or PNG, up to 10 MB". */
  description?: ReactNode
  /** The main line while files the zone takes are dragged over it. Defaults to `"Drop to add"`. */
  activeLabel?: ReactNode
  /** The main line while some of the dragged files will be taken and the rest turned away (a wrong type, past `maxFiles`). Defaults to `"Some files will be skipped"`. */
  partialLabel?: ReactNode
  /** The main line while none of the dragged files can be taken; the drop is refused. Defaults to `"These files can't be added"`. */
  rejectLabel?: ReactNode
  /** Glyph above the labels. Defaults to the `upload` icon. */
  icon?: IconComponent
  /** Content in place of the glyph and labels. */
  children?: ReactNode
  /** Id of the file input, for a `Label`'s `htmlFor`. Inside a Field it is wired for you. */
  id?: string
  /** Tells assistive tech a file is required (`aria-required`). The zone keeps no files, so native validation never blocks a submit: check your own list. Defaults to the surrounding Field's `required`. */
  required?: boolean
  /** Turns the zone destructive. Defaults to the surrounding Field's `invalid`. */
  invalid?: boolean
  /** Dims the zone and turns files away. Defaults to the surrounding Field's `disabled`. */
  disabled?: boolean
  /** Shows the zone without taking files: no browse, no drop, no hover. Defaults to the surrounding Field's `readOnly`. */
  readOnly?: boolean
  /** Pins the zone to one step of the size ladder: compact tightens the padding and steps the text down. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the zone. */
  className?: string
  /** Inline styles for the zone (its `<label>` root). The other attributes of a `<label>` (`title`, `data-*`, `aria-*`, `onClick`) reach it too, and drag handlers run before the zone's own. */
  style?: CSSProperties
}

type DragState = 'idle' | DragVerdict

// Literal tables: UnoCSS only generates the classes it can read whole.
const PAD = { default: 'px-6 py-8', compact: 'px-4 py-5' }

type FileDropzoneComponent = ForwardRefExoticComponent<FileDropzoneProps & RefAttributes<HTMLInputElement>> & {
  Row: typeof FileRow
}

/**
 * A zone to drop files on, or click to pick them.
 *
 * Drag files over it and it lights up; the line changes to say whether it
 * will take them, reading their types while they are still in the air: all
 * of them, some (the rest will be skipped), or none, when it turns
 * destructive and refuses the drop. Dropped or picked files are sorted
 * against `accept`, `maxSize` and `maxFiles`: the ones that pass go to
 * `onFilesChange`, the rest to `onFilesRejected` with a reason. The zone
 * keeps none (its input is cleared after every pick, so nothing submits with
 * a native form and `required` is only announced), so the list, the upload
 * and its errors stay yours. Show each
 * file in a `FileDropzone.Row`. Every line is a prop, for translation. The
 * zone is a label around a hidden file input, so a click or Enter opens the
 * picker, and inside a Field it is labelled and takes the field's state. The
 * ref reaches the input: `ref.current.click()` reopens the picker, e.g. to
 * replace a file.
 *
 * Statics:
 * - `FileDropzone.Row` (also `FileRow`) — one file: its glyph or
 *   `thumbnail`, name, size, and a remove button with `onRemove`: `file` (or
 *   `name` / `fileSize` / `type`), `status` (`idle`, `uploading`, `done`,
 *   `error`), `progress` (0–100), `error`, `description`, `actions`,
 *   `removeLabel`, `locale`.
 *
 * Also exported from this item: `formatFileSize(bytes, locale)`, `sortFiles`
 * and `acceptsFile`, plain functions a server can call too.
 *
 * @example {@include ./examples.mdx}
 */
const FileDropzone = forwardRef<HTMLInputElement, FileDropzoneProps>(
  (
    {
      onFilesChange,
      onFilesRejected,
      accept,
      multiple = false,
      maxFiles,
      maxSize,
      label,
      description,
      activeLabel = 'Drop to add',
      partialLabel = 'Some files will be skipped',
      rejectLabel = "These files can't be added",
      icon,
      children,
      id,
      required,
      invalid,
      disabled,
      readOnly,
      size: sizeProp,
      className,
      style,
      onDragEnter: dragEnter,
      onDragOver: dragOver,
      onDragLeave: dragLeave,
      onDrop: dropped,
      ...rest
    },
    ref,
  ) => {
    const field = useFieldState()
    const size = useSize(sizeProp)
    const shape = useShape()
    const reduced = useReduceMotion()
    const Upload = useIcon('upload')
    const Glyph = icon ?? Upload
    const compact = size.variant === 'compact'

    const isInvalid = invalid ?? field?.invalid ?? false
    const isDisabled = disabled ?? field?.disabled ?? false
    const isReadOnly = readOnly ?? field?.readOnly ?? false
    const closed = isDisabled || isReadOnly

    const [drag, setDrag] = useState<DragState>('idle')
    // dragenter / dragleave fire for every child crossed; count them so the
    // zone only goes idle when the pointer really leaves.
    const depth = useRef(0)

    const hand = (files: File[]) => {
      if (!files.length) return
      const { accepted, rejected } = sortFiles(files, { accept, maxSize, maxFiles, multiple })
      if (accepted.length) onFilesChange?.(accepted)
      if (rejected.length) onFilesRejected?.(rejected)
    }

    const onDragEnter = (e: DragEvent<HTMLLabelElement>) => {
      dragEnter?.(e)
      if (closed || !e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      depth.current++
      const types = [...e.dataTransfer.items].filter(item => item.kind === 'file').map(item => item.type)
      // Only a drag where nothing can pass is refused; a mixed one drops, and sortFiles splits it.
      setDrag(dragVerdict(types, accept, multiple ? (maxFiles ?? Number.POSITIVE_INFINITY) : 1))
    }

    const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
      dragOver?.(e)
      if (closed || drag === 'idle') return
      e.preventDefault()
      e.dataTransfer.dropEffect = drag === 'reject' ? 'none' : 'copy'
    }

    const onDragLeave = (e: DragEvent<HTMLLabelElement>) => {
      dragLeave?.(e)
      if (drag === 'idle') return
      depth.current = Math.max(depth.current - 1, 0)
      if (depth.current === 0) setDrag('idle')
    }

    const onDrop = (e: DragEvent<HTMLLabelElement>) => {
      dropped?.(e)
      if (closed) return
      e.preventDefault()
      depth.current = 0
      setDrag('idle')
      hand([...e.dataTransfer.files])
    }

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
      hand([...(e.target.files ?? [])])
      // Clear it, so picking the same file again still reports it.
      e.target.value = ''
    }

    const line =
      drag === 'accept'
        ? activeLabel
        : drag === 'partial'
          ? partialLabel
          : drag === 'reject'
            ? rejectLabel
            : (label ?? (multiple ? 'Drop files here or click to browse' : 'Drop a file here or click to browse'))

    return (
      // biome-ignore lint/a11y/noLabelWithoutControl: the file input inside is the control (Field.Control renders it).
      <label
        {...rest}
        style={style}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-dragging={drag === 'idle' ? undefined : drag}
        data-invalid={isInvalid || undefined}
        data-disabled={isDisabled || undefined}
        data-readonly={isReadOnly || undefined}
        className={cn(
          'group/zone relative flex cursor-pointer flex-col items-center justify-center text-center',
          'border border-dashed border-border transition-[background-color,border-color,opacity] duration-fast',
          'hover:bg-muted/50 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-focus-ring',
          'data-[dragging=accept]:border-solid data-[dragging=accept]:!border-border data-[dragging=accept]:!bg-muted',
          'data-[dragging=partial]:border-solid data-[dragging=partial]:!border-border data-[dragging=partial]:!bg-muted',
          'data-[invalid]:border-destructive/50 data-[invalid]:hover:bg-destructive-light/60',
          'data-[dragging=reject]:border-solid data-[dragging=reject]:border-destructive/50 data-[dragging=reject]:!bg-destructive-light/60',
          'data-[readonly]:cursor-default data-[readonly]:hover:bg-transparent',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          size.gap,
          PAD[size.variant],
          shape.container,
          className,
        )}
      >
        {/* Field.Control: on its own a plain file input, inside a Field it
            joins the field's label, description and error. */}
        <Field.Control
          ref={ref}
          id={id}
          disabled={closed}
          // Not native `required`: the input is cleared after every pick, so it would always be missing.
          aria-required={(required ?? field?.required) || undefined}
          aria-invalid={isInvalid || undefined}
          render={<input type="file" accept={accept} multiple={multiple} onChange={onChange} className="sr-only" />}
        />
        {children ?? (
          <>
            <motion.span
              className={cn(
                'flex text-muted-foreground transition-[color] duration-fast group-hover/zone:text-foreground group-data-[dragging]/zone:text-foreground',
                drag === 'reject' && 'text-destructive group-data-[dragging]/zone:text-destructive',
              )}
              initial={false}
              // The glyph rises to meet the files; with reduced motion it only darkens.
              animate={{ y: (drag === 'accept' || drag === 'partial') && !reduced ? -2 : 0 }}
              transition={spring.fast}
            >
              <Glyph
                size={size.icon}
                strokeWidth={1.5}
                className="transition-[stroke-width] duration-fast group-hover/zone:stroke-[2] group-data-[dragging]/zone:stroke-[2]"
              />
            </motion.span>
            <span className="flex flex-col">
              <span
                className={cn('weight-normal', size.text, drag === 'reject' ? 'text-destructive' : 'text-foreground')}
              >
                {line}
              </span>
              {description != null && (
                <span
                  className={cn(
                    'text-muted-foreground weight-normal',
                    compact ? 'text-caption-compact' : 'text-caption',
                  )}
                >
                  {description}
                </span>
              )}
            </span>
          </>
        )}
      </label>
    )
  },
) as FileDropzoneComponent

FileDropzone.displayName = 'FileDropzone'

Object.assign(FileDropzone, { Row: FileRow })

export type { FileRowProps, FileRowStatus } from './file-row'
export type { DragVerdict, FileRejection, FileRejectionReason } from './variants'
export { acceptsFile, dragVerdict, formatFileSize, sortFiles } from './variants'
export type { FileDropzoneProps }
export { FileDropzone, FileRow }
export default FileDropzone
