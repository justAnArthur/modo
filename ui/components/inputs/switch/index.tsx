// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/switch.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/*` imports rewritten to relative
 *   `../../../lib/*` paths.
 * - Uncontrolled support (local addition, Base UI style): `checked` and
 *   `onToggle` are optional; new `defaultChecked` seeds internal state and new
 *   `onCheckedChange(checked)` reports every change, via the shared
 *   `useControllableState`. With `checked` passed the component stays fully
 *   controlled and `onToggle` fires exactly as upstream.
 * - Every in-body read of `checked` / `onToggle()` goes through the resolved
 *   state (`isChecked`) and a `toggle()` that flips it and calls `onToggle`.
 *   The Root's `onCheckedChange` is dropped: Base UI's keyboard and assistive
 *   activation re-click its hidden input, which already reaches the row's
 *   `onClick`, so keeping both toggled twice (a flip back, uncontrolled).
 * - `SwitchProps` members carry the FF docs API-table descriptions (plus the
 *   new props), so modo's parser lists them.
 * - TSDoc with the FF docs page's examples added above the component;
 *   `export default Switch` added.
 * - Styling reads DS tokens (AGENTS.md styling): the hex focus-ring
 *   fallback → `ring-focus-ring` / `border-focus-ring`; literal colors →
 *   color tokens; `duration-80|120|160` and tier-length JS durations →
 *   `duration-<tier>` / `spring.*`.
 * - The thumb is a `GooIndicator` (`lib/goo-indicator.tsx`, local) inside
 *   Base UI's Thumb: it stretches into a liquid drop as it travels. Its x is
 *   React state while dragging (the indicator snaps to it) instead of a
 *   motion value set per move.
 * - `description` (a muted line under the label, wired as
 *   `aria-describedby`; the label then stays at full contrast and medium
 *   weight) and `trackSide` (`"end"` pushes the track to the far edge) are
 *   local additions, for settings rows.
 * - `Switch.Group` (local addition): switches as a settings list in one
 *   outlined fieldset, after an outlined `Card.Group` (shared frame,
 *   hairlines dropped around the fluid hover highlight). A switch inside
 *   reads the group from context: track at the end, roomier padding, its
 *   position from `lib/row-index.tsx`.
 */

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import type { Transition } from 'motion/react'
import {
  Children,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'

interface SwitchProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label displayed next to the switch. */
  label: string
  /** Secondary text under the label: what turning the switch on does. With one, the label stays at full contrast. */
  description?: ReactNode
  /** The side of the label the track sits on; `"end"` pushes it to the row's far edge, as in a settings list (always, inside a `Switch.Group`). Defaults to `"start"`. */
  trackSide?: 'start' | 'end'
  /** Whether the switch is on (controlled). Omit it to let the switch keep its own state, seeded from `defaultChecked`. */
  checked?: boolean
  /** Whether the switch starts on when uncontrolled. Defaults to `false`. */
  defaultChecked?: boolean
  /** Called when the switch is toggled. */
  onToggle?: () => void
  /** Called with the new state whenever the switch is toggled, controlled or not. */
  onCheckedChange?: (checked: boolean) => void
  /** Disables the switch. Defaults to `false`. */
  disabled?: boolean
  /** Transition for the thumb's slide and hover/press stretch. Defaults to the `spring.moderate` motion token. */
  thumbTransition?: Transition
  /** Pins the switch to one step of the size ladder (see Sizes). Defaults to the surrounding SizeProvider, else `"default"`. */
  size?: SizeVariant
}

interface SwitchGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  count: number
}

const SwitchGroupContext = createContext<SwitchGroupContextValue | null>(null)

type SwitchComponent = ForwardRefExoticComponent<SwitchProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof SwitchGroup
}

// Track/thumb geometry per ladder step. The hover pill-extend and press
// squash scale down with the thumb so the compact switch keeps the same feel.
const METRICS = {
  default: {
    trackWidth: 34,
    trackHeight: 20,
    thumbSize: 16,
    pillExtend: 2,
    pressExtend: 4,
    pressShrink: 4,
  },
  compact: {
    trackWidth: 28,
    trackHeight: 16,
    thumbSize: 12,
    pillExtend: 2,
    pressExtend: 3,
    pressShrink: 3,
  },
} as const

const THUMB_OFFSET = 2
const DRAG_DEAD_ZONE = 2

