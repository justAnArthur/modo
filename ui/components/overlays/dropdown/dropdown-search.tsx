/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/dropdown-search.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useIcon } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useSize } from '../../../lib/size-context'
import { SURFACE_BG } from '../../../lib/surface-classes'
import { useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'

interface SearchHandle {
  input: HTMLInputElement | null
  append: (text: string) => void
  deleteBackward: () => void
}

interface DropdownSearchHostValue {
  register: (handle: SearchHandle) => () => void
  /** Whether the popup is open: it stays mounted through its exit, so the field watches this, not its own mount. */
  open: boolean
  /** Move the hover background to the first enabled row (what Enter picks). */
  highlightFirst: () => void
}

export const DropdownSearchHostContext = createContext<DropdownSearchHostValue | null>(null)

/** The query a filtering panel holds for its `filter` field. */
export interface DropdownFilterContextValue {
  query: string
  setQuery: (query: string) => void
}

export const DropdownFilterContext = createContext<DropdownFilterContextValue | null>(null)

const ROW_SELECTOR = [
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="menuitemradio"]:not([aria-disabled="true"])',
  '[role="menuitemcheckbox"]:not([aria-disabled="true"])',
].join(', ')

function menuRows(from: HTMLElement | null): HTMLElement[] {
  const menu = from?.closest<HTMLElement>('[role="menu"]')
  return menu ? Array.from(menu.querySelectorAll<HTMLElement>(ROW_SELECTOR)) : []
}

interface DropdownSearchHostOptions {
  /** The rows' container: where the first enabled row is looked up. */
  containerRef: RefObject<HTMLElement | null>
  /** The popup's fluid-hover setter, for the first-row highlight. */
  setActiveIndex: (index: number | null) => void
}

/**
 * Hosts a DropdownSearch inside a popup. Returns the context value to
 * provide, a capture-phase keydown handler for the popup element,
 * `hasSearch()` / `searchMounted` for decisions that depend on a field
 * being present, and the first-row highlight the field keeps while it has
 * focus (`isSearchField` / `highlightFirst`, for the popup's focus and
 * mouse-leave handlers).
 */
export function useDropdownSearchHost(open: boolean, { containerRef, setActiveIndex }: DropdownSearchHostOptions) {
  const handleRef = useRef<SearchHandle | null>(null)
  // The popup drops its scroll fade while a field is pinned at the top.
  const [searchMounted, setSearchMounted] = useState(false)

  const register = useCallback((handle: SearchHandle) => {
    handleRef.current = handle
    setSearchMounted(true)
    return () => {
      if (handleRef.current === handle) {
        handleRef.current = null
        setSearchMounted(false)
      }
    }
  }, [])

  // Rows re-index on every filter, so the first one is looked up each time.
  const highlightFirst = useCallback(() => {
    const first = containerRef.current?.querySelector<HTMLElement>(ROW_SELECTOR)
    const index = first?.getAttribute('data-fluid-hover-index')
    setActiveIndex(index != null ? Number(index) : null)
  }, [containerRef, setActiveIndex])

  const isSearchField = useCallback(
    (target: EventTarget | null) => target !== null && target === handleRef.current?.input,
    [],
  )

  const host = useMemo(() => ({ register, open, highlightFirst }), [register, open, highlightFirst])

  // Typing on a focused row goes to the field. Space stays: on a row it activates it.
  const onKeyDownCapture = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    const handle = handleRef.current
    if (!handle?.input) return
    if (e.target === handle.input) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key.length === 1 && e.key !== ' ') {
      e.preventDefault()
      e.stopPropagation()
      handle.input.focus()
      handle.append(e.key)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      e.stopPropagation()
      handle.input.focus()
      handle.deleteBackward()
    }
  }, [])

  const hasSearch = useCallback(() => handleRef.current !== null, [])

  return {
    host,
    hasSearch,
    searchMounted,
    onKeyDownCapture,
    isSearchField,
    highlightFirst,
  }
}

export interface DropdownSearchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'defaultValue'> {
  /** The query. Filter the MenuItems you render against it. Optional under `filter`, where the panel holds the query. */
  value?: string
  /** Called on every keystroke, and with `""` on close (see `clearOnClose`). Optional under `filter`. */
  onValueChange?: (value: string) => void
  /** Let the surrounding panel hold the query and filter its own `Dropdown.Item` rows by `label`, re-indexing the survivors and showing `Dropdown.Empty` when none match. Defaults to `false`. */
  filter?: boolean
  /** Placeholder text. Defaults to `"Search…"`. */
  placeholder?: string
  /** Reset the query to `""` when the popup closes, so the menu reopens unfiltered. Defaults to `true`. */
  clearOnClose?: boolean
  /** Take focus when the popup opens. Defaults to `true`. */
  autoFocus?: boolean
}

