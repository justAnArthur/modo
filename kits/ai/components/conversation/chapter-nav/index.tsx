/*!
 * Local addition (not part of Fluid Functionalism): chapters for a long
 * conversation. A ghost icon button opens a Popover with the chapters as a
 * ChoiceList; picking one scrolls its break, a titled hairline, into view.
 * Generalised from the AI app's transcript.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import List, { LIST_POPOVER } from '@justanarthur/modo-ui/components/data-display/list'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { useIcon } from '../../../lib/icons'

interface ChapterNavItem {
  /** The id of its `ChapterNav.Break`. */
  id: string
  /** The chapter's title. */
  title: string
  /** A short line under the title: when it started, how many turns. */
  detail?: string
}

interface ChapterBreakProps {
  /** The chapter's title, also its entry in the chapter list. */
  title: string
  /** The anchor id the chapter list jumps to. */
  id: string
}

/** A chapter break: a hairline with the chapter's title. */
function ChapterBreak({ title, id }: ChapterBreakProps) {
  return (
    <div id={id} className="flex scroll-mt-4 items-center gap-3 pt-2">
      <span className="shrink-0 text-caption weight-medium text-muted-foreground">{title}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

interface ChapterNavProps {
  /** The chapters, in order. */
  chapters: ChapterNavItem[]
  /** The current chapter's id. Defaults to the last chapter. */
  defaultValue?: string
  /** Called with a chapter id when one is picked. */
  onValueChange?: (id: string) => void
}

/**
 * The chapters of a long conversation, one press away.
 *
 * A ghost icon button opens a Popover listing the chapters, numbered, each
 * with a short line under its title; the current one is checked. Picking a
 * chapter scrolls its `ChapterNav.Break` (a hairline with the title, placed
 * in the conversation) to the top of the view.
 *
 * Statics:
 * - `ChapterNav.Break` — the titled hairline a chapter starts with: `title`, `id`.
 *
 * @example {@include ./examples.mdx}
 */
const ChapterNav = Object.assign(
  function ChapterNav({ chapters, defaultValue, onValueChange }: ChapterNavProps) {
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
        <Popover.Content side="bottom" align="end" sideOffset={8} className={LIST_POPOVER}>
          <List.Section title="Chapters">
            <ChoiceList
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
          </List.Section>
        </Popover.Content>
      </Popover>
    )
  },
  { Break: ChapterBreak },
)

export type { ChapterBreakProps, ChapterNavItem, ChapterNavProps }
export { ChapterBreak, ChapterNav }

export default ChapterNav