/**
 * Toggle switch with animated thumb and label.
 *
 * The whole row — track and label — is the hit target: click anywhere to
 * toggle, or grab the thumb and drag it across the midpoint. The thumb
 * stretches into a pill on hover, squashes on press and melts across the
 * track like a drop when it toggles (see Morph), springing with the motion
 * tokens; a Base UI switch underneath carries the role, keyboard
 * toggling (Space/Enter) and focus ring. The label brightens when the switch
 * is on.
 *
 * Works controlled (`checked` + `onToggle`, exactly as upstream) or
 * uncontrolled (`defaultChecked`, with `onCheckedChange` reporting each
 * change). `size` pins it to one step of the size ladder; otherwise it
 * follows the surrounding SizeProvider. `description` adds a muted line under
 * the label and `trackSide="end"` moves the track to the row's far edge.
 *
 * Statics:
 * - `Switch.Group` — switches as a settings list in one outlined frame: each
 *   `Switch` inside becomes a row with its track at the far edge, hairlines
 *   divide the rows and a fluid hover highlight melts between them, dropping
 *   the hairlines it touches (as in an outlined Card.Group); a disabled row
 *   gets no highlight. Every switch keeps its own state. `size` pins every
 *   row; name the group with `aria-label` or `aria-labelledby`.
 *
 * @example {@include ./examples.mdx}
 */
