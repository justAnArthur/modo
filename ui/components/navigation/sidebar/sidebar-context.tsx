/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { createContext, type Dispatch, type MutableRefObject, type SetStateAction, useContext } from 'react'

export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
/** Bare-key toggle defaults: "[" for a left sidebar, "]" for a right one.
 *  Bare (no ⌘/Ctrl) so the browser's history shortcuts stay untouched. */
export const SIDEBAR_KEYBOARD_SHORTCUT = '['
export const SIDEBAR_KEYBOARD_SHORTCUT_RIGHT = ']'
/** Drag-resize clamp for the rail (px). */
export const SIDEBAR_MIN_WIDTH = 160
export const SIDEBAR_MAX_WIDTH = 360

export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type SidebarCollapsible = 'offcanvas' | 'none'

export interface SidebarContextValue {
  /** What shows: expanded while kept open or open on hover. */
  state: 'expanded' | 'collapsed'
  /** Kept open. */
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: Dispatch<SetStateAction<boolean>>
  isMobile: boolean
  toggleSidebar: () => void
  /** Live rail width: the rail's drag-resize updates it. */
  width: string
  setWidth: (width: string) => void
  widthMobile: string
  mobileBreakpoint: number
  /** The edge the rendered Sidebar sits on (it registers it). */
  side: SidebarSide
  registerSide: (side: SidebarSide) => void
  /** The resolved toggle key, `null` when off. */
  shortcut: string | null
  openOnHover: boolean
  /** True while the collapsed sidebar is open on hover. */
  hoverOpen: boolean
  setHoverOpen: Dispatch<SetStateAction<boolean>>
  /** The shell and the triggers register their nodes; the hover zone is measured off them. */
  shellRef: MutableRefObject<HTMLElement | null>
  registerTrigger: (node: HTMLElement) => () => void
  /** True while the rail is drag-resized: the width tracks the pointer 1:1. */
  isResizing: boolean
  setIsResizing: Dispatch<SetStateAction<boolean>>
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider')
  return ctx
}

/** The side's default toggle key. */
export function defaultShortcut(side: SidebarSide) {
  return side === 'right' ? SIDEBAR_KEYBOARD_SHORTCUT_RIGHT : SIDEBAR_KEYBOARD_SHORTCUT
}
