/*
 * Local addition (not part of Fluid Functionalism): the frame of a desktop
 * app's window (Tauri, Electron): a title bar that drags the window, then a
 * Sidebar, the main card and a side pane split off it on Resizable.
 */

'use client'

import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Button from '../../components/actions/button'
import Sidebar from '../../components/navigation/sidebar'
import { useSidebarShortcut } from '../../components/navigation/sidebar/sidebar-shortcut'
import Tooltip from '../../components/overlays/tooltip'
import { useIcon } from '../../lib/icon-context'
import { inertProps } from '../../lib/inert'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useLift } from '../../lib/surface-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { cn } from '../../lib/utils'
import Resizable from '../../primitives/layout/resizable'
import { SizeProvider } from '../../primitives/systems/sizes'

type DesktopPlatform = 'mac' | 'windows' | 'linux'

/** Where the title and controls live: one bar across the window, or the main card's own header. */
type DesktopTitleBar = 'window' | 'card'

// Literal tables: UnoCSS only generates the classes it can read whole.
// The sidebar's content clears the corner controls by one control height.
const CORNER_CLEARANCE: Record<SizeVariant, string> = {
  default: '[&>[data-slot=sidebar]_[data-sidebar=sidebar]]:pt-9',
  compact: '[&>[data-slot=sidebar]_[data-sidebar=sidebar]]:pt-7',
}

// The corner's width past the card's 8px inset: the traffic lights' 72px (on mac) and the 28px toggle.
const CORNER_ROOM: Record<DesktopPlatform, string> = {
  mac: 'w-23 shrink-0',
  windows: 'w-6 shrink-0',
  linux: 'w-6 shrink-0',
}

// Below this window width the side pane takes the main card's place.
const NARROW = 768

interface DesktopShellProps {
  /** The OS the window runs on: on `mac` the title bar starts after the traffic lights. Defaults to `'mac'`. */
  platform?: DesktopPlatform
  /** Draws stand-ins for the window controls, for a preview in the browser; a native window draws its own. Defaults to `false`. */
  showControls?: boolean
  /** `'window'` draws one bar across the window. `'card'` drops it: the window controls and the sidebar toggle sit in the sidebar's top corner, and the title, your controls and the side pane toggle head the main card. Defaults to `'window'`. */
  titleBar?: DesktopTitleBar
  /** Pins the title bar to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** The title bar's middle: the window's title, truncated to fit. */
  title?: ReactNode
  /** Controls after the sidebar toggle, at the title bar's start. */
  leading?: ReactNode
  /** Controls before the side pane toggle, at the title bar's end. */
  trailing?: ReactNode
  /** The left sidebar: a `Sidebar` (variant `inset`), with its header, content and footer. */
  left?: ReactNode
  /** The side pane's content, split off the main card's right. */
  right?: ReactNode
  /** The main card's content. */
  main?: ReactNode
  /** Controlled open state of the left sidebar. */
  leftOpen?: boolean
  /** The left sidebar's open state at first. Defaults to `true`. */
  defaultLeftOpen?: boolean
  /** Called when the left sidebar opens or folds. */
  onLeftOpenChange?: (open: boolean) => void
  /** Controlled open state of the side pane. */
  rightOpen?: boolean
  /** The side pane's open state at first. Defaults to `true`. */
  defaultRightOpen?: boolean
  /** Called when the side pane opens or folds, from its toggle, `]` or a drag past its minimum. */
  onRightOpenChange?: (open: boolean) => void
  /** The side pane's share of the space beside the left sidebar, in percent; a double-click on its handle comes back to it. Defaults to `35`. */
  defaultPaneSize?: number
  /** The side pane's smallest share, in percent; dragged below half of it, the pane folds. Defaults to `20`. */
  minPaneSize?: number
  /** The side pane's largest share, in percent. Defaults to `60`. */
  maxPaneSize?: number
  /** The left sidebar toggle's label. Defaults to `'Sidebar'`. */
  leftLabel?: string
  /** The side pane toggle's and its handle's label. Defaults to `'Side pane'`. */
  rightLabel?: string
  /** Classes for the window. */
  className?: string
}