/**
 * A search field pinned to the top of a menu popup. Typing keys never reach
 * the menu's typeahead, and typing on a focused row lands in the field. The
 * arrows leave it for the first or last row, Enter picks the first row
 * (which carries the hover background while the field has focus), Escape
 * closes the menu. Controlled by `value`, or by the panel under `filter`.
 */
const DropdownSearch = forwardRef<HTMLInputElement, DropdownSearchProps>(
  (
    {
      value,
      onValueChange,
      filter = false,
      placeholder = 'Search…',
      clearOnClose = true,
      autoFocus = true,
      className,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const SearchIcon = useIcon('search')
    const sizeClasses = useSize()
    const compact = sizeClasses.variant === 'compact'
    const host = useContext(DropdownSearchHostContext)
    const open = host?.open ?? true
    // Under `filter` the panel holds the query; `onValueChange` still hears every keystroke.
    const panel = useContext(DropdownFilterContext)
    const managed = filter ? panel : null
    const query = managed ? managed.query : (value ?? '')
    const setQuery = useCallback(
      (next: string) => {
        managed?.setQuery(next)
        onValueChange?.(next)
      },
      [managed, onValueChange],
    )
    // Painted explicitly: rows scroll under the sticky field, and its parent is
    // often a display:contents group that `bg-inherit` resolves to transparent.
    const surface = useSurface()
    const inputRef = useRef<HTMLInputElement | null>(null)
    const mergedRef = useMergeRefs(inputRef, ref)

    const valueRef = useRef(query)
    valueRef.current = query
    const onValueChangeRef = useRef(setQuery)
    onValueChangeRef.current = setQuery
    const clearOnCloseRef = useRef(clearOnClose)
    clearOnCloseRef.current = clearOnClose

    useEffect(() => {
      if (!host) return
      return host.register({
        get input() {
          return inputRef.current
        },
        append: text => onValueChangeRef.current(valueRef.current + text),
        deleteBackward: () => onValueChangeRef.current(valueRef.current.slice(0, -1)),
      })
    }, [host])

    // Two frames: the popup's own open focus lands a frame after mount, and the field takes over after it.
    useEffect(() => {
      if (!open) return
      if (clearOnCloseRef.current && valueRef.current !== '') {
        onValueChangeRef.current('')
      }
      if (!autoFocus) return
      let inner: number | undefined
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => inputRef.current?.focus())
      })
      return () => {
        cancelAnimationFrame(outer)
        if (inner !== undefined) cancelAnimationFrame(inner)
      }
    }, [open, autoFocus])

    // The query moved under a focused field: the first row is what Enter picks now.
    useEffect(() => {
      if (!host || document.activeElement !== inputRef.current) return
      host.highlightFirst()
    }, [host, query])

    useEffect(
      () => () => {
        if (clearOnCloseRef.current && valueRef.current !== '') {
          onValueChangeRef.current('')
        }
      },
      [],
    )

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return
      // Escape and Tab belong to the menu; the rest must not reach its typeahead.
      if (e.key === 'Escape' || e.key === 'Tab') return
      e.stopPropagation()
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const rows = menuRows(e.currentTarget)
        if (rows.length === 0) return
        e.preventDefault()
        ;(e.key === 'ArrowDown' ? rows[0] : rows[rows.length - 1])?.focus()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        menuRows(e.currentTarget)[0]?.click()
      }
    }

    return (
      <div
        // Bleeds into the popup's padding so the divider runs edge to edge.
        className={cn(
          'group/search sticky top-0 z-20 -mx-1 -mt-1 mb-0.5 flex shrink-0 items-center border-b border-border/60',
          SURFACE_BG[surface],
          sizeClasses.control,
          sizeClasses.gap,
          compact ? 'px-2.5' : 'px-3',
          className,
        )}
      >
        <SearchIcon
          size={sizeClasses.icon}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground transition-[color,stroke-width] duration-fast group-focus-within/search:text-foreground group-focus-within/search:stroke-[2]"
        />
        {/* biome-ignore lint/a11y/useSemanticElements: type="search" brings the platform's own clear button. */}
        <input
          ref={mergedRef}
          type="text"
          role="searchbox"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          // rounded-none: a focus-visible radius would clip the caret at the corners.
          className={cn(
            'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
            sizeClasses.text,
            // Safari runs the caret the line box's height.
            compact ? 'leading-5' : 'leading-6',
          )}
          {...props}
        />
      </div>
    )
  },
)

DropdownSearch.displayName = 'DropdownSearch'

/** The "no results" row a filtered menu shows instead of its rows. */
const DropdownEmpty = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const sizeClasses = useSize()
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn('px-2 py-6 text-center text-muted-foreground', sizeClasses.text, className)}
      {...props}
    />
  )
})

DropdownEmpty.displayName = 'DropdownEmpty'

export { DropdownEmpty, DropdownSearch }