const Switch = forwardRef<HTMLDivElement, SwitchProps>(
  (
    {
      label,
      description,
      trackSide = 'start',
      checked,
      defaultChecked = false,
      onToggle,
      onCheckedChange,
      disabled = false,
      thumbTransition,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [isChecked, setChecked] = useControllableState(checked, defaultChecked, onCheckedChange)
    const toggle = useCallback(() => {
      setChecked(prev => !prev)
      onToggle?.()
    }, [setChecked, onToggle])
    const labelId = useId()
    const descriptionId = useId()
    const group = useContext(SwitchGroupContext)
    const index = useRowIndex()
    const rowRef = useRef<HTMLDivElement | null>(null)
    // A disabled row takes no clicks, so the group's highlight never lands on it.
    useRegisterFluidHoverItem(disabled ? undefined : group?.registerItem, index, rowRef)
    const end = trackSide === 'end' || !!group
    // In a group: a hairline toward the next row, dropped where it would cut the highlight.
    const divider = !!group && index < group.count - 1 && group.activeIndex !== index && group.activeIndex !== index + 1
    const [hovered, setHovered] = useState(false)
    const [pressed, setPressed] = useState(false)
    const sizeClasses = useSize(size)
    const m = METRICS[sizeClasses.variant]
    const thumbTravel = m.trackWidth - m.thumbSize - THUMB_OFFSET * 2

    const dragging = useRef(false)
    const didDrag = useRef(false)
    const pointerStart = useRef<{
      clientX: number
      originX: number
    } | null>(null)
    // Local: the dragged thumb's x, mirrored in a ref for the pointer handlers.
    const [dragX, setDragXState] = useState<number | null>(null)
    const dragXRef = useRef<number | null>(null)
    const setDragX = useCallback((x: number | null) => {
      dragXRef.current = x
      setDragXState(x)
    }, [])

    const thumbWidth = pressed ? m.thumbSize + m.pressExtend : hovered ? m.thumbSize + m.pillExtend : m.thumbSize
    const thumbHeight = pressed ? m.thumbSize - m.pressShrink : m.thumbSize
    const thumbY = pressed ? THUMB_OFFSET + m.pressShrink / 2 : THUMB_OFFSET
    const extraWidth = thumbWidth - m.thumbSize
    const thumbX = isChecked ? THUMB_OFFSET + thumbTravel - extraWidth : THUMB_OFFSET
    const thumb = { left: dragX ?? thumbX, top: thumbY, width: thumbWidth, height: thumbHeight }

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        setPressed(true)
        dragging.current = false
        didDrag.current = false
        pointerStart.current = {
          clientX: e.clientX,
          // Where the pressed thumb rests.
          originX: isChecked ? THUMB_OFFSET + thumbTravel - m.pressExtend : THUMB_OFFSET,
        }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      },
      [disabled, isChecked, thumbTravel, m],
    )

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pointerStart.current) return
        const delta = e.clientX - pointerStart.current.clientX

        if (!dragging.current) {
          if (Math.abs(delta) < DRAG_DEAD_ZONE) return
          dragging.current = true
        }

        const dragMin = THUMB_OFFSET
        const pressedThumbWidth = m.thumbSize + m.pressExtend
        const dragMax = m.trackWidth - THUMB_OFFSET - pressedThumbWidth
        const rawX = pointerStart.current.originX + delta
        setDragX(Math.max(dragMin, Math.min(dragMax, rawX)))
      },
      [setDragX, m],
    )

    const handlePointerUp = useCallback(() => {
      if (!pointerStart.current) return
      setPressed(false)

      if (dragging.current) {
        didDrag.current = true
        dragging.current = false

        const currentX = dragXRef.current ?? pointerStart.current.originX
        const dragMin = THUMB_OFFSET
        const pressedThumbWidth = m.thumbSize + m.pressExtend
        const dragMax = m.trackWidth - THUMB_OFFSET - pressedThumbWidth
        const midpoint = (dragMin + dragMax) / 2

        const shouldBeOn = currentX > midpoint

        if (shouldBeOn !== isChecked) toggle()
        // Let go: the thumb springs from where it was dropped to its rest.
        setDragX(null)

        requestAnimationFrame(() => {
          didDrag.current = false
        })
      }

      pointerStart.current = null
    }, [isChecked, toggle, setDragX, m])

    const handlePointerCancel = useCallback(() => {
      if (!pointerStart.current) return
      setPressed(false)

      if (dragging.current) {
        dragging.current = false
        setDragX(null)
      }

      pointerStart.current = null
    }, [setDragX])

    return (
      <div
        ref={node => {
          rowRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        className={cn(
          'relative z-10 flex items-center cursor-pointer select-none touch-none',
          sizeClasses.gap,
          sizeClasses.px,
          sizeClasses.variant === 'compact' ? 'py-1' : 'py-2',
          group && (sizeClasses.variant === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3.5'),
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
        onPointerEnter={e => {
          if (e.pointerType === 'mouse') setHovered(true)
        }}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={() => {
          if (disabled || didDrag.current) return
          toggle()
        }}
        {...props}
      >
        {/* Switch */}
        <SwitchPrimitive.Root
          checked={isChecked}
          aria-labelledby={labelId}
          aria-describedby={description ? descriptionId : undefined}
          disabled={disabled}
          tabIndex={0}
          className={cn(
            'relative shrink-0 rounded-full outline-none cursor-pointer',
            end && 'order-last',
            'transition-colors duration-fast',
            'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isChecked ? (hovered ? 'bg-brand-hover' : 'bg-brand') : hovered ? 'bg-accent-hover' : 'bg-accent',
          )}
          style={{
            width: m.trackWidth,
            height: m.trackHeight,
          }}
          // Base UI re-dispatches this click on its hidden input, which bubbles to the row and toggles it: stop the original so a press toggles once.
          onClick={e => e.stopPropagation()}
        >
          <SwitchPrimitive.Thumb className="pointer-events-none absolute inset-0">
            <GooIndicator
              rect={thumb}
              className="rounded-full bg-thumb"
              shadow="shadow-thumb"
              transition={dragX === null ? (thumbTransition ?? spring.moderate) : false}
            />
          </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>

        {/* Label */}
        <span className={cn('flex min-w-0 flex-col gap-1', end && 'flex-1')}>
          <span
            id={labelId}
            className={cn(
              // text-box trim recenters the letterforms against the track; the
              // track is taller than the label, so layout doesn't change.
              '[text-box:trim-both_cap_alphabetic] transition-[color] duration-fast',
              sizeClasses.text,
              description ? 'text-foreground weight-medium' : isChecked ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
          {description && (
            <span
              id={descriptionId}
              className={cn(
                'leading-relaxed text-muted-foreground',
                sizeClasses.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
              )}
            >
              {description}
            </span>
          )}
        </span>

        {divider && <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/60" />}
      </div>
    )
  },
) as SwitchComponent

Switch.displayName = 'Switch'

interface SwitchGroupProps extends HTMLAttributes<HTMLFieldSetElement> {
  /** `Switch` rows. */
  children: ReactNode
  /** Pins every row to one step of the size ladder (see Sizes). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

// `Switch.Group`: the frame, hairlines and fluid hover around switch rows.
const SwitchGroup = forwardRef<HTMLFieldSetElement, SwitchGroupProps>(
  ({ children, size, className, ...props }, ref) => {
    const containerRef = useRef<HTMLFieldSetElement | null>(null)
    const hover = useFluidHover(containerRef, { gapClick: false })
    const shape = useShape()
    const count = Children.toArray(children).filter(isValidElement).length

    const group = (
      <SwitchGroupContext.Provider value={{ registerItem: hover.registerItem, activeIndex: hover.activeIndex, count }}>
        <fieldset
          ref={node => {
            containerRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          onMouseEnter={hover.handlers.onMouseEnter}
          onMouseMove={hover.handlers.onMouseMove}
          onMouseLeave={hover.handlers.onMouseLeave}
          onClick={hover.handlers.onClick}
          className={cn(
            'relative flex min-w-0 flex-col overflow-hidden border border-border/60 select-none',
            shape.container,
            className,
          )}
          {...props}
        >
          <FluidHoverHighlight hover={hover} className={cn('z-0', shape.container)} />
          <IndexedRows>{children}</IndexedRows>
        </fieldset>
      </SwitchGroupContext.Provider>
    )

    // A size prop pins every row in the group to one ladder step.
    return size ? <SizeProvider size={size}>{group}</SizeProvider> : group
  },
)

SwitchGroup.displayName = 'SwitchGroup'

Object.assign(Switch, { Group: SwitchGroup })

export type { SwitchGroupProps, SwitchProps }
export { Switch, SwitchGroup }

export default Switch
