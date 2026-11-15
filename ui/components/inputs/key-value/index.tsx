/*!
 * Local addition (not part of Fluid Functionalism): an editable list of key /
 * value pairs (environment variables, request headers). Each row is two text
 * fields on the field ladder (`lib/field-classes.ts`), a secret value masks
 * behind a reveal toggle, and a key used twice turns both rows invalid.
 */

'use client'

import { type ReactNode, useRef, useState } from 'react'
import { type FieldVariant, focusControlOnPress, useFieldBox } from '../../../lib/field-classes'
import { useIcon } from '../../../lib/icon-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import Button from '../../button'

/** One row: its key, its value, and whether the value is masked. */
interface KeyValuePair {
  key: string
  value: string
  secret?: boolean
}

interface CellProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  variant: FieldVariant
  invalid?: boolean
  disabled?: boolean
  masked?: boolean
  trailing?: ReactNode
}

function Cell({ value, onChange, label, placeholder, variant, invalid, disabled, masked, trailing }: CellProps) {
  const ref = useRef<HTMLInputElement>(null)
  const box = useFieldBox({ variant, invalid, disabled })

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the input is the focusable control; the box only forwards pointer focus from its padding.
    <div
      onMouseDown={focusControlOnPress(ref)}
      {...box.props}
      className={cn(box.props.className, 'flex min-w-0 flex-1 items-center', box.size.gap, box.size.control)}
    >
      <input
        ref={ref}
        type={masked ? 'password' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'w-full min-w-0 bg-transparent font-mono text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground',
          box.size.text,
        )}
      />
      {trailing}
    </div>
  )
}

interface RowProps {
  pair: KeyValuePair
  index: number
  duplicate: boolean
  keyPlaceholder: string
  valuePlaceholder: string
  variant: FieldVariant
  disabled?: boolean
  onChange: (pair: KeyValuePair) => void
  onRemove: () => void
}

function Row({
  pair,
  index,
  duplicate,
  keyPlaceholder,
  valuePlaceholder,
  variant,
  disabled,
  onChange,
  onRemove,
}: RowProps) {
  const [revealed, setRevealed] = useState(false)
  const size = useSize()
  const Eye = useIcon('eye')
  const EyeOff = useIcon('eye-off')
  const X = useIcon('x')
  const name = pair.key || `row ${index + 1}`

  const reveal = pair.secret && (
    <button
      type="button"
      aria-label={revealed ? `Hide ${name}` : `Show ${name}`}
      aria-pressed={revealed}
      onClick={() => setRevealed(!revealed)}
      className="-mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-glyph text-muted-foreground outline-none transition-[color] duration-fast hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
    >
      {revealed ? <EyeOff size={size.icon} strokeWidth={1.5} /> : <Eye size={size.icon} strokeWidth={1.5} />}
    </button>
  )

  return (
    <li aria-label={name} className={cn('group/row flex items-center', size.gap)}>
      <Cell
        value={pair.key}
        onChange={key => onChange({ ...pair, key })}
        label={`Key ${index + 1}`}
        placeholder={keyPlaceholder}
        variant={variant}
        invalid={duplicate}
        disabled={disabled}
      />
      <Cell
        value={pair.value}
        onChange={value => onChange({ ...pair, value })}
        label={`Value ${index + 1}`}
        placeholder={valuePlaceholder}
        variant={variant}
        disabled={disabled}
        masked={pair.secret && !revealed}
        trailing={reveal}
      />
      <Button
        variant="ghost"
        size={size.variant === 'compact' ? 'icon-compact' : 'icon'}
        aria-label={`Remove ${name}`}
        disabled={disabled}
        onClick={onRemove}
        className="shrink-0 opacity-0 transition-[opacity] duration-fast focus-visible:opacity-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100"
      >
        <X />
      </Button>
    </li>
  )
}

