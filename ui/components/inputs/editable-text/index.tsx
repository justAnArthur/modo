/*!
 * Local addition (not part of Fluid Functionalism): text you rename in place.
 * The field box (`lib/field-classes.ts`) stays put while the text inside it
 * turns into an input, so nothing around it moves.
 */

'use client'

import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'
import { useFieldBox } from '../../../lib/field-classes'
import { useIcon } from '../../../lib/icon-context'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'

interface EditableTextProps {
  /** Controlled text. Pair with `onValueChange`. */
  value?: string
  /** Initial text, for an uncontrolled field. Defaults to `''`. */
  defaultValue?: string
  /** Called with the new text when an edit is committed and changed it. */
  onValueChange?: (value: string) => void
  /** Shown, muted, while the text is empty. */
  placeholder?: string
  /** The accessible name of the input and the pencil button, e.g. "Session title". Defaults to `'Edit'`. */
  label?: string
  /** Show the pencil button, revealed on hover or focus. Defaults to `true`. */
  editButton?: boolean
  /** Dims the text and keeps it from being edited. */
  disabled?: boolean
  /** Pins the field to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the box. */
  className?: string
}

/**
 * Text that turns into an input where it stands: a title, a name, a label
 * you rename in place.
 *
 * Double-click it, or focus it and press Enter or F2, or press the pencil
 * that shows on hover. The text is selected; Enter or leaving the field
 * commits, Escape puts the old text back. The text and the input share one
 * box on the field ladder, invisible at rest and lit on hover, so editing
 * never moves anything around it. Works controlled (`value` +
 * `onValueChange`) or uncontrolled (`defaultValue`).
 *
 * @example {@include ./examples.mdx}
 */
function EditableText({
  value,
  defaultValue = '',
  onValueChange,
  placeholder,
  label = 'Edit',
  editButton = true,
  disabled,
  size: sizeProp,
  className,
}: EditableTextProps) {
  const [text, setText] = useControllableState(value, defaultValue, onValueChange)
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLButtonElement>(null)
  const field = useFieldBox({ variant: 'borderless', disabled, size: sizeProp })
  const size = field.size
  const Pencil = useIcon('pencil')
  const editing = draft !== null

  useLayoutEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const start = () => {
    if (!field.disabled) setDraft(text)
  }

  const finish = (commit: boolean, refocus: boolean) => {
    if (draft === null) return
    if (commit) setText(draft)
    setDraft(null)
    if (refocus) requestAnimationFrame(() => textRef.current?.focus())
  }

  const onInputKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    finish(e.key === 'Enter', true)
  }

  const onTextKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== 'F2') return
    e.preventDefault()
    start()
  }

  const shown = editing ? draft : text
  const cell = cn('col-start-1 row-start-1 min-w-0 truncate whitespace-pre', size.text)

  return (
    <div
      {...field.props}
      className={cn(
        field.props.className,
        'inline-flex max-w-full min-w-0 items-center has-[:focus-visible]:!ring-focus-ring',
        size.control,
        size.gap,
        className,
      )}
    >
      <span className="inline-grid min-w-0 flex-1">
        {editing ? (
          <>
            {/* The invisible copy sizes the box to the draft, so it grows as you type. */}
            <span aria-hidden="true" className={cn(cell, 'invisible')}>
              {draft || placeholder || ' '}
            </span>
            <input
              ref={inputRef}
              size={1}
              value={draft}
              aria-label={label}
              placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onInputKey}
              onBlur={() => finish(true, false)}
              className={cn(
                cell,
                'w-full bg-transparent p-0 text-foreground outline-none placeholder:text-muted-foreground',
              )}
            />
          </>
        ) : (
          <button
            ref={textRef}
            type="button"
            disabled={field.disabled}
            onDoubleClick={start}
            onKeyDown={onTextKey}
            className={cn(
              cell,
              'select-none text-left outline-none',
              shown ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {shown || placeholder}
          </button>
        )}
      </span>
      {editButton && (
        <button
          type="button"
          aria-label={label}
          tabIndex={editing ? -1 : undefined}
          disabled={field.disabled}
          // Keeps focus in the input, so pressing it mid-edit doesn't commit by blur first.
          onMouseDown={e => e.preventDefault()}
          onClick={editing ? () => inputRef.current?.focus() : start}
          className={cn(
            'flex shrink-0 cursor-pointer items-center text-muted-foreground opacity-0 outline-none transition-[color,opacity] duration-fast hover:text-foreground focus-visible:opacity-100 group-hover/field:opacity-100 pointer-coarse:opacity-100',
            editing && 'invisible',
          )}
        >
          <Pencil size={size.icon} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}

export type { EditableTextProps }
export { EditableText }

export default EditableText