function Toggle({
  label,
  open,
  onClick,
  side,
}: {
  label: string
  open: boolean
  onClick: () => void
  side: 'left' | 'right'
}) {
  const Icon = useIcon(side === 'left' ? 'panel-left' : 'panel-right')
  return (
    <Tooltip content={label} side="bottom">
      <Button
        variant="ghost"
        size="icon-compact"
        aria-label={label}
        aria-pressed={open}
        active={open}
        onClick={onClick}
      >
        <Icon />
      </Button>
    </Tooltip>
  )
}

function TrafficLights() {
  return (
    <span aria-hidden="true" className="flex items-center gap-2 pl-3">
      <span className="size-3 rounded-full bg-status-error" />
      <span className="size-3 rounded-full bg-status-warning" />
      <span className="size-3 rounded-full bg-status-success" />
    </span>
  )
}

function WindowControls() {
  const Minimize = useIcon('minus')
  const Maximize = useIcon('square')
  const Close = useIcon('x')
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Button variant="ghost" size="icon-compact" aria-label="Minimize">
        <Minimize />
      </Button>
      <Button variant="ghost" size="icon-compact" aria-label="Maximize">
        <Maximize />
      </Button>
      <Button variant="ghost" size="icon-compact" aria-label="Close">
        <Close />
      </Button>
    </span>
  )
}

/** The main region: an inset card two surface levels up, like Sidebar.Inset. */
function MainCard({ children }: { children: ReactNode }) {
  const level = useLift(2)
  const shape = useShape()
  return (
    <SurfaceProvider value={level}>
      <main
        className={cn(
          'relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          SURFACE_BG[level],
          SURFACE_SHADOW[2],
          shape.bgRadius >= 20 ? 'rounded-3xl' : 'rounded-xl',
        )}
      >
        {children}
      </main>
    </SurfaceProvider>
  )
}

/**
 * The frame of a desktop app's window: a title bar over a sidebar, the
 * main card and a side pane.
 *
 * The title bar drags the window (it carries `data-tauri-drag-region`; its
 * buttons don't) and sits on one step of the size ladder. On macOS it starts
 * after the traffic lights; Windows and Linux start at the edge. It holds the
 * sidebar toggle, your `leading` controls, the `title`, your `trailing`
 * controls and the side pane toggle.
 *
 * With `titleBar="card"` there is no bar across the window: the window
 * controls and the sidebar toggle sit in the sidebar's top corner (the
 * sidebar's content starts below them), and the title, `trailing` and the
 * side pane toggle head the main card, which drags the window too. With the
 * sidebar folded, the corner controls stay put and the card's header makes
 * room for them.
 *
 * Under it, the main content is an inset card. The left Sidebar is yours
 * (`left`): it resizes from its rail and folds from its toggle, its rail or
 * `[`. The side pane (`right`) splits off the card on Resizable: drag the
 * gutter between them, or focus it and use the arrows; a double-click puts
 * it back to `defaultPaneSize`, and a drag below half its minimum folds it,
 * as do its toggle and `]`. The card keeps an even 8px gutter to the window
 * edge and to whatever is folded. On a window narrower than 768px the side
 * pane takes the card's place instead of squeezing it. Both open states are
 * controllable (`leftOpen`, `rightOpen`) or start from `default*`.
 *
 * @example {@include ./examples.mdx}
 */
