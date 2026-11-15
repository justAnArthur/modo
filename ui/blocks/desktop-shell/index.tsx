/*!
 * Local addition (not part of Fluid Functionalism): the frame of a desktop
 * app's window (Tauri, Electron): a title bar that drags the window, then a
 * sidebar, the main card and a side pane on two Sidebar providers.
 */

'use client'

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import Button from '../../components/button'
import Sidebar from '../../components/navigation/sidebar'
import Tooltip from '../../components/overlays/tooltip'
import { useIcon } from '../../lib/icon-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { cn } from '../../lib/utils'
import { SizeProvider } from '../../primitives/sizes'

type DesktopPlatform = 'mac' | 'windows' | 'linux'

// Below this window width the side pane takes the main card's place.
const NARROW = 768

interface DesktopShellProps {
  /** The OS the window runs on: on `mac` the title bar starts after the traffic lights. Defaults to `'mac'`. */
  platform?: DesktopPlatform
  /** Draws stand-ins for the window controls, for a preview in the browser; a native window draws its own. Defaults to `false`. */
  showControls?: boolean
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
  /** The side pane's content; the shell puts it in a right inset Sidebar. */
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
  /** Called when the side pane opens or folds. */
  onRightOpenChange?: (open: boolean) => void
  /** The side pane's width. Defaults to `'380px'`. */
  rightWidth?: string
  /** The left sidebar toggle's label. Defaults to `'Sidebar'`. */
  leftLabel?: string
  /** The side pane toggle's label. Defaults to `'Side pane'`. */
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
 * Under it, the main content is an inset card between two Sidebars: the left
 * one is yours (`left`), the right one holds the side pane (`right`). Each
 * resizes from its rail and folds from its toggle, its rail, or `[` and `]`,
 * and the card keeps an even gutter to whichever is open, 8px from the window
 * edge once one folds. On a window narrower than 768px the side pane takes
 * the card's place instead of squeezing it. Both open states are
 * controllable (`leftOpen`, `rightOpen`) or start from `default*`.
 *
 * @example {@include ./examples.mdx}
 */
export default function DesktopShell({
  platform = 'mac',
  showControls = false,
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
  rightWidth = '380px',
  leftLabel = 'Sidebar',
  rightLabel = 'Side pane',
  className,
}: DesktopShellProps) {
  const size = useSize(sizeProp)
  const [leftOpen, setLeftOpen] = useControllableState(leftOpenProp, defaultLeftOpen, onLeftOpenChange)
  const [rightOpen, setRightOpen] = useControllableState(rightOpenProp, defaultRightOpen, onRightOpenChange)
  const hasLeft = left !== undefined
  const hasRight = right !== undefined
  // The window's own width, not the viewport's: the Sidebar's mobile switch
  // reads the viewport, which a framed or resized window doesn't follow.
  const root = useRef<HTMLDivElement | null>(null)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setNarrow((entry?.contentRect.width ?? 0) < NARROW))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const paneOpen = hasRight && rightOpen

  return (
    <div ref={root} className={cn('@container flex h-full w-full flex-col bg-background', className)}>
      <SizeProvider size={size.variant}>
        <header
          data-tauri-drag-region
          className={cn(
            'flex shrink-0 select-none items-center gap-1 pr-1.5',
            size.control,
            platform !== 'mac' && 'pl-1.5',
          )}
        >
          {platform === 'mac' && (
            <div data-tauri-drag-region className="flex h-full w-18 shrink-0 items-center">
              {showControls && <TrafficLights />}
            </div>
          )}
          {hasLeft && <Toggle side="left" label={leftLabel} open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />}
          {leading}
          <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center gap-2 px-1">
            {title}
          </div>
          {trailing}
          {hasRight && (
            <Toggle side="right" label={rightLabel} open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
          )}
          {showControls && platform !== 'mac' && <WindowControls />}
        </header>
      </SizeProvider>
      {/* Sidebar defaults to the viewport's height; under the title bar both columns take the body's. */}
      <Sidebar.Provider
        className="min-h-0 flex-1 [&>[data-slot=sidebar]]:h-full"
        persist={false}
        mobileBreakpoint={0}
        shortcut={hasLeft ? undefined : null}
        open={leftOpen}
        onOpenChange={setLeftOpen}
      >
        {left}
        {/* The right side needs a provider of its own; it stays even without a pane, as the peer that makes the main region a card. */}
        <Sidebar.Provider
          className="min-h-0 min-w-0 flex-1 [&>[data-slot=sidebar]]:h-full"
          persist={false}
          mobileBreakpoint={0}
          shortcut={hasRight ? undefined : null}
          width={rightWidth}
          open={paneOpen && !narrow}
          onOpenChange={setRightOpen}
        >
          <Sidebar side="right" variant="inset" rail={hasRight}>
            {right}
          </Sidebar>
          {/* The inset's margins come from its peer, the side pane; the left sidebar is in the outer provider, so that side is set here: flush while it is open (its rows bring their own gutter), 8px once it folds. */}
          <Sidebar.Inset className={cn('@container min-h-0 min-w-0', hasLeft && leftOpen && '!ml-0')}>
            {narrow && paneOpen ? right : main}
          </Sidebar.Inset>
        </Sidebar.Provider>
      </Sidebar.Provider>
    </div>
  )
}

export type { DesktopPlatform, DesktopShellProps }
