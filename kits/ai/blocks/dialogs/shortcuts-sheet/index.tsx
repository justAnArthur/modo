/*!
 * Local addition: the AI app's keyboard shortcuts reference. A Dialog with
 * the shortcuts in groups (sessions, navigation, composer, panes), each a
 * label and its keys as Kbd chips, and a field that filters them by what
 * they do or by their keys.
 */

'use client'

import Kbd from '@justanarthur/modo-ui/components/data-display/kbd'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { type ReactElement, useEffect } from 'react'
import { useIcon } from '../../../lib/icons'

export interface Shortcut {
  /** What it does. */
  label: string
  /** The keys: one string per chord, several for a sequence (`['G', 'S']`). */
  keys: string[]
  /** More words the filter matches. */
  keywords?: string[]
}

export interface ShortcutGroup {
  label: string
  shortcuts: Shortcut[]
}

function matches(shortcut: Shortcut, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [shortcut.label, shortcut.keys.join(' '), ...(shortcut.keywords ?? [])].some(text =>
    text.toLowerCase().includes(q),
  )
}

interface ShortcutsSheetPanelProps {
  /** The shortcuts, in groups. */
  groups: ShortcutGroup[]
  /** Controlled filter. Pair with `onQueryChange`. */
  query?: string
  /** The filter it starts with. Defaults to `''`. */
  defaultQuery?: string
  /** Called as the filter changes. */
  onQueryChange?: (query: string) => void
  /** Classes for the root. */
  className?: string
}

/** The shortcuts on their own, without the Dialog: the filter and the groups. */
function ShortcutsSheetPanel({ groups, query, defaultQuery = '', onQueryChange, className }: ShortcutsSheetPanelProps) {
  const [q, setQ] = useControllableState(query, defaultQuery, onQueryChange)
  const SearchIcon = useIcon('search')
  const shown = groups
    .map(group => ({ ...group, shortcuts: group.shortcuts.filter(s => matches(s, q)) }))
    .filter(group => group.shortcuts.length > 0)

  return (
    <div className={cn('@container flex min-h-0 flex-col gap-[var(--space-4)]', className)}>
      <div className="flex items-center gap-[var(--space-3)] pr-[var(--space-6)]">
        <h2 className="m-0 text-title text-foreground">Keyboard shortcuts</h2>
        <Input
          autoFocus
          variant="bordered"
          size="compact"
          icon={SearchIcon}
          aria-label="Filter shortcuts"
          placeholder="Filter…"
          className="ml-auto w-56"
          value={q}
          onValueChange={setQ}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
        {shown.length === 0 ? (
          <p className="m-0 py-[var(--space-6)] text-center text-body text-muted-foreground">
            No shortcut matches “{q.trim()}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-[var(--space-6)] gap-y-[var(--space-5)] @lg:grid-cols-2">
            {shown.map(group => (
              <section key={group.label} aria-label={group.label} className="flex flex-col">
                <span className="pb-[var(--space-1)] text-caption text-muted-foreground">{group.label}</span>
                <dl className="m-0 flex flex-col">
                  {group.shortcuts.map(shortcut => (
                    <div
                      key={shortcut.label}
                      className="flex h-8 items-center gap-[var(--space-3)] border-b border-border last:border-b-0"
                    >
                      <dt className="min-w-0 flex-1 truncate text-body text-foreground">{shortcut.label}</dt>
                      <dd className="m-0 flex shrink-0 items-center gap-[var(--space-1)]">
                        {shortcut.keys.map((key, i) => (
                          <span key={`${i}-${key}`} className="flex items-center gap-[var(--space-1)]">
                            {i > 0 && <span className="text-caption text-muted-foreground">then</span>}
                            <Kbd>{key}</Kbd>
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface ShortcutsSheetProps {
  /** The shortcuts, in groups. */
  groups: ShortcutGroup[]
  /** The control that opens it. */
  trigger?: ReactElement
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** The key that toggles it with ⌘ (Ctrl elsewhere); `false` leaves the keyboard alone. Defaults to `'/'`. */
  hotkey?: string | false
  /** The filter it starts with. Defaults to `''`. */
  defaultQuery?: string
}

/**
 * Every keyboard shortcut in the app, in one place: sessions, navigation,
 * the composer and the panes.
 *
 * Each row is what the shortcut does and its keys, a chord as one keycap and
 * a sequence as several. Type to filter by what a shortcut does or by its
 * keys ("⌘", "pane", "send"); groups with nothing left hide. ⌘/ (Ctrl+/
 * elsewhere) opens it from anywhere; the dialog grows out of its trigger.
 * `ShortcutsSheet.Panel` is the same list without the dialog.
 *
 * Statics:
 * - `ShortcutsSheet.Panel` — the list on its own: `groups`, `query`, `defaultQuery`.
 *
 * @example {@include ./examples.mdx}
 */
const ShortcutsSheet = Object.assign(
  function ShortcutsSheet({
    groups,
    trigger,
    open,
    defaultOpen = false,
    onOpenChange,
    hotkey = '/',
    defaultQuery,
  }: ShortcutsSheetProps) {
    const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)

    useEffect(() => {
      if (!hotkey) return
      const onKey = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === hotkey) {
          event.preventDefault()
          setOpen(!isOpen)
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [hotkey, isOpen, setOpen])

    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <Dialog.Trigger render={trigger} />}
        <Dialog.Content width="xl" aria-label="Keyboard shortcuts" className="flex max-h-[min(600px,80dvh)] flex-col">
          <ShortcutsSheetPanel groups={groups} defaultQuery={defaultQuery} className="flex-1" />
        </Dialog.Content>
      </Dialog>
    )
  },
  { Panel: ShortcutsSheetPanel },
)

export type { ShortcutsSheetPanelProps, ShortcutsSheetProps }
export { ShortcutsSheet, ShortcutsSheetPanel }

export default ShortcutsSheet