interface KeyValueProps {
  /** Controlled rows. Pair with `onValueChange`. */
  value?: KeyValuePair[]
  /** Initial rows, for an uncontrolled list. Defaults to `[]`. */
  defaultValue?: KeyValuePair[]
  /** Called with every row whenever one is edited, added or removed. */
  onValueChange?: (value: KeyValuePair[]) => void
  /** Placeholder of each key field. Defaults to `'Key'`. */
  keyPlaceholder?: string
  /** Placeholder of each value field. Defaults to `'Value'`. */
  valuePlaceholder?: string
  /** Label of the button that adds a row. Defaults to `'Add'`. */
  addLabel?: string
  /** Whether a new row masks its value. Defaults to `false`. */
  secretByDefault?: boolean
  /** Framed at rest, or invisible until hovered or focused. Defaults to `'bordered'`. */
  variant?: FieldVariant
  /** Disables every field and button. Defaults to `false`. */
  disabled?: boolean
  /** Pins the rows to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Accessible name of the list. Defaults to `'Key-value pairs'`. */
  label?: string
  /** Classes for the root. */
  className?: string
}

/**
 * An editable list of key / value pairs, for environment variables, headers
 * or labels.
 *
 * Each row is a key field and a value field on the field ladder, the same
 * box as Input, with a remove button that shows when the row is hovered or
 * focused (always on touch). A row marked `secret` masks its value; the eye
 * inside the field reveals it for this session only. A key used on more than
 * one row turns those keys invalid and names the duplicate under the list.
 * Works controlled (`value` + `onValueChange`) or uncontrolled
 * (`defaultValue`); every edit hands back the whole array.
 *
 * @example {@include ./examples.mdx}
 */
function KeyValue({
  value,
  defaultValue = [],
  onValueChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = 'Add',
  secretByDefault = false,
  variant = 'bordered',
  disabled,
  size: sizeProp,
  label = 'Key-value pairs',
  className,
}: KeyValueProps) {
  const [pairs, setPairs] = useControllableState(value, defaultValue, onValueChange)
  const size = useSize(sizeProp)
  const Plus = useIcon('plus')

  // Stable row ids, so a removed row takes its reveal state with it.
  const ids = useRef<number[]>([])
  const nextId = useRef(0)
  while (ids.current.length < pairs.length) ids.current.push(nextId.current++)
  ids.current.length = pairs.length

  const counts = new Map<string, number>()
  for (const { key } of pairs) if (key.trim()) counts.set(key.trim(), (counts.get(key.trim()) ?? 0) + 1)
  const duplicates = [...counts].filter(([, n]) => n > 1).map(([key]) => key)

  const update = (index: number, pair: KeyValuePair) => setPairs(pairs.map((p, i) => (i === index ? pair : p)))
  const remove = (index: number) => {
    ids.current.splice(index, 1)
    setPairs(pairs.filter((_, i) => i !== index))
  }

  const list = (
    <div className={cn('flex w-full flex-col', size.gap, className)}>
      <ul aria-label={label} className={cn('flex flex-col empty:hidden', size.gap)}>
        {pairs.map((pair, i) => (
          <Row
            key={ids.current[i]}
            pair={pair}
            index={i}
            duplicate={duplicates.includes(pair.key.trim())}
            keyPlaceholder={keyPlaceholder}
            valuePlaceholder={valuePlaceholder}
            variant={variant}
            disabled={disabled}
            onChange={next => update(i, next)}
            onRemove={() => remove(i)}
          />
        ))}
      </ul>

      <p
        aria-live="polite"
        className={cn(
          'text-destructive weight-medium',
          size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
          duplicates.length === 0 && 'sr-only',
        )}
      >
        {duplicates.length > 0 && `Duplicate ${duplicates.length > 1 ? 'keys' : 'key'}: ${duplicates.join(', ')}`}
      </p>

      <Button
        variant="ghost"
        size={size.variant}
        leadingIcon={Plus}
        disabled={disabled}
        onClick={() => setPairs([...pairs, { key: '', value: '', secret: secretByDefault || undefined }])}
        className="self-start"
      >
        {addLabel}
      </Button>
    </div>
  )

  return sizeProp ? <SizeProvider size={sizeProp}>{list}</SizeProvider> : list
}

export type { KeyValuePair, KeyValueProps }
export { KeyValue }

export default KeyValue
