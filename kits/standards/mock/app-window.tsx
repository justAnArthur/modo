/*!
 * Docs-only: the just-standards desktop window the pages put their screens
 * in, modo-ui's DesktopShell at a fixed window size, scaled down to the
 * width it gets (CSS zoom, as the ai kit's ScreenFrame does).
 */

'use client'

import DesktopShell from '@justanarthur/modo-ui/blocks/desktop-shell'
import Button from '@justanarthur/modo-ui/components/actions/button'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Activity, Bot, Building2, Package, Play } from 'lucide-react'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { BUSINESSES, PACKS, WORKERS } from './status'

const NAV = [
  { value: 'businesses', label: 'Businesses', icon: Building2, badge: BUSINESSES.length },
  { value: 'runs', label: 'Runs', icon: Activity, badge: 2 },
]

const LIBRARY = [
  { value: 'packs', label: 'Packs', icon: Package, badge: PACKS.length },
  { value: 'workers', label: 'Workers', icon: Bot, badge: WORKERS.length },
]

interface AppWindowProps {
  /** The title bar's middle. */
  title: ReactNode
  /** The sidebar row that is current. Defaults to `'businesses'`. */
  current?: string
  /** The main card's content. */
  children: ReactNode
  /** The side pane's content; the pane is folded without it. */
  pane?: ReactNode
  /** Called when the side pane's toggle folds it. */
  onPaneClose?: () => void
  /** The window's size in px. Defaults to 1280 × 800. */
  width?: number
  height?: number
}

export function AppWindow({
  title,
  current = 'businesses',
  children,
  pane,
  onPaneClose,
  width = 1280,
  height = 800,
}: AppWindowProps) {
  const shape = useShape()
  const outer = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = outer.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={outer} className="w-full" style={{ height: height * scale }}>
      <div
        className={cn('overflow-hidden border border-border', shape.container)}
        style={{ width, height, zoom: scale }}
      >
        <DesktopShell
          showControls
          title={<span className="truncate text-body weight-medium text-foreground">{title}</span>}
          trailing={
            <span className="flex items-center gap-3">
              <span className="text-caption text-muted-foreground">Checked 40m ago</span>
              <Button variant="tertiary" size="compact" leadingIcon={Play}>
                Run checks
              </Button>
            </span>
          }
          left={
            <Sidebar variant="inset" value={current}>
              <Sidebar.Content>
                {[
                  { label: 'Status', rows: NAV },
                  { label: 'Library', rows: LIBRARY },
                ].map(group => (
                  <Sidebar.Group key={group.label}>
                    <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
                    <Sidebar.Menu>
                      {group.rows.map(row => (
                        <Sidebar.MenuItem key={row.value}>
                          <Sidebar.MenuButton icon={row.icon} value={row.value}>
                            {row.label}
                          </Sidebar.MenuButton>
                          <Sidebar.MenuBadge>{row.badge}</Sidebar.MenuBadge>
                        </Sidebar.MenuItem>
                      ))}
                    </Sidebar.Menu>
                  </Sidebar.Group>
                ))}
              </Sidebar.Content>
            </Sidebar>
          }
          main={<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 p-6">{children}</div>}
          right={pane}
          rightOpen={pane !== undefined}
          onRightOpenChange={open => !open && onPaneClose?.()}
          defaultPaneSize={36}
          rightLabel="Cell"
        />
      </div>
    </div>
  )
}

/** A screen's head: its title, a line under it, and its actions. */
export function ScreenHeader({ title, lead, actions }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-display text-foreground">{title}</h1>
        {lead && <p className="text-body text-muted-foreground">{lead}</p>}
      </div>
      {actions}
    </div>
  )
}
