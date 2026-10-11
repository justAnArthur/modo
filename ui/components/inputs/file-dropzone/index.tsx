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
  type DragEvent,
  type ForwardRefExoticComponent,
  forwardRef,
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
import { acceptsDragTypes, type FileRejection, sortFiles } from './variants'

interface FileDropzoneProps {
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
  /** The main line while files the zone can't take are dragged over it. Defaults to `"These files can't be added"`. */
  rejectLabel?: ReactNode
  /** Glyph above the labels. Defaults to the `upload` icon. */
  icon?: IconComponent
  /** Content in place of the glyph and labels. */
  children?: ReactNode
  /** Names the file input when the form is submitted. */
  name?: string
  /** Id of the file input, for a `Label`'s `htmlFor`. Inside a Field it is wired for you. */
  id?: string
  /** Marks a file required. Defaults to the surrounding Field's `required`. */
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
}

type DragState = 'idle' | 'accept' | 'reject'

// Literal tables: UnoCSS only generates the classes it can read whole.
const PAD = { default: 'px-6 py-8', compact: 'px-4 py-5' }

type FileDropzoneComponent = ForwardRefExoticComponent<FileDropzoneProps & RefAttributes<HTMLInputElement>> & {
  Row: typeof FileRow
}

/**
 * A zone to drop files on, or click to pick them.
 *
 * Drag files over it and it lights up; the line changes to say whether it
 * will take them (it reads their types while they are still in the air), and
 * turns destructive when it won't. Dropped or picked files are sorted
 * against `accept`, `maxSize` and `maxFiles`: the ones that pass go to
 * `onFilesChange`, the rest to `onFilesRejected` with a reason, and the zone
 * keeps none, so the list, the upload and its errors stay yours. Show each
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
      rejectLabel = "These files can't be added",
      icon,
      children,
      name,
      id,
      required,
      invalid,
      disabled,
      readOnly,
      size: sizeProp,
      className,
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

    const onDragEnter = (e: DragEvent) => {
      if (closed || !e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      depth.current++
      const items = [...e.dataTransfer.items].filter(item => item.kind === 'file')
      const tooMany = !multiple ? items.length > 1 : maxFiles != null && items.length > maxFiles
      const types = items.map(item => item.type)
      setDrag(tooMany || !acceptsDragTypes(types, accept) ? 'reject' : 'accept')
    }

    const onDragOver = (e: DragEvent) => {
      if (closed || drag === 'idle') return
      e.preventDefault()
      e.dataTransfer.dropEffect = drag === 'reject' ? 'none' : 'copy'
    }

    const onDragLeave = () => {
      if (drag === 'idle') return
      depth.current = Math.max(depth.current - 1, 0)
      if (depth.current === 0) setDrag('idle')
    }

    const onDrop = (e: DragEvent) => {
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
        : drag === 'reject'
          ? rejectLabel
          : (label ?? (multiple ? 'Drop files here or click to browse' : 'Drop a file here or click to browse'))

    return (
      // biome-ignore lint/a11y/noLabelWithoutControl: the file input inside is the control (Field.Control renders it).
      <label
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
          name={name}
          disabled={closed}
          required={required ?? field?.required}
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
              animate={{ y: drag === 'accept' && !reduced ? -2 : 0 }}
              transition={spring.fast}
            >
              <Glyph
                size={compact ? 16 : 20}
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
export type { FileRejection, FileRejectionReason } from './variants'
export { acceptsFile, formatFileSize, sortFiles } from './variants'
export type { FileDropzoneProps }
export { FileDropzone, FileRow }
export default FileDropzone
