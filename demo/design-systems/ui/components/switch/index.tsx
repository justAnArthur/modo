/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/switch.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/*` imports rewritten to relative
 *   `../../lib/*` paths.
 * - Uncontrolled support (local addition, Base UI style): `checked` and
 *   `onToggle` are optional; new `defaultChecked` seeds internal state and new
 *   `onCheckedChange(checked)` reports every change, via the shared
 *   `useControllableState`. With `checked` passed the component stays fully
 *   controlled and `onToggle` fires exactly as upstream.
 * - Every in-body read of `checked` / `onToggle()` goes through the resolved
 *   state (`isChecked`) and a `toggle()` that flips it and calls `onToggle`.
 * - `SwitchProps` members carry the FF docs API-table descriptions (plus the
 *   new props), so modo's parser lists them.
 * - TSDoc with the FF docs page's examples added above the component;
 *   `export default Switch` added.
 * - Styling reads DS tokens (AGENTS.md styling): the hex focus-ring
 *   fallback → `ring-focus-ring` / `border-focus-ring`; literal colors →
 *   color tokens; `duration-80|120|160` and tier-length JS durations →
 *   `duration-<tier>` / `spring.*`.
 */

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { animate, motion, type Transition, useMotionValue } from 'motion/react'
import { forwardRef, type HTMLAttributes, useCallback, useEffect, useId, useRef, useState } from 'react'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { useControllableState } from '../../lib/use-controllable-state'
import { cn } from '../../lib/utils'

interface SwitchProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label displayed next to the switch. */
  label: string
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
 * stretches into a pill on hover and squashes on press, springing with the
 * motion tokens; a Base UI switch underneath carries the role, keyboard
 * toggling (Space/Enter) and focus ring. The label brightens when the switch
 * is on.
 *
 * Works controlled (`checked` + `onToggle`, exactly as upstream) or
 * uncontrolled (`defaultChecked`, with `onCheckedChange` reporting each
 * change). `size` pins it to one step of the size ladder; otherwise it
 * follows the surrounding SizeProvider.
 *
 * @example {@include ./examples.mdx}
 */
const Switch = forwardRef<HTMLDivElement, SwitchProps>(
  (
    {
      label,
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
    const hasMounted = useRef(false)
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

    const motionX = useMotionValue(isChecked ? THUMB_OFFSET + thumbTravel : THUMB_OFFSET)

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const thumbWidth = pressed ? m.thumbSize + m.pressExtend : hovered ? m.thumbSize + m.pillExtend : m.thumbSize
    const thumbHeight = pressed ? m.thumbSize - m.pressShrink : m.thumbSize
    const thumbY = pressed ? THUMB_OFFSET + m.pressShrink / 2 : THUMB_OFFSET
    const extraWidth = thumbWidth - m.thumbSize
    const thumbX = isChecked ? THUMB_OFFSET + thumbTravel - extraWidth : THUMB_OFFSET

    useEffect(() => {
      if (dragging.current) return
      if (!hasMounted.current) {
        motionX.set(thumbX)
      } else {
        animate(motionX, thumbX, thumbTransition ?? spring.moderate)
      }
    }, [thumbX, motionX, thumbTransition])

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        setPressed(true)
        dragging.current = false
        didDrag.current = false
        pointerStart.current = {
          clientX: e.clientX,
          originX: motionX.get(),
        }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      },
      [disabled, motionX],
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
        motionX.set(Math.max(dragMin, Math.min(dragMax, rawX)))
      },
      [motionX, m],
    )

    const handlePointerUp = useCallback(() => {
      if (!pointerStart.current) return
      setPressed(false)

      if (dragging.current) {
        didDrag.current = true
        dragging.current = false

        const currentX = motionX.get()
        const dragMin = THUMB_OFFSET
        const pressedThumbWidth = m.thumbSize + m.pressExtend
        const dragMax = m.trackWidth - THUMB_OFFSET - pressedThumbWidth
        const midpoint = (dragMin + dragMax) / 2

        const shouldBeOn = currentX > midpoint

        if (shouldBeOn !== isChecked) {
          toggle()
        } else {
          const snapTarget = isChecked ? THUMB_OFFSET + thumbTravel : THUMB_OFFSET
          animate(motionX, snapTarget, thumbTransition ?? spring.moderate)
        }

        requestAnimationFrame(() => {
          didDrag.current = false
        })
      }

      pointerStart.current = null
    }, [isChecked, toggle, motionX, thumbTransition, m, thumbTravel])

    const handlePointerCancel = useCallback(() => {
      if (!pointerStart.current) return
      setPressed(false)

      if (dragging.current) {
        dragging.current = false
        const snapTarget = isChecked ? THUMB_OFFSET + thumbTravel : THUMB_OFFSET
        animate(motionX, snapTarget, thumbTransition ?? spring.moderate)
      }

      pointerStart.current = null
    }, [isChecked, motionX, thumbTransition, thumbTravel])

    return (
      <div
        ref={ref}
        className={cn(
          'relative z-10 flex items-center cursor-pointer select-none touch-none',
          sizeClasses.gap,
          sizeClasses.px,
          sizeClasses.variant === 'compact' ? 'py-1' : 'py-2',
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
          // Base UI passes (checked, eventDetails); narrow to () => void for our onToggle.
          onCheckedChange={() => {
            if (didDrag.current) return
            toggle()
          }}
          disabled={disabled}
          tabIndex={0}
          className={cn(
            'relative shrink-0 rounded-full outline-none cursor-pointer',
            'transition-colors duration-fast',
            'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isChecked ? (hovered ? 'bg-brand-hover' : 'bg-brand') : hovered ? 'bg-accent-hover' : 'bg-accent',
          )}
          style={{
            width: m.trackWidth,
            height: m.trackHeight,
          }}
          onClick={e => e.stopPropagation()}
        >
          <SwitchPrimitive.Thumb
            render={props => {
              const {
                style: baseStyle,
                onDrag: _onDrag,
                onDragStart: _onDragStart,
                onDragEnd: _onDragEnd,
                onAnimationStart: _onAnimationStart,
                onAnimationEnd: _onAnimationEnd,
                onAnimationIteration: _onAnimationIteration,
                ...rest
              } = props as React.HTMLAttributes<HTMLSpanElement>
              return (
                <motion.span
                  {...rest}
                  className="absolute top-0 left-0 block rounded-full bg-white shadow-sm"
                  initial={false}
                  style={{
                    ...(baseStyle as React.CSSProperties | undefined),
                    x: motionX,
                  }}
                  animate={{
                    y: thumbY,
                    width: thumbWidth,
                    height: thumbHeight,
                  }}
                  transition={hasMounted.current ? (thumbTransition ?? spring.moderate) : { duration: 0 }}
                />
              )
            }}
          />
        </SwitchPrimitive.Root>

        {/* Label */}
        <span
          id={labelId}
          className={cn(
            // text-box trim recenters the letterforms against the track; the
            // track is taller than the label, so layout doesn't change.
            '[text-box:trim-both_cap_alphabetic] transition-[color] duration-fast',
            sizeClasses.text,
            isChecked ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      </div>
    )
  },
)

Switch.displayName = 'Switch'

export type { SwitchProps }
export { Switch }

export default Switch
