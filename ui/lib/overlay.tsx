/*
 * Local addition (not part of Fluid Functionalism): what every morphing
 * overlay's root and content share: the open state the morph reads, the
 * anchoring props, the portal container.
 *
 * A popup may be mounted while it is closed: Base UI force-mounts a Select's
 * popup after its first value change (`SelectRoot` `forceMount`). A list
 * popup resets its overlay indices on close and remeasures on open.
 */

'use client'

import { createContext, type ReactNode, type RefObject, useCallback, useContext, useMemo } from 'react'
import { useControllableState } from './use-controllable-state'
import { inPlaceOffset, type MorphOrigin, type MorphProps, opensInPlace, useMorphOrigin } from './use-morph'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Align = 'start' | 'center' | 'end'

/**
 * The anchoring props an anchored overlay's content takes, documented once.
 * A content props interface extends it and states its own defaults.
 */
interface AnchorProps {
  /** Side of the trigger the panel opens on; it flips when there is no room. */
  side?: Side
  /** Alignment along that side. A panel that opens in place (`effect="morph"` with `hideSource`) aligns to the start. */
  align?: Align
  /** Gap between trigger and panel in px, the length of the goo neck. Ignored when the panel opens in place. */
  sideOffset?: number
  /** Portal target. Defaults to the nearest `PortalContainer`, else the document body. */
  container?: HTMLElement | null
}

/** What an overlay's parts read from its root. */
interface OverlayState {
  open: boolean
  origin: RefObject<MorphOrigin>
}

/** The open-change details Base UI passes: the pressed trigger and the event. */
interface OpenChangeDetails {
  trigger?: Element
  event?: Event
}

interface OverlayRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const OverlayContext = createContext<OverlayState | null>(null)

/**
 * An overlay root's state, both ways: `open` / `defaultOpen` /
 * `onOpenChange`, and what opened it for the morph. Pass `onOpenChange` to
 * the Base UI root (it captures the origin on open) and `state` to
 * `OverlayContext.Provider`. `setOpen` changes it from code (a select's
 * acknowledgement delay, a picker's Done).
 */
function useOverlayRoot({ open: openProp, defaultOpen = false, onOpenChange: onChange }: OverlayRootProps) {
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onChange)
  const { origin, capture } = useMorphOrigin()

  const onOpenChange = useCallback(
    (next: boolean, details: OpenChangeDetails) => {
      if (next) capture(details)
      setOpen(next)
    },
    [capture, setOpen],
  )

  const state = useMemo(() => ({ open, origin }), [open, origin])

  return { open, setOpen, onOpenChange, state }
}

/** The nearest overlay root's state. `part` names the caller in the error thrown outside a root. */
function useOverlay(part: string): OverlayState {
  const state = useContext(OverlayContext)
  if (!state) throw new Error(`${part} must be inside its overlay's root.`)
  return state
}

/**
 * Base UI `Positioner` props for an anchored overlay: the content's
 * anchoring props over the overlay's defaults, pulled back over the trigger
 * when the panel opens in place. Spread them on the `Positioner`.
 */
function positionerProps(
  { side, align, sideOffset, effect, hideSource }: AnchorProps & MorphProps,
  defaults: { side: Side; align: Align; sideOffset: number },
) {
  const inPlace = opensInPlace({ effect, hideSource })
  return {
    side: side ?? defaults.side,
    align: align ?? (inPlace ? 'start' : defaults.align),
    sideOffset: inPlace ? inPlaceOffset : (sideOffset ?? defaults.sideOffset),
    className: 'z-50 outline-none',
  }
}

const PortalContainerContext = createContext<HTMLElement | null>(null)

/** Portals every overlay inside it into `value` (a demo frame, a shadow root) instead of the document body. */
function PortalContainer({ value, children }: { value: HTMLElement | null; children: ReactNode }) {
  return <PortalContainerContext.Provider value={value}>{children}</PortalContainerContext.Provider>
}

/** The portal target: the content's own `container`, else the nearest `PortalContainer`, else the body (`undefined`). */
function usePortalContainer(container?: HTMLElement | null) {
  const scoped = useContext(PortalContainerContext)
  return container ?? scoped ?? undefined
}

export type { Align, AnchorProps, OpenChangeDetails, OverlayRootProps, OverlayState, Side }
export { OverlayContext, PortalContainer, positionerProps, useOverlay, useOverlayRoot, usePortalContainer }
