/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useIsMobile } from '../../../lib/use-is-mobile'
import { cn } from '../../../lib/utils'
import {
  defaultShortcut,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SidebarContext,
  type SidebarContextValue,
  type SidebarSide,
} from './sidebar-context'
import { type SidebarShortcutScope, useSidebarShortcut } from './sidebar-shortcut'

/** Open on hover: the strip past the inner edge that opens it, and how close a trigger must sit to that edge to widen the strip to its own far side (px). */
const HOVER_STRIP = 12
const HOVER_TRIGGER_GAP = 24

/** Open on hover's zone: from the frame's edge to the sidebar's inner edge plus the strip, widened to the far side of a trigger right beside that edge, within the frame's height. */
function inHoverZone(
  event: PointerEvent,
  side: SidebarSide,
  frame: HTMLElement | null,
  shell: HTMLElement | null,
  triggers: Set<HTMLElement>,
): boolean {
  if (!frame || !shell) return false
  const bounds = frame.getBoundingClientRect()
  if (event.clientY < bounds.top || event.clientY > bounds.bottom) return false
  const box = shell.getBoundingClientRect()
  const inner = side === 'left' ? box.right : box.left
  let reach = HOVER_STRIP
  for (const trigger of triggers) {
    const button = trigger.getBoundingClientRect()
    const gap = side === 'left' ? button.left - inner : inner - button.right
    if (gap >= 0 && gap <= HOVER_TRIGGER_GAP) reach = Math.max(reach, gap + button.width)
  }
  return side === 'left'
    ? event.clientX >= bounds.left && event.clientX < inner + reach
    : event.clientX <= bounds.right && event.clientX > inner - reach
}

export interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  /** Initial open state, for an uncontrolled provider. Defaults to `true`. */
  defaultOpen?: boolean
  /** Controlled open state (kept open, on desktop). */
  open?: boolean
  /** Called when the sidebar is kept open or collapsed. */
  onOpenChange?: (open: boolean) => void
  /** Persist the desktop open state to the `sidebar_state` cookie so a server
   *  layout can read it back into `defaultOpen`. Mobile state never persists. Defaults to `true`. */
  persist?: boolean
  /** Bare-key toggle shortcut. Defaults to "[" for a left sidebar and "]"
   *  for a right one; `null` disables it. */
  shortcut?: string | null
  /** Which provider answers the shortcut while focus is on the page, outside
   *  every provider: `'page'` wins over `'nearest'` ones with the same key (a
   *  docs or app shell beside demos that carry their own sidebars). Focus
   *  inside a provider always goes to the innermost one. Defaults to `'nearest'`. */
  shortcutScope?: SidebarShortcutScope
  /** Viewport width (px) below which the sidebar renders as a drawer. Defaults to `768`. */
  mobileBreakpoint?: number
  /** While collapsed, open the sidebar when the pointer reaches its edge or
   *  the trigger beside it, and close it a beat after the pointer leaves.
   *  `open` then says whether it is kept open, and the trigger switches
   *  between the two. Hovering never writes the cookie. Defaults to `false`. */
  openOnHover?: boolean
  /** The rail's starting width. Defaults to `'16rem'`. */
  width?: string
  /** The mobile drawer's width. Defaults to `'18rem'`. */
  widthMobile?: string
}

const SidebarProvider = forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange,
      persist = true,
      shortcut: shortcutProp,
      shortcutScope = 'nearest',
      mobileBreakpoint = 768,
      openOnHover = false,
      width: widthProp = SIDEBAR_WIDTH,
      widthMobile = SIDEBAR_WIDTH_MOBILE,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile(mobileBreakpoint)
    const [openMobile, setOpenMobile] = useState(false)
    const [side, setSide] = useState<SidebarSide>('left')
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const wrapper = useMergeRefs(wrapperRef, ref)
    const registerSide = useCallback((next: SidebarSide) => setSide(next), [])

    const [width, setWidth] = useState(widthProp)
    useEffect(() => setWidth(widthProp), [widthProp])
    const [isResizing, setIsResizing] = useState(false)

    const shortcut = shortcutProp === undefined ? defaultShortcut(side) : shortcutProp

    const [open, setOpenState] = useControllableState(openProp, defaultOpen, onOpenChange)
    const persistRef = useRef(persist)
    persistRef.current = persist
    const setOpen = useCallback(
      (value: boolean | ((prev: boolean) => boolean)) =>
        setOpenState(prev => {
          const next = typeof value === 'function' ? value(prev) : value
          if (persistRef.current) {
            // biome-ignore lint/suspicious/noDocumentCookie: a server layout reads it back
            document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
          }
          return next
        }),
      [setOpenState],
    )

    const toggleSidebar = useCallback(() => {
      if (isMobile) setOpenMobile(prev => !prev)
      else setOpen(prev => !prev)
    }, [isMobile, setOpen])

    useSidebarShortcut(wrapperRef, shortcut, shortcutScope, toggleSidebar)

    // Keeping it open ends the hover. The zone arms only once the pointer has
    // been outside it, so collapsing from the trigger or the rail under the
    // pointer doesn't open it straight back.
    const [hoverOpen, setHoverOpen] = useState(false)
    useEffect(() => {
      if (open || !openOnHover) setHoverOpen(false)
    }, [open, openOnHover])
    const shellRef = useRef<HTMLElement | null>(null)
    const triggers = useRef(new Set<HTMLElement>())
    const registerTrigger = useCallback((node: HTMLElement) => {
      triggers.current.add(node)
      return () => {
        triggers.current.delete(node)
      }
    }, [])
    useEffect(() => {
      if (!openOnHover || open || isMobile || isResizing) return
      let armed = false
      let close: ReturnType<typeof setTimeout> | undefined
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        if (!inHoverZone(event, side, wrapperRef.current, shellRef.current, triggers.current)) {
          armed = true
          if (hoverOpen) close ??= setTimeout(() => setHoverOpen(false), 300)
          return
        }
        clearTimeout(close)
        close = undefined
        if (armed) setHoverOpen(true)
      }
      document.addEventListener('pointermove', onPointerMove)
      return () => {
        document.removeEventListener('pointermove', onPointerMove)
        clearTimeout(close)
      }
    }, [openOnHover, open, isMobile, isResizing, hoverOpen, side])

    const value = useMemo<SidebarContextValue>(
      () => ({
        state: open || hoverOpen ? 'expanded' : 'collapsed',
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
        width,
        setWidth,
        widthMobile,
        mobileBreakpoint,
        side,
        registerSide,
        shortcut,
        openOnHover,
        hoverOpen,
        setHoverOpen,
        shellRef,
        registerTrigger,
        isResizing,
        setIsResizing,
      }),
      [
        open,
        setOpen,
        openMobile,
        isMobile,
        toggleSidebar,
        width,
        widthMobile,
        mobileBreakpoint,
        side,
        registerSide,
        shortcut,
        openOnHover,
        hoverOpen,
        registerTrigger,
        isResizing,
      ],
    )

    return (
      <SidebarContext.Provider value={value}>
        <div
          ref={wrapper}
          data-slot="sidebar-wrapper"
          className={cn('group/sidebar-wrapper relative flex min-h-svh w-full', className)}
          style={{ '--sidebar-width': width, '--sidebar-width-mobile': widthMobile, ...style } as CSSProperties}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  },
)
SidebarProvider.displayName = 'SidebarProvider'

export { SidebarProvider }
