/*
 * Local addition (not part of Fluid Functionalism): a ⌘K command palette.
 * Base UI's Autocomplete renders inline (the list is always there and filters
 * as you type; the input keeps focus while the arrows move a highlight through
 * the rows) inside this system's Dialog, so the panel grows out of its trigger
 * with the goo neck and keeps its top edge still while the list filters. The
 * rows wear Select's fluid hover: one highlight springs between them, following
 * Base UI's own highlight (pointer and keyboard alike) over the rects
 * `lib/use-fluid-hover.ts` measures. Search's suggestions reuse the list.
 */

import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { isDisabledRow, popupScrollAreaClass, popupViewportClass } from '../../../lib/popup'
import { shapeMap } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import type { SlotProps } from '../../../lib/slot'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { ScrollArea } from '../../../primitives/scroll-area'
import { DialogContent, DialogState, DialogTrigger } from '../dialog'

/** One command: the label the query matches, plus what the row shows and does. */
interface CommandItem {
  label: string
  icon?: IconComponent
  /** Shown at the end of the row; display only, nothing binds it. */
  shortcut?: string
  /** More words the query matches. */
  keywords?: string[]
  disabled?: boolean
  onSelect?: () => void
}

interface CommandGroup {
  label: string
  items: CommandItem[]
}

type CommandItems = CommandItem[] | CommandGroup[]

// Like Select's and Combobox's popups, the rows keep the "rounded" radii
// whatever the global shape, so their highlight sits concentric in the panel.
const listShape = shapeMap.rounded

const CommandContext = createContext<{ trigger: RefObject<HTMLButtonElement>; close: () => void; session: number }>({
  trigger: { current: null },
  close: () => {},
  session: 0,
})

/** Base UI's highlighted row, as its index among the rendered rows. */
const CommandHighlight = createContext<number | null>(null)
const CommandRows = createContext<((index: number, element: HTMLElement | null) => void) | undefined>(undefined)

const isGrouped = (items: CommandItems): items is CommandGroup[] => items[0] !== undefined && 'items' in items[0]

type CommandListRootProps = Omit<
  Autocomplete.Root.Props<CommandItem>,
  'items' | 'filter' | 'itemToStringValue' | 'onItemHighlighted'
> & { items: CommandItems }

/** Base UI's Autocomplete set up for command rows: it matches labels and keywords and hands its highlight to `CommandList`. */
function CommandListRoot({ items, ...props }: CommandListRootProps) {
  const [highlight, setHighlight] = useState<number | null>(null)
  const { contains } = Autocomplete.useFilter()

  return (
    <CommandHighlight.Provider value={highlight}>
      <Autocomplete.Root
        {...props}
        items={items}
        itemToStringValue={item => item.label}
        filter={(item, query) => contains([item.label, ...(item.keywords ?? [])].join(' '), query)}
        onItemHighlighted={(item, details) => setHighlight(item ? details.index : null)}
      />
    </CommandHighlight.Provider>
  )
}

function CommandShortcut({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cn('ml-auto shrink-0 font-sans text-caption text-muted-foreground', className)} {...props} />
}

