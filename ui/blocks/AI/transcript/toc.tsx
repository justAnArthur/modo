/*!
 * Local addition: the transcript's floating chapter list. A ghost icon button
 * in the transcript's corner opens a Popover with the chapters as a PickList;
 * picking one scrolls its break into view.
 */

'use client'

import Button from '../../../components/button'
import Popover from '../../../components/overlays/popover'
import { useIcon } from '../../../lib/icon-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { PickList } from '../pick-list'
import { POPOVER_FRAME, PopoverSection } from '../popover-rows'

export interface TocChapter {
  id: string
  title: string
  /** A short line under the title: when it started, how many turns. */
  detail?: string
}

export interface TocProps {
  /** The chapters, in order. */
  chapters: TocChapter[]
  /** The current chapter's id. Defaults to the last chapter. */
  defaultValue?: string
  /** Called with a chapter id when one is picked. */
  onValueChange?: (id: string) => void
}

/** The chapter list: a button that opens the chapters and jumps to one. */
export function Toc({ chapters, defaultValue, onValueChange }: TocProps) {
  const [current, setCurrent] = useControllableState<string>(
    undefined,
    defaultValue ?? chapters[chapters.length - 1]?.id ?? '',
    onValueChange,
  )
  const ListTree = useIcon('list-tree')

  const pick = (id: string) => {
    setCurrent(id)
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }

  return (
    <Popover>
      <Popover.Trigger
        render={
          <Button variant="ghost" size="icon-compact" aria-label="Chapters">
            <ListTree />
          </Button>
        }
      />
      <Popover.Content side="bottom" align="end" sideOffset={8} className={POPOVER_FRAME}>
        <PopoverSection title="Chapters">
          <PickList
            label="Chapters"
            value={current}
            onValueChange={pick}
            options={chapters.map((chapter, i) => ({
              value: chapter.id,
              label: chapter.title,
              content: (
                <span className="flex min-w-0 flex-1 gap-2">
                  <span className="w-4 shrink-0 text-right text-caption tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body text-foreground">{chapter.title}</span>
                    {chapter.detail && (
                      <span className="truncate text-caption text-muted-foreground">{chapter.detail}</span>
                    )}
                  </span>
                </span>
              ),
            }))}
          />
        </PopoverSection>
      </Popover.Content>
    </Popover>
  )
}
