/*
 * Local addition (not part of Fluid Functionalism): a search that grows out
 * of its own button. The idea is beUI's morphing search
 * (github.com/starc007/ui-components `components/motion/morphing-search.tsx`
 * @ de52f337e520e7ee37749b36eb1c32df86137bcb — MIT © 2026 Saurabh Chauhan,
 * notice: LICENSE.beui); none of its code is ported. Where beUI flies a
 * shared layout box into a fixed overlay, the field here springs its own
 * width in place, over its neighbors, from the box the button keeps in the
 * layout. The suggestions are Base UI's Autocomplete popup with Command's
 * rows, oozing out of the field through the shared morph (`lib/use-morph.ts`,
 * goo by default).
 */

import { Autocomplete } from '@base-ui/react/autocomplete'
import { motion, useReducedMotionConfig } from 'motion/react'
import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useIcon } from '../../lib/icon-context'
import { MorphSurface } from '../../lib/morph-layers'
import { shapeMap, useShape } from '../../lib/shape-context'
import { useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { type MorphOrigin, useMorph } from '../../lib/use-morph'
import { cn } from '../../lib/utils'
import { type CommandItem, CommandList, CommandListRoot, CommandShortcut } from '../command'

// The icon sits where the square button centers it, in both states and both
// variants, so it stays put while the field grows around it.
const INSET = { default: 'pl-2.5', compact: 'pl-[7px]' }
const SQUARE = { default: 'w-9', compact: 'w-7' }
const PILL = { default: 'min-w-[160px]', compact: 'min-w-[128px]' }

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null)

interface SearchProps {
  /** How it rests: a pill showing the placeholder (and the shortcut), or a lone search icon. Defaults to `'pill'`. */
  variant?: 'pill' | 'icon'
  /** The field's placeholder, the pill's label and the accessible name of both. Defaults to `'Search'`. */
  placeholder?: string
  /** Suggestions offered below the field and filtered as you type: strings, or Command items (`{ label, icon, keywords }`). Leave out for a plain search field. */
  items?: (string | CommandItem)[]
  /** Controlled query. */
  value?: string
  /** Initial query, for an uncontrolled field. Defaults to `''`. */
  defaultValue?: string
  /** Called on every change of the query. */
  onValueChange?: (value: string) => void
  /** Called with the query on Enter, and with a suggestion's label when one is picked. */
  onSubmit?: (query: string) => void
  /** Controlled expanded state. */
  expanded?: boolean
  /** Initial expanded state, for an uncontrolled field. Defaults to `false`. */
  defaultExpanded?: boolean
  /** Called when the field expands or collapses. */
  onExpandedChange?: (expanded: boolean) => void
  /** Width of the expanded field, in px. Defaults to `288`. */
  width?: number
  /** The edge that stays put: the field grows from it toward the other one, over its neighbors. Defaults to `'start'`. */
  align?: 'start' | 'end'
  /** A key that expands the field from anywhere on the page outside another field, shown on the pill. */
  shortcut?: string
  /** Shown in the suggestions when none matches. Defaults to `'No results found.'`. */
  emptyMessage?: string
  /** How the suggestions grow out of the field (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Spring tier of the suggestions' morph. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
  /** Classes for the root, the box the resting button keeps in the layout. */
  className?: string
}

/**
 * A search button that grows into the field in place, with suggestions that
 * ooze out below it.
 *
 * At rest it is a pill showing the placeholder, or a lone search icon. A
 * press (or its `shortcut` key) springs it to `width` and focuses the
 * field. It grows over its neighbors rather than pushing them: the resting
 * box stays in the layout, so nothing around it moves, and `align="end"`
 * grows it leftward, for a toolbar's far end. The search icon never moves.
 * Typing opens the suggestions, which melt out of the field through the
 * goo neck (see Morph) once it has finished growing; the arrows move one
 * fluid highlight through them, and Enter or a press picks one. Escape
 * closes the suggestions, then clears the query, then collapses the field
 * and hands focus back to the button; leaving an empty field collapses it
 * too. The field lifts 2 surface levels while open, the same level as its
 * suggestions, so the two read as one liquid.
 *
 * With `items` the field is a combobox over a listbox of suggestions,
 * built on Base UI's Autocomplete (filtering by label and keywords, the
 * input keeps focus while the highlight moves); without, it is a plain
 * search box. Either way it sits in a `<search>` landmark around a form,
 * and Enter reports the query to `onSubmit`.
 *
 * @example {@include ./examples.mdx}
 */
