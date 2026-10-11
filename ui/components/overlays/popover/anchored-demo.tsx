/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Popover page's anchored example. A field whose icon opens a panel anchored
 * to the whole field, focus moving into the list and back to the text, so
 * the example can hold its refs and the picked value.
 */

import { History } from 'lucide-react'
import { useRef, useState } from 'react'
import Button from '../../button'
import Input, { InputAction } from '../../inputs/input'
import Popover from './index'

const RECENT = ['Quarterly report', 'Invoices from March', 'Design review notes']

export default function AnchoredDemo() {
  const field = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const first = useRef<HTMLButtonElement | null>(null)
  const [value, setValue] = useState('')

  return (
    <div ref={field} className="w-80 max-w-full">
      <Popover>
        <Input
          ref={input}
          variant="bordered"
          placeholder="Search documents"
          value={value}
          onChange={setValue}
          endAdornment={<Popover.Trigger render={<InputAction label="Recent searches" icon={History} />} />}
        />
        <Popover.Content
          anchor={field}
          align="start"
          sideOffset={8}
          // From the keyboard, straight onto the first result; a click focuses the panel.
          initialFocus={type => (type === 'keyboard' ? first.current : true)}
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
