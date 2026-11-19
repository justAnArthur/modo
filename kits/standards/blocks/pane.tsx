/*!
 * Local addition: the parts the side-pane blocks share (CellDetail,
 * ItemDetail, PackDetail), so their sections and close control read alike.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Code from '@justanarthur/modo-ui/primitives/content/code'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { toYaml } from '../lib/cells'
import type { LoadedItem } from '../lib/types'

const CHECK_KIND: Record<LoadedItem['check']['kind'], string> = {
  http: 'Fetches the site and asserts on what it gets',
  repo: 'Reads files in the local checkout',
  github: 'Asks GitHub about the repo',
  script: 'Runs the item’s check.ts',
  ai: 'Asks a cheap model to judge, read-only',
}

/** The pane's scrolling column: every detail block's root. */
export const PANE = 'flex min-h-0 flex-col gap-6 overflow-y-auto p-5'

/** A link-like control inside running text. */
export const TEXT_LINK =
  'cursor-pointer rounded-glyph underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-1 focus-visible:ring-focus-ring'

export function PaneSection({
  title,
  aside,
  children,
  className,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-subtitle text-foreground">{title}</h3>
        {aside && <span className="text-caption text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

export function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null
  return (
    <Button variant="ghost" size="icon-compact" aria-label="Close" onClick={onClose}>
      <X />
    </Button>
  )
}

/** A detail block's head: the title, the lines under it, and the close control. */
export function PaneHeader({
  title,
  children,
  onClose,
}: {
  title: string
  children?: ReactNode
  onClose?: () => void
}) {
  return (
    <header className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="text-title text-foreground">{title}</h2>
        {children}
      </div>
      <CloseButton onClose={onClose} />
    </header>
  )
}

/** How an item is checked: its kind in a line, then the check as its `item.yml` has it. */
export function CheckSection({ item }: { item: LoadedItem }) {
  return (
    <PaneSection title="Check" aside={`${item.check.kind} · v${item.version}`}>
      <p className="text-caption text-muted-foreground">{CHECK_KIND[item.check.kind]}.</p>
      <Code language="yaml">{toYaml(item.check)}</Code>
    </PaneSection>
  )
}