function Search({
  variant = 'pill',
  placeholder = 'Search',
  items,
  value,
  defaultValue = '',
  onValueChange,
  onSubmit,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  width = 288,
  align = 'start',
  shortcut,
  emptyMessage = 'No results found.',
  effect,
  tier = 'moderate',
  className,
}: SearchProps) {
  const [query, setQuery] = useControllableState(value, defaultValue, onValueChange)
  const [isExpanded, setExpanded] = useControllableState(expanded, defaultExpanded, onExpandedChange)
  const [suggesting, setSuggesting] = useState(false)
  // The state the field last finished springing to: the suggestions wait for
  // it, so the goo neck grows from the field's final box.
  const [settled, setSettled] = useState(isExpanded)
  const [rest, setRest] = useState(0)
  const reduced = useReducedMotionConfig()
  const shape = useShape()
  const size = useSize()
  const level = Math.min(useSurface() + 2, 8)
  const SearchIcon = useIcon('search')
  const XIcon = useIcon('x')
  const button = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const origin = useRef<MorphOrigin>({})
  const suggestions = useMemo(() => items?.map(item => (typeof item === 'string' ? { label: item } : item)), [items])
  const open = suggesting && isExpanded && settled
  // Lifted from the moment it starts growing until it has shrunk back, so
  // its neighbors never show through and its contents stay on top.
  const lifted = isExpanded || settled
  const morph = useMorph(open, origin, { from: field, effect, tier })

  // The field springs from and back to the button's own width.
  useLayoutEffect(() => {
    const el = button.current
    if (!el) return
    const observer = new ResizeObserver(() => setRest(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Both commit synchronously so focus moves straight between the button and
  // the field: a focused button that hides would blur to nothing, which reads
  // as leaving the field.
  const expand = () => {
    flushSync(() => setExpanded(true))
    // No scroll: the field's box is still narrower than its contents.
    input.current?.focus({ preventScroll: true })
  }

  const collapse = (refocus: boolean) => {
    flushSync(() => {
      setQuery('')
      setSuggesting(false)
      setExpanded(false)
    })
    if (refocus) button.current?.focus()
  }

  useEffect(() => {
    if (!shortcut || isExpanded) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== shortcut || event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditable(event.target)) return
      event.preventDefault()
      expand()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcut, isExpanded])

  // Base UI's own Escape closes open suggestions; the next ones clear, then collapse.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape' || open) return
    event.stopPropagation()
    if (query) setQuery('')
    else collapse(true)
  }

  const inputProps = {
    ref: input,
    placeholder,
    'aria-label': placeholder,
    onKeyDown,
    className: cn(
      'h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden',
      size.text,
    ),
  }

  const root = (
    <search
      onBlur={event => {
        if (!isExpanded || query || event.currentTarget.contains(event.relatedTarget as Node | null)) return
        collapse(false)
      }}
      className={cn('group/search relative inline-flex shrink-0 align-middle', className)}
    >
      <form
        className="contents"
        onSubmit={event => {
          event.preventDefault()
          onSubmit?.(query)
        }}
      >
        <button
          ref={button}
          type="button"
          aria-label={placeholder}
          onClick={expand}
          className={cn(
            'relative z-[1] flex items-center outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
            size.control,
            size.gap,
            size.text,
            shape.input,
            variant === 'icon'
              ? cn('cursor-pointer justify-center', SQUARE[size.variant])
              : cn('cursor-text pr-2.5', INSET[size.variant], PILL[size.variant]),
            isExpanded && 'invisible',
          )}
        >
          <SearchIcon
            size={size.icon}
            strokeWidth={1.5}
            className="shrink-0 text-muted-foreground transition-colors duration-fast group-hover/search:text-foreground"
          />
          {variant === 'pill' && <span className="text-muted-foreground">{placeholder}</span>}
          {variant === 'pill' && shortcut && <CommandShortcut className="pl-4">{shortcut}</CommandShortcut>}
        </button>
        {rest > 0 && (
          <motion.div
            ref={field}
            className={cn(
              'absolute top-0 h-full overflow-hidden ring-1 transition-[box-shadow] duration-moderate',
              align === 'end' ? 'right-0' : 'left-0',
              shape.input,
              lifted
                ? cn('z-10 ring-transparent', SURFACE_BG[level], SURFACE_SHADOW[3])
                : 'ring-border group-hover/search:bg-muted/50',
            )}
            initial={false}
            animate={{ width: isExpanded ? width : rest }}
            transition={reduced ? { duration: 0 } : isExpanded ? spring.slow : spring.slow.exit}
            onAnimationComplete={() => setSettled(isExpanded)}
          >
            {lifted && (
              // A fixed width (structural): the field's contents keep their
              // place while the box grows over them, and while it shrinks back
              // over the button's identical icon and placeholder.
              <div className={cn('flex h-full items-center pr-1.5', size.gap, INSET[size.variant])} style={{ width }}>
                <SearchIcon size={size.icon} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                {suggestions ? (
                  <Autocomplete.Input {...inputProps} />
                ) : (
                  <input {...inputProps} type="search" value={query} onChange={event => setQuery(event.target.value)} />
                )}
                {query && (
                  <button
                    type="button"
                    aria-label="Clear"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      setQuery('')
                      input.current?.focus()
                    }}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color] duration-fast hover:bg-hover hover:text-foreground active:bg-active focus-visible:ring-1 focus-visible:ring-focus-ring"
                  >
                    <XIcon size={size.icon - 2} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </form>
    </search>
  )

  if (!suggestions) return root

  return (
    <CommandListRoot
      items={suggestions}
      value={query}
      onValueChange={next => setQuery(next)}
      open={open}
      onOpenChange={setSuggesting}
    >
      {root}
      <Autocomplete.Portal>
        <Autocomplete.Positioner
          anchor={field}
          side="bottom"
          align={align}
          sideOffset={8}
          className="z-50 outline-none"
        >
          <Autocomplete.Popup ref={morph.popupRef} className="relative outline-none">
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shapeMap.rounded.container}
                className="flex max-h-[min(300px,var(--available-height))] w-[var(--anchor-width)] flex-col overflow-hidden"
              >
                <CommandList emptyMessage={emptyMessage} onPick={item => onSubmit?.(item.label)} />
              </MorphSurface>
            </SurfaceProvider>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </CommandListRoot>
  )
}

export type { SearchProps }
export { Search }

export default Search
