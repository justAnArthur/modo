/*!
 * Local addition: the open island's icon tabs, split across the two wings
 * around the notch. Rebuilt from Just Notch's runtime (`island/tabs.tsx`) on
 * modo-ui's fluid hover, liquid indicator and focus ring.
 */

'use client'

import { FocusRing } from '@justanarthur/modo-ui/lib/focus-ring'
import { GooIndicator } from '@justanarthur/modo-ui/lib/goo-indicator'
import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import { useRowFocus } from '@justanarthur/modo-ui/lib/row-group'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { type SizeVariant, useSize } from '@justanarthur/modo-ui/lib/size-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '@justanarthur/modo-ui/lib/use-fluid-hover'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { FluidHoverHighlight } from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { DEFAULT_NOTCH, stripLayout } from '../../../lib/geometry'
import { useIsland } from '../../../lib/island-context'

interface IslandTab {
  /** What selecting it reports. */
  value: string
  /** Its name: the tab's accessible name, and the title a consumer shows for it. */
  label: string
  /** Its glyph. */
  icon: IconComponent
}

interface IslandTabsProps {
  /** The tabs, in order: they fill the left wing, then the right one. */
  tabs: IslandTab[]
  /** The selected tab's value (controlled). */
  value?: string
  /** The tab selected at first (uncontrolled). Defaults to the first tab. */
  defaultValue?: string
  /** Called with the value of the tab a press or an arrow key selects. */
  onValueChange?: (value: string) => void
  /** Called with the value of the tab under the pointer, or `null`, so a title can preview it. */
  onHoverChange?: (value: string | null) => void
  /** Step on the size ladder. Defaults to the surrounding SizeProvider, else `'default'`. */
  size?: SizeVariant
  /** The notch the strip leaves free, centered. Defaults to the enclosing Island's, else `185`. */
  notchWidth?: number
  /** Content at the far right of the right wing, such as a settings button; the tabs keep clear of it. */
  trailing?: ReactNode
  /** The tab list's accessible name. Defaults to `'Widgets'`. */
  label?: string
  /** Classes for the root, which spans its container's width. */
  className?: string
}

// Literal tables: UnoCSS only generates the classes it can read whole.
const TAB_WIDTH: Record<SizeVariant, number> = { default: 40, compact: 30 }
const TAB_CLASS: Record<SizeVariant, string> = { default: 'w-10', compact: 'w-7.5' }
const FADE = 16
const NOTCH_FADE = 8

interface TabButtonProps {
  tab: IslandTab
  index: number
  selected: boolean
  lit: boolean
  size: SizeVariant
  register: (index: number, element: HTMLElement | null) => void
  onSelect: (index: number) => void
}

function TabButton({ tab, index, selected, lit, size: sizeProp, register, onSelect }: TabButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const size = useSize(sizeProp)
  const shape = useShape()
  useRegisterFluidHoverItem(register, index, ref)
  const Icon = tab.icon
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={tab.label}
      tabIndex={selected ? 0 : -1}
      data-fluid-hover-index={index}
      className={cn(
        'relative z-10 flex shrink-0 cursor-pointer items-center justify-center bg-transparent outline-none transition-[color] duration-fast',
        size.control,
        TAB_CLASS[size.variant],
        shape.bg,
        lit ? 'text-foreground' : 'text-muted-foreground',
      )}
      onClick={() => onSelect(index)}
    >
      <Icon size={size.icon} strokeWidth={lit ? 2 : 1.5} className="transition-[stroke-width] duration-fast" />
    </button>
  )
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.offsetWidth)
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * The open island's icon tabs, in both wings around the notch: the left
 * wing's, a gap the width of the notch, then the right wing's.
 *
 * The tabs fill the left wing first and balance into the right one, keeping
 * clear of the `trailing` content at its far end. The selected tab's pill is
 * modo-ui's liquid indicator: it melts from tab to tab, across the notch too;
 * a fluid hover highlight lights the tab under the pointer and the keyboard
 * gets a focus ring that springs between tabs. Past what both wings hold the
 * strip scrolls behind the notch, which hides the tabs passing under it; its
 * outer edges fade with `scroll-fade-x` and a vertical wheel scrolls it
 * sideways.
 *
 * The strip shows icons only. Show the selected tab's title yourself, or the
 * hovered one's as a preview through `onHoverChange`. Arrow keys, Home and End
 * move the selection. Inside an Island it reads the notch's width from it.
 *
 * @example {@include ./examples.mdx}
 */