export default function DesktopShell({
  platform = 'mac',
  showControls = false,
  titleBar = 'window',
  size: sizeProp,
  title,
  leading,
  trailing,
  left,
  right,
  main,
  leftOpen: leftOpenProp,
  defaultLeftOpen = true,
  onLeftOpenChange,
  rightOpen: rightOpenProp,
  defaultRightOpen = true,
  onRightOpenChange,
  defaultPaneSize = 35,
  minPaneSize = 20,
  maxPaneSize = 60,
  leftLabel = 'Sidebar',
  rightLabel = 'Side pane',
  className,
}: DesktopShellProps) {
  const size = useSize(sizeProp)
  const [leftOpen, setLeftOpen] = useControllableState(leftOpenProp, defaultLeftOpen, onLeftOpenChange)
  const [rightOpen, setRightOpen] = useControllableState(rightOpenProp, defaultRightOpen, onRightOpenChange)
  const [paneSize, setPaneSize] = useState(defaultPaneSize)
  const hasLeft = left !== undefined
  const hasRight = right !== undefined
  const paneOpen = hasRight && rightOpen
  const inCard = titleBar === 'card'
  const paneSizes = useMemo(() => (paneOpen ? [100 - paneSize, paneSize] : [100, 0]), [paneOpen, paneSize])

  // The window's own width, not the viewport's: a framed or resized window doesn't follow the viewport.
  const root = useRef<HTMLDivElement | null>(null)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setNarrow((entry?.contentRect.width ?? 0) < NARROW))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const toggleRight = useCallback(() => setRightOpen(open => !open), [setRightOpen])
  useSidebarShortcut(root, hasRight ? ']' : null, 'nearest', toggleRight)

  const onSizesChange = (sizes: number[]) => {
    const pane = sizes[1] ?? 0
    if (pane === 0) return setRightOpen(false)
    setPaneSize(pane)
    setRightOpen(true)
  }

  const corner = (
    <>
      {platform === 'mac' && (
        <div data-tauri-drag-region className="flex h-full w-18 shrink-0 items-center">
          {showControls && <TrafficLights />}
        </div>
      )}
      {hasLeft && <Toggle side="left" label={leftLabel} open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />}
      {leading}
    </>
  )
  const rest = (
    <>
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center gap-2 px-1">
        {title}
      </div>
      {trailing}
      {hasRight && <Toggle side="right" label={rightLabel} open={rightOpen} onClick={toggleRight} />}
      {showControls && platform !== 'mac' && <WindowControls />}
    </>
  )
  const bar = cn('flex shrink-0 select-none items-center gap-1 pr-1.5', size.control, platform !== 'mac' && 'pl-1.5')

  const card = (content: ReactNode) => (
    <MainCard>
      {inCard && (
        <SizeProvider size={size.variant}>
          <header data-tauri-drag-region className={cn(bar, 'pl-1.5')}>
            {/* Room for the corner controls, which stay put when the sidebar folds. */}
            {!(hasLeft && leftOpen) && <div data-tauri-drag-region className={CORNER_ROOM[platform]} />}
            {rest}
          </header>
        </SizeProvider>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{content}</div>
    </MainCard>
  )

  return (
    <div ref={root} className={cn('relative flex h-full w-full flex-col bg-background', className)}>
      <SizeProvider size={size.variant}>
        {inCard ? (
          <div data-tauri-drag-region className={cn(bar, 'absolute top-0 left-0 z-20')}>
            {corner}
          </div>
        ) : (
          <header data-tauri-drag-region className={bar}>
            {corner}
            {rest}
          </header>
        )}
      </SizeProvider>
      {/* Sidebar defaults to the viewport's height; under the title bar it takes the body's. */}
      <Sidebar.Provider
        className={cn('min-h-0 flex-1 [&>[data-slot=sidebar]]:h-full', inCard && CORNER_CLEARANCE[size.variant])}
        persist={false}
        mobileBreakpoint={0}
        shortcut={hasLeft ? undefined : null}
        open={leftOpen}
        onOpenChange={setLeftOpen}
      >
        {left}
        {/* Flush with an open sidebar (its rows bring their own gutter), 8px from the window edge once it folds. */}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 py-2 pl-2 transition-[padding] duration-fast',
            hasLeft && leftOpen && 'pl-0',
            (!hasRight || narrow) && 'pr-2',
          )}
        >
          {!hasRight || narrow ? (
            card(narrow && paneOpen ? right : main)
          ) : (
            <Resizable sizes={paneSizes} onSizesChange={onSizesChange}>
              <Resizable.Panel defaultSize={100 - defaultPaneSize} minSize={100 - maxPaneSize}>
                {card(main)}
              </Resizable.Panel>
              {/* The handle is the 8px gutter between the card and the pane, and the card's right edge once it folds. */}
              <Resizable.Handle
                label={rightLabel}
                className={cn(
                  'w-2 transition-opacity duration-fast',
                  !paneOpen && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
                )}
              />
              <Resizable.Panel defaultSize={defaultPaneSize} minSize={minPaneSize} maxSize={maxPaneSize} collapsible>
                <div {...inertProps(!paneOpen)} className="flex h-full min-w-0 flex-col">
                  {right}
                </div>
              </Resizable.Panel>
            </Resizable>
          )}
        </div>
      </Sidebar.Provider>
    </div>
  )
}

export type { DesktopPlatform, DesktopShellProps, DesktopTitleBar }
export { DesktopShell }