function CommandRow({
  item,
  index,
  onPick,
}: {
  item: CommandItem
  index: number
  onPick: (item: CommandItem) => void
}) {
  const registerItem = useContext(CommandRows)
  const active = useContext(CommandHighlight) === index
  const ref = useRef<HTMLDivElement>(null)
  const size = useSize()
  useRegisterFluidHoverItem(registerItem, index, ref)
  const Icon = item.icon

  return (
    <Autocomplete.Item
      ref={ref}
      value={item}
      disabled={item.disabled}
      onClick={() => onPick(item)}
      className={cn(
        'relative z-10 flex shrink-0 cursor-pointer select-none items-center outline-none transition-[color] duration-fast',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        size.control,
        size.gap,
        size.itemPx,
        size.text,
        listShape.item,
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {Icon && (
        <Icon
          size={size.icon}
          strokeWidth={active ? 2 : 1.5}
          className="shrink-0 transition-[color,stroke-width] duration-fast"
        />
      )}
      <span className="min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">{item.label}</span>
      {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
    </Autocomplete.Item>
  )
}

interface CommandListProps {
  onPick: (item: CommandItem) => void
  emptyMessage: ReactNode
  className?: string
}

/** The filtered rows (grouped or flat) under one fluid highlight, inside a ScrollArea. Goes inside `CommandListRoot`. */
function CommandList({ onPick, emptyMessage, className }: CommandListProps) {
  const filtered = Autocomplete.useFilteredItems<CommandItem | CommandGroup>() as CommandItems
  const highlight = useContext(CommandHighlight)
  const compact = useSize().variant === 'compact'
  const containerRef = useRef<HTMLDivElement>(null)
  const { itemRects, isMeasured, registerItem } = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
  const rect = isMeasured && highlight !== null ? (itemRects[highlight] ?? null) : null
  const rows = (items: CommandItem[], start: number) =>
    items.map((item, i) => <CommandRow key={item.label} item={item} index={start + i} onPick={onPick} />)
  let start = 0

  return (
    <CommandRows.Provider value={registerItem}>
      <ScrollArea
        className={cn(popupScrollAreaClass, className)}
        viewportClassName={cn(popupViewportClass, 'scroll-fade')}
      >
        <Autocomplete.Empty className="px-4 py-6 text-center text-body text-muted-foreground empty:hidden">
          {emptyMessage}
        </Autocomplete.Empty>
        <Autocomplete.List ref={containerRef} className="relative flex flex-col p-1 outline-none data-[empty]:p-0">
          <FluidHoverHighlight rect={rect} session={0} className={listShape.bg} />
          {isGrouped(filtered)
            ? filtered.map(group => {
                const first = start
                start += group.items.length
                return (
                  <Autocomplete.Group key={group.label} className="flex flex-col">
                    <Autocomplete.GroupLabel
                      className={cn(
                        'shrink-0 px-2 pt-2 pb-1 text-muted-foreground',
                        compact ? 'text-caption-compact' : 'text-caption',
                      )}
                    >
                      {group.label}
                    </Autocomplete.GroupLabel>
                    {rows(group.items, first)}
                  </Autocomplete.Group>
                )
              })
            : rows(filtered, 0)}
        </Autocomplete.List>
      </ScrollArea>
    </CommandRows.Provider>
  )
}

interface CommandPaletteProps {
  /** The commands, flat or in labelled groups. */
  items: CommandItems
  /** The search field's placeholder. Defaults to `'Type a command or search…'`. */
  placeholder?: string
  /** Shown when nothing matches the query. Defaults to `'No results found.'`. */
  emptyMessage?: ReactNode
  /** Classes for the palette's box. */
  className?: string
}

function CommandPalette({
  items,
  placeholder = 'Type a command or search…',
  emptyMessage = 'No results found.',
  className,
}: CommandPaletteProps) {
  const { close } = useContext(CommandContext)
  const SearchIcon = useIcon('search')
  const size = useSize()
  const [query, setQuery] = useState('')

  return (
    <CommandListRoot
      items={items}
      inline
      open
      autoHighlight="always"
      keepHighlight
      value={query}
      onValueChange={(next, details) => {
        // A pick runs the command and closes; filling the field with it would
        // re-filter the closing panel down to one row.
        if (details.reason === 'item-press') return
        setQuery(next)
      }}
    >
      <div className={cn('flex flex-col', className)}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SearchIcon size={size.icon} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <Autocomplete.Input
            placeholder={placeholder}
            className={cn(
              'h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground',
              size.text,
            )}
          />
        </div>
        <CommandList
          emptyMessage={emptyMessage}
          className="max-h-80"
          onPick={item => {
            item.onSelect?.()
            close()
          }}
        />
      </div>
    </CommandListRoot>
  )
}

const CommandTrigger = forwardRef<HTMLButtonElement, SlotProps>((props, ref) => {
  const { trigger } = useContext(CommandContext)
  useImperativeHandle(ref, () => trigger.current as HTMLButtonElement)
  return <DialogTrigger ref={trigger} {...props} />
})
CommandTrigger.displayName = 'CommandTrigger'

interface CommandContentProps extends CommandPaletteProps {
  /** Accessible name of the panel. Defaults to `'Command menu'`. */
  label?: string
  /** Where the panel grows from (see Morph): the pressed trigger (its center when none), the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'trigger'`. */
  from?: 'trigger' | 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the trigger while open, so it reads as turning into the panel. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'slow'`. */
  tier?: 'moderate' | 'slow'
}

const CommandContent = forwardRef<HTMLDivElement, CommandContentProps>(
  ({ items, placeholder, emptyMessage, className, label = 'Command menu', ...morph }, ref) => {
    const { session } = useContext(CommandContext)
    return (
      <DialogContent
        ref={ref}
        position="top"
        size="lg"
        showCloseButton={false}
        aria-label={label}
        className="p-0"
        {...morph}
      >
        {/* Fresh per open: a palette reopened before it finished closing
            would keep the old query and lose the first row's highlight. */}
        <CommandPalette
          key={session}
          items={items}
          placeholder={placeholder}
          emptyMessage={emptyMessage}
          className={className}
        />
      </DialogContent>
    )
  },
)
CommandContent.displayName = 'CommandContent'

interface CommandScopeProps {
  open: boolean
  onOpenChange: (next: boolean, details: { trigger?: Element; event?: Event }) => void
  hotkey: string | false
  children?: ReactNode
}

function CommandScope({ open, onOpenChange, hotkey, children }: CommandScopeProps) {
  const trigger = useRef<HTMLButtonElement>(null)
  const change = useRef(onOpenChange)
  change.current = onOpenChange
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSession(session + 1)
  }

  useEffect(() => {
    if (!hotkey) return
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== hotkey) return
      event.preventDefault()
      // Opened from the keyboard, it still grows out of its trigger.
      change.current(!open, { trigger: trigger.current ?? undefined })
    }
    // Only one palette answers a press: an open one listens in the capture
    // phase, so it closes before a closed one can open.
    window.addEventListener('keydown', onKey, open)
    return () => window.removeEventListener('keydown', onKey, open)
  }, [hotkey, open])

  const ctx = useMemo(() => ({ trigger, close: () => change.current(false, {}), session }), [session])

  return (
    <CommandContext.Provider value={ctx}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </CommandContext.Provider>
  )
}

interface CommandProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled palette. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the palette opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** The key that toggles the palette with ⌘ (Ctrl elsewhere); `false` leaves the keyboard alone. Defaults to `'k'`. */
  hotkey?: string | false
  /** The trigger and the panel: `Command.Trigger` plus a `Command.Content`. */
  children?: ReactNode
}

/**
 * A ⌘K command menu: a search field over grouped commands, grown out of
 * whatever opened it.
 *
 * Type to filter by label and keywords; the arrows move one highlight
 * through the rows, springing between them like the fluid hover, and Enter
 * or a press runs the command and closes the panel. The first match is
 * always highlighted, so Enter has a target, and an empty result says so.
 * The panel is Dialog's: it grows out of its trigger with the goo neck
 * (see Morph) and sits near the top of the window, so it keeps its top edge
 * still as the list filters. ⌘K (Ctrl+K elsewhere) toggles it from anywhere
 * on the page and still grows it out of the trigger; with several palettes
 * on one page, one answers each press. Escape and a press outside close it.
 * Built on Base UI's Autocomplete, rendered inline: the input keeps focus
 * and screen readers follow the highlighted row.
 *
 * Commands are data: `{ label, icon, shortcut, keywords, disabled, onSelect }`,
 * flat or in `{ label, items }` groups. A `shortcut` is only shown.
 *
 * Statics:
 * - `Command.Trigger` — the control that opens it: `render={<Button/>}` or
 *   `asChild`.
 * - `Command.Content` — the panel: `items`, `placeholder`, `emptyMessage`,
 *   `label`, and the morph options `from`, `effect`, `hideSource`, `tier`.
 * - `Command.Palette` — the search field and list on their own, for a
 *   palette that lives in the page: `items`, `placeholder`, `emptyMessage`.
 * - `Command.Shortcut` — a key hint, as the rows show it, e.g. in the
 *   trigger.
 *
 * @example {@include ./examples.mdx}
 */
function Command({ open, defaultOpen, onOpenChange, hotkey = 'k', children }: CommandProps) {
  return (
    <DialogState open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {root => (
        <CommandScope {...root} hotkey={hotkey}>
          {children}
        </CommandScope>
      )}
    </DialogState>
  )
}

Command.Trigger = CommandTrigger
Command.Content = CommandContent
Command.Palette = CommandPalette
Command.Shortcut = CommandShortcut

export type { CommandContentProps, CommandGroup, CommandItem, CommandItems, CommandPaletteProps, CommandProps }
export { Command, CommandContent, CommandList, CommandListRoot, CommandPalette, CommandShortcut, CommandTrigger }

export default Command
