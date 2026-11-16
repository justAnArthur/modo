/*
 * Local addition (not part of Fluid Functionalism): an editable list of key /
 * value pairs (environment variables, request headers). Each row is two
 * Inputs in monospace, a secret value masks behind an `InputAction` reveal,
 * and a key used twice turns both rows invalid.
 */

'use client'

import { useRef, useState } from 'react'
import type { FieldVariant } from '../../../lib/field-classes'
import { useIcon } from '../../../lib/icon-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import Button from '../../button'
import Input, { InputAction } from '../input'

/** One row: its key, its value, and whether the value is masked. */
interface KeyValuePair {
  key: string
  value: string
  secret?: boolean
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
    <InputAction
      label={revealed ? `Hide ${name}` : `Show ${name}`}
      aria-pressed={revealed}
      icon={revealed ? EyeOff : Eye}
      disabled={disabled}
      onClick={() => setRevealed(!revealed)}
    />
  )
  const cell = 'min-w-0 flex-1 font-mono'

  return (
    <li aria-label={name} className={cn('group/row flex items-center', size.gap)}>
      <Input
        value={pair.key}
        onValueChange={key => onChange({ ...pair, key })}
        aria-label={`Key ${index + 1}`}
        placeholder={keyPlaceholder}
        variant={variant}
        invalid={duplicate}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className={cell}
      />
      <Input
        value={pair.value}
        onValueChange={value => onChange({ ...pair, value })}
        aria-label={`Value ${index + 1}`}
        placeholder={valuePlaceholder}
        type={pair.secret && !revealed ? 'password' : 'text'}
        variant={variant}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        endAdornment={reveal}
        className={cell}
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
 * Each row is a key Input and a value Input in monospace, with a remove button that shows when the row is hovered or
 * focused (always on touch). A row marked `secret` masks its value; the eye
 * inside the field reveals it for this session only, keeping the caret. A key used on more than
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

  return <SizeScope size={sizeProp}>{list}</SizeScope>
}

export type { KeyValuePair, KeyValueProps }
export { KeyValue }

export default KeyValue