export default function IslandTabs({
  tabs,
  value: valueProp,
  defaultValue,
  onValueChange,
  onHoverChange,
  size: sizeProp,
  notchWidth,
  trailing,
  label = 'Widgets',
  className,
}: IslandTabsProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? tabs[0]?.value, onValueChange)
  const size = useSize(sizeProp)
  const shape = useShape()
  const island = useIsland()
  const notch = notchWidth ?? island?.geometry.notch.width ?? DEFAULT_NOTCH.width

  const root = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const width = useWidth(root)
  const reserve = useWidth(end)
  const hover = useFluidHover(strip, { axis: 'x' })
  const focus = useRowFocus(hover)

  const selected = Math.max(
    0,
    tabs.findIndex(tab => tab.value === value),
  )
  const layout = stripLayout(tabs.length, width, notch, TAB_WIDTH[size.variant], reserve)
  const hovered = hover.activeIndex === null ? null : (tabs[hover.activeIndex]?.value ?? null)

  const report = useRef(onHoverChange)
  report.current = onHoverChange
  useEffect(() => report.current?.(hovered), [hovered])

  // Scrolls only the strip (scrollIntoView would scroll the page too), and moves keyboard focus along.
  useEffect(() => {
    const el = viewport.current
    const active = el?.querySelector<HTMLElement>('[role=tab][aria-selected=true]')
    if (!el || !active) return
    if (el.contains(document.activeElement) && document.activeElement !== active) active.focus({ preventScroll: true })
    const left = active.offsetLeft - el.scrollLeft
    const right = left + active.offsetWidth - el.clientWidth
    if (left < 0) el.scrollBy({ left: left - FADE })
    else if (right > 0) el.scrollBy({ left: right + FADE })
  }, [selected])

  useEffect(() => {
    const el = viewport.current
    if (!el || !layout.overflow) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [layout.overflow])

  const select = (index: number) => {
    const tab = tabs[index]
    if (tab) setValue(tab.value)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const next =
      event.key === 'ArrowRight'
        ? selected + 1
        : event.key === 'ArrowLeft'
          ? selected - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : null
    if (next === null || !tabs[next]) return
    event.preventDefault()
    select(next)
  }

  // The notch cut out of the strip while it scrolls behind it: a mask's alpha, not a color.
  const hole: CSSProperties | undefined = layout.overflow
    ? {
        maskImage: `linear-gradient(to right, black ${layout.hole.start - NOTCH_FADE}px, transparent ${layout.hole.start}px, transparent ${layout.hole.end}px, black ${layout.hole.end + NOTCH_FADE}px)`,
      }
    : undefined

  const rect = hover.isMeasured ? hover.itemRects[selected] : undefined
  const button = (tab: IslandTab, index: number) => (
    <TabButton
      key={tab.value}
      tab={tab}
      index={index}
      selected={index === selected}
      lit={index === selected || index === hover.activeIndex}
      size={size.variant}
      register={hover.registerItem}
      onSelect={select}
    />
  )

  return (
    <div ref={root} className={cn('relative flex w-full min-w-0 items-center', size.control, className)}>
      <div className="relative h-full min-w-0 flex-1" style={hole}>
        <div
          ref={viewport}
          className={cn(
            'h-full overflow-x-auto overflow-y-hidden scrollbar-hide',
            layout.overflow && 'scroll-fade-x [--scroll-fade-size:16px]',
          )}
        >
          <div
            ref={strip}
            role="tablist"
            aria-label={label}
            className="relative flex h-full w-max min-w-full items-center"
            onKeyDown={onKeyDown}
            onMouseMove={hover.handlers.onMouseMove}
            onMouseEnter={hover.handlers.onMouseEnter}
            onMouseLeave={hover.handlers.onMouseLeave}
            onFocus={focus.handlers.onFocus}
            onBlur={focus.handlers.onBlur}
          >
            {rect && <GooIndicator rect={rect} className={cn('bg-active', shape.bg)} />}
            <FluidHoverHighlight hover={hover} hidden={hover.activeIndex === selected} className={shape.bg} />
            <FocusRing rect={focus.focusRect} />
            {tabs.slice(0, layout.before).map(button)}
            <div aria-hidden className="h-full shrink-0 grow" style={{ minWidth: layout.spacer }} />
            {tabs.slice(layout.before).map((tab, i) => button(tab, layout.before + i))}
          </div>
        </div>
      </div>
      {trailing && (
        <div ref={end} className="flex shrink-0 items-center">
          {trailing}
        </div>
      )}
    </div>
  )
}

export type { IslandTab, IslandTabsProps }
export { IslandTabs }
