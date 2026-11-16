/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * VirtualList page's jump. A field and a button that call `scrollToIndex`,
 * so the example stays hook-free.
 */

'use client'

import { useRef, useState } from 'react'
import Button from '../../components/button'
import Input from '../../components/inputs/input'
import VirtualList, { type VirtualListHandle } from './index'

interface JumpDemoProps {
  /** Number of rows. */
  count: number
}

export default function JumpDemo({ count }: JumpDemoProps) {
  const list = useRef<VirtualListHandle>(null)
  const [target, setTarget] = useState('5000')
  const jump = () => list.current?.scrollToIndex(Number(target) - 1, 'center')

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={e => {
          e.preventDefault()
          jump()
        }}
      >
        <Input aria-label="Row" variant="bordered" inputMode="numeric" value={target} onValueChange={setTarget} />
        <Button type="submit" variant="tertiary">
          Jump
        </Button>
      </form>
      <VirtualList
        ref={list}
        label="Rows"
        count={count}
        itemHeight={36}
        className="h-72 rounded-xl border border-border"
        renderItem={i => (
          <div className="flex h-full items-center gap-3 px-3 text-body">
            <span className="w-12 tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="truncate text-foreground">Row {i + 1}</span>
          </div>
        )}
      />
    </div>
  )
}
