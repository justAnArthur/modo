/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Checkbox page's indeterminate example. A "select all" checkbox over bare
 * row checkboxes: it shows the dash while some rows are checked, so the
 * example stays hook-free.
 */

import { useState } from 'react'
import { Label } from '../input'
import Checkbox from './index'

interface SelectAllDemoProps {
  /** The rows' labels. */
  rows: string[]
  /** Rows checked at first, by position. Defaults to the first. */
  defaultChecked?: number[]
}

export default function SelectAllDemo({ rows, defaultChecked = [0] }: SelectAllDemoProps) {
  const [checked, setChecked] = useState(() => new Set(defaultChecked))
  const all = checked.size === rows.length
  const some = checked.size > 0 && !all

  return (
    <div className="flex w-64 max-w-full flex-col gap-3">
      <Checkbox
        label="Select all"
        checked={some ? 'indeterminate' : all}
        onCheckedChange={next => setChecked(next ? new Set(rows.map((_, i) => i)) : new Set())}
      />
      {rows.map((row, i) => (
        <div key={row} className="flex items-center gap-2 pl-8">
          <Checkbox
            id={`select-all-${i}`}
            checked={checked.has(i)}
            onCheckedChange={next => {
              const set = new Set(checked)
              if (next) set.add(i)
              else set.delete(i)
              setChecked(set)
            }}
          />
          <Label htmlFor={`select-all-${i}`}>{row}</Label>
        </div>
      ))}
    </div>
  )
}
