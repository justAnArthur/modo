/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Popover page's anchored example. A field whose button opens a panel
 * anchored to the whole field, focus moving into the list from the keyboard
 * and back to the text on close, so the example can hold its refs and the
 * picked value.
 */

'use client'

import { History } from 'lucide-react'
import { useRef, useState } from 'react'
import Button from '../../actions/button'
import Input from '../../inputs/input'
import Popover from './index'

const RECENT = ['Quarterly report', 'Invoices from March', 'Design review notes']

export default function AnchoredDemo() {
  const field = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const first = useRef<HTMLButtonElement | null>(null)
  const [value, setValue] = useState('')

  return (
    <div ref={field} className="flex w-80 max-w-full items-center gap-1">
      <Input
        ref={input}
        variant="bordered"
        placeholder="Search documents"
        aria-label="Search documents"
        value={value}
        onValueChange={setValue}
      />
      <Popover>
        <Popover.Trigger
          render={
            <Button variant="ghost" size="icon" aria-label="Recent searches">
              <History />
            </Button>
          }
        />
        <Popover.Content
          anchor={field}
          align="start"
          sideOffset={8}
          initialFocus={type => (type === 'keyboard' ? first.current : false)}
          finalFocus={input}
          className="w-[var(--anchor-width)] max-w-none gap-0 p-1"
        >
          <Popover.Title className="sr-only">Recent searches</Popover.Title>
          {RECENT.map((item, i) => (
            <Popover.Close
              key={item}
              ref={i === 0 ? first : undefined}
              render={
                <Button variant="ghost" className="w-full justify-start">
                  {item}
                </Button>
              }
              onClick={() => setValue(item)}
            />
          ))}
        </Popover.Content>
      </Popover>
    </div>
  )
}
