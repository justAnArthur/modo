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

import type { Popover } from '@base-ui/react/popover'
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useControllableState } from './use-controllable-state'
import { inPlaceOffset, type MorphOrigin, type MorphProps, opensInPlace, useMorphOrigin } from './use-morph'
import { cn } from './utils'

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

type Positioner = ComponentProps<typeof Popover.Positioner>

/**
 * The finer positioning props a content may add to `AnchorProps`, forwarded
 * to Base UI's `Positioner` by `positionerProps`. Documented once.
 */
interface CollisionProps {
  /** Shift along the aligned edge in px, after `align`, or Base UI's function of side, align and sizes. Defaults to `0`. */
  alignOffset?: Positioner['alignOffset']
  /** Space kept between the panel and the edge of its collision boundary, in px or per side. Defaults to `5`. */
  collisionPadding?: Positioner['collisionPadding']
  /** The area the panel stays inside: an element, several, or a rect. Defaults to `'clipping-ancestors'`. */
  collisionBoundary?: Positioner['collisionBoundary']
  /** Classes for the positioner, the element that carries the panel's place and stacking (a `z-index` over a host's own layers). */
  positionerClassName?: string
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
 * False until `open` first turns true, then true for good. Content that
 * mounts its machinery (the morph, a fluid hover, the portal) behind it costs
 * nothing in a list of triggers until one opens, and stays mounted after, for
 * its close and the next open.
 */
function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open)
  if (open && !opened) setOpened(true)
  return opened || open
}

/**
 * Base UI `Positioner` props for an anchored overlay: the content's
 * anchoring props over the overlay's defaults, pulled back over the trigger
 * when the panel opens in place. Spread them on the `Positioner`.
 */
function positionerProps(
  {
    side,
    align,
    sideOffset,
    effect,
    hideSource,
    alignOffset,
    collisionPadding,
    collisionBoundary,
    positionerClassName,
  }: AnchorProps & MorphProps & CollisionProps,
  defaults: { side: Side; align: Align; sideOffset: number },
): Pick<Positioner, 'sideOffset' | 'alignOffset' | 'collisionPadding' | 'collisionBoundary'> & {
  side: Side
  align: Align
  className: string
} {
  const inPlace = opensInPlace({ effect, hideSource })
  return {
    side: side ?? defaults.side,
    align: align ?? (inPlace ? 'start' : defaults.align),
    sideOffset: inPlace ? inPlaceOffset : (sideOffset ?? defaults.sideOffset),
    alignOffset,
    collisionPadding,
    collisionBoundary,
    className: cn('z-50 outline-none', positionerClassName),
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

export type { Align, AnchorProps, CollisionProps, OpenChangeDetails, OverlayRootProps, OverlayState, Side }
export {
  OverlayContext,
  PortalContainer,
  positionerProps,
  useOpenedOnce,
  useOverlay,
  useOverlayRoot,
  usePortalContainer,
}
