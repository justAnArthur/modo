/*
 * Local addition (not part of Fluid Functionalism): the bad side of the Craft
 * page. Each demo breaks exactly one rule of the system on purpose and keeps
 * everything else on tokens, so the comparison shows only that rule. Never
 * copy these into an item.
 */

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { motion } from 'motion/react'
import { useState } from 'react'
import Button from '../../components/button'
import { useIcon } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { useSurface } from '../../lib/surface-context'
import { cn } from '../../lib/utils'

/** The selected label turns bold on the bare text node, so it widens and shoves its neighbours. */
export function BoldTabs({ labels }: { labels: string[] }) {
  const [active, setActive] = useState(0)
  const size = useSize()
  const shape = useShape()

  return (
    <div className="flex items-center gap-1">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => setActive(i)}
          className={cn(
            'cursor-pointer px-3 outline-none',
            size.control,
            size.text,
            shape.bg,
            i === active ? 'bg-hover font-bold text-foreground' : 'text-muted-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Each row lights itself on `:hover`, so the light blinks off in every gap and jumps between rows. */
export function RowHover({ items }: { items: string[] }) {
  const size = useSize()
  const shape = useShape()

  return (
    <div className="flex w-56 flex-col gap-1 p-1">
      {items.map(item => (
        <button
          key={item}
          type="button"
          className={cn(
            'flex cursor-pointer items-center text-left text-foreground outline-none hover:bg-hover',
            size.control,
            size.itemPx,
            size.text,
            shape.bg,
          )}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

/** Presses by scaling: the same 4% is 10px sideways on a wide button and under 2px vertically. */
export function ScalePress() {
  const size = useSize()
  const shape = useShape()
  const button = cn(
    'flex cursor-pointer items-center justify-center bg-foreground px-4 text-background outline-none',
    size.control,
    size.text,
    shape.button,
  )

  return (
    <div className="flex w-64 flex-col items-start gap-3">
      <motion.button type="button" whileTap={{ scale: 0.96 }} transition={spring.fast} className={button}>
        Save
      </motion.button>
      <motion.button type="button" whileTap={{ scale: 0.96 }} transition={spring.fast} className={cn(button, 'w-full')}>
        Continue to checkout
      </motion.button>
    </div>
  )
}

/** Only the small icon copies, and its feedback snaps from one glyph to the other. */
export function IconCopy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const size = useSize()
  const shape = useShape()
  const CopyIcon = useIcon('copy')
  const CheckIcon = useIcon('check')

  const copy = () => {
    void navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn('flex w-64 items-center gap-1 pr-1 pl-2.5 ring-1 ring-border', size.control, shape.input)}>
      <span className={cn('min-w-0 flex-1 truncate font-mono text-foreground', size.text)}>{value}</span>
      <Button variant="ghost" size="icon-compact" aria-label="Copy" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}

/** The thumb jumps from one end to the other: there is no travel to follow. */
export function SnapSwitch({ label }: { label: string }) {
  const [on, setOn] = useState(false)
  const size = useSize()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className="flex cursor-pointer items-center gap-2.5 outline-none"
    >
      <span
        className={cn('flex h-5 w-[34px] rounded-full p-0.5', on ? 'justify-end bg-brand' : 'justify-start bg-accent')}
      >
        <span className="size-4 rounded-full bg-thumb shadow-thumb" />
      </span>
      <span className={cn(size.text, on ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
    </button>
  )
}

/** The panel pops in beside the trigger with no link to it, and vanishes the same way. */
export function PlainPopover({ label, title, description }: { label: string; title: string; description: string }) {
  const shape = useShape()
  const level = Math.min(useSurface() + 2, 8)

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger render={<Button variant="secondary">{label}</Button>} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={12} className="z-50 outline-none">
          <PopoverPrimitive.Popup
            className={cn(
              'flex w-60 flex-col gap-1 p-4 outline-none',
              SURFACE_BG[level],
              SURFACE_SHADOW[3],
              shape.container,
            )}
          >
            <PopoverPrimitive.Title className="text-subtitle weight-semibold text-foreground">
              {title}
            </PopoverPrimitive.Title>
            <PopoverPrimitive.Description className="text-caption text-muted-foreground">
              {description}
            </PopoverPrimitive.Description>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
