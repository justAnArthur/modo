// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the Slider port (Fluid Functionalism `registry/base/slider.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { AnimatePresence, animate, type MotionValue, motion, useMotionValue, useTransform } from 'motion/react'
import { forwardRef, type HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mergeRefs } from '../../../lib/merge-refs'
import { useShape } from '../../../lib/shape-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { layoutX, PIP_SIZE, snapValue, useDelayedFlag } from './geometry'
import { ValueBubble } from './value-display'

/** The comfortable engine's props: the pips / scrubber design. */
interface ComfortableSliderProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'onChange' | 'defaultValue' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onAnimationStart'
  > {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  variant?: 'pips' | 'scrubber'
  label?: string
  formatValue?: (v: number) => string
  disabled?: boolean
  name?: string
}

const ComfortableSlider = forwardRef<HTMLDivElement, ComfortableSliderProps>(
  (
    {
      value,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      variant = 'pips',
      label,
      formatValue = String,
      disabled = false,
      name,
      className,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const dragging = useRef(false)
    const handleDragging = useRef(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [hoverPreview, setHoverPreview] = useState<{
      left: number
      width: number
      snappedValue: number
      cursorX: number
    } | null>(null)
    const showHoverTooltip = useDelayedFlag(isHovered, 100)
    const shape = useShape()

    const pipSteps = useMemo(
      () => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step),
      [min, max, step],
    )
    const pipCount = pipSteps.length

    const fillPercent = useMotionValue(max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min))))
    // At `min` the handle line sits a little in, so it stays visible.
    const zeroTarget = variant === 'pips' ? 8 : 17
    const zeroOffset = useMotionValue(value === min ? zeroTarget : 0)

    const fillWidthStyle = useTransform(fillPercent, p => `${p * 100}%`)
    const handleLeftStyle = useTransform(
      [fillPercent, zeroOffset] as MotionValue<number>[],
      ([p, zo]) => `calc(${(p as number) * 100}% - 8px + ${zo as number}px)`,
    )
    const handleLineLeftStyle = useTransform(
      [fillPercent, zeroOffset] as MotionValue<number>[],
      ([p, zo]) => `calc(${(p as number) * 100}% - 9px + ${zo as number}px)`,
    )
    // Offset by the pips' px-3 padding, so the fill edge meets the active pip's centre.
    const pipsFillWidthStyle = useTransform(
      [fillPercent, zeroOffset] as MotionValue<number>[],
      ([p, zo]) => `calc(${(p as number) * 100}% + ${20 - 20 * (p as number) - (zo as number) * 2.5}px)`,
    )
    const pipsHandleLineLeftStyle = useTransform(fillPercent, p => `calc(${p * 100}% + ${11 - 24 * p}px)`)
    const pipsMaskStyle = useTransform([fillPercent, zeroOffset] as MotionValue<number>[], ([p, zo]) => {
      const offset = 20 - 20 * (p as number) - (zo as number) * 2.5
      return `linear-gradient(to right, transparent calc(${(p as number) * 100}% + ${offset}px), black calc(${(p as number) * 100}% + ${offset + 2}px))`
    })

    const computeHoverPreview = useCallback(
      (clientX: number) => {
        const el = containerRef.current
        if (!el) return
        // The padding box: CSS % and absolute left / width resolve against it.
        const w = el.clientWidth
        const x = layoutX(clientX, el)
        if (w <= 0 || x === null) return
        const borderLeft = (el.offsetWidth - w) / 2
        const clamped = Math.max(0, Math.min(w, x - borderLeft))

        let snappedVal: number
        if (variant === 'pips') {
          if (pipCount <= 1) return
          const index = Math.max(0, Math.min(pipCount - 1, Math.round((clamped / w) * (pipCount - 1))))
          snappedVal = pipSteps[index]!
        } else {
          snappedVal = snapValue(min + (clamped / w) * (max - min), min, max, step)
        }
        const snappedPercent = max === min ? 0 : (snappedVal - min) / (max - min)
        const snappedX = snappedPercent * w

        // For pips, the handle sits at the fill edge's offset.
        const currentPercent = fillPercent.get()
        let handleX: number
        if (variant === 'pips') {
          const zo = zeroOffset.get()
          handleX = currentPercent * w + (20 - 20 * currentPercent - zo * 2.5)
        } else {
          handleX = currentPercent * w
        }

        // At the extremes the bar reaches the edge, leaving no gap.
        const edgeX = snappedVal === min ? 0 : snappedVal === max ? w : snappedX
        const left = Math.min(handleX, edgeX)
        const width = Math.abs(edgeX - handleX)
        setHoverPreview({ left, width, snappedValue: snappedVal, cursorX: snappedX })
      },
      [variant, pipSteps, pipCount, min, max, step, fillPercent, zeroOffset],
    )

    useEffect(() => {
      if (dragging.current || handleDragging.current) return
      const percent = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
      animate(fillPercent, percent, spring.fast)
      animate(zeroOffset, value === min ? zeroTarget : 0, spring.fast)
    }, [value, min, max, variant, fillPercent, zeroOffset, zeroTarget])

    const getValueFromX = useCallback(
      (clientX: number) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return min
        const x = clientX - rect.left
        const clamped = Math.max(0, Math.min(rect.width, x))
        if (variant === 'pips') {
          if (pipCount <= 1) return min
          const index = Math.max(0, Math.min(pipCount - 1, Math.round((clamped / rect.width) * (pipCount - 1))))
          return pipSteps[index]!
        }
        return snapValue(min + (clamped / rect.width) * (max - min), min, max, step)
      },
      [variant, pipSteps, pipCount, min, max, step],
    )

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        e.preventDefault()
        dragging.current = true
        setIsPressed(true)
        const newVal = getValueFromX(e.clientX)
        onValueChange(newVal)
        const newPercent = Math.max(0, Math.min(1, (newVal - min) / (max - min)))
        animate(fillPercent, newPercent, spring.fast)
        animate(zeroOffset, newVal === min ? zeroTarget : 0, spring.fast)
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      },
      [disabled, getValueFromX, onValueChange, fillPercent, zeroOffset, zeroTarget, min, max],
    )

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return
        const newVal = getValueFromX(e.clientX)
        onValueChange(newVal)
        const newPercent = Math.max(0, Math.min(1, (newVal - min) / (max - min)))
        if (variant === 'scrubber') {
          fillPercent.set(newPercent)
        } else {
          animate(fillPercent, newPercent, spring.fast)
        }
        animate(zeroOffset, newVal === min ? zeroTarget : 0, spring.fast)
      },
      [getValueFromX, onValueChange, variant, fillPercent, zeroOffset, zeroTarget, min, max],
    )

    const handlePointerUp = useCallback(() => {
      dragging.current = false
      setIsPressed(false)
      setHoverPreview(null)
    }, [])

    const handleResizePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        handleDragging.current = true
        setIsPressed(true)
        const newVal = getValueFromX(e.clientX)
        onValueChange(newVal)
        fillPercent.set(Math.max(0, Math.min(1, (newVal - min) / (max - min))))
        animate(zeroOffset, newVal === min ? zeroTarget : 0, spring.fast)
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      },
      [disabled, getValueFromX, onValueChange, fillPercent, zeroOffset, zeroTarget, min, max],
    )

    const handleResizePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!handleDragging.current) return
        const newVal = getValueFromX(e.clientX)
        onValueChange(newVal)
        fillPercent.set(Math.max(0, Math.min(1, (newVal - min) / (max - min))))
        animate(zeroOffset, newVal === min ? zeroTarget : 0, spring.fast)
      },
      [getValueFromX, onValueChange, fillPercent, zeroOffset, zeroTarget, min, max],
    )

    const handleResizePointerUp = useCallback(() => {
      handleDragging.current = false
      setIsPressed(false)
      setHoverPreview(null)
    }, [])

    const handleRadixChange = useCallback(
      (newValues: number[]) => {
        onValueChange(newValues[0]!)
      },
      [onValueChange],
    )

    const isActive = isHovered || isFocused

    return (
      <div
        className="relative w-full touch-none"
        onPointerEnter={() => {
          if (!disabled) setIsHovered(true)
        }}
        onPointerLeave={() => {
          if (!disabled) {
            setIsHovered(false)
            setHoverPreview(null)
          }
        }}
        onMouseMove={e => {
          if (disabled || dragging.current || handleDragging.current) return
          computeHoverPreview(e.clientX)
        }}
      >
        {/* The hit area reaches 8px past each end. */}
        <div
          className="absolute cursor-ew-resize"
          style={{ left: -8, right: -8, top: 0, bottom: 0 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {/* Outside the overflow-hidden track. */}
        <AnimatePresence>
          {hoverPreview && showHoverTooltip && !isPressed && (
            <motion.div
              key="hover-tooltip"
              className="absolute -translate-x-1/2 pointer-events-none z-20"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: spring.fast.exit }}
              transition={spring.fast}
              style={{
                left: hoverPreview.cursorX,
                top: -30,
              }}
            >
              <ValueBubble>{formatValue(hoverPreview.snappedValue)}</ValueBubble>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          ref={mergeRefs(containerRef, ref)}
          className={cn(
            'relative w-full h-8 select-none touch-none border border-border overflow-hidden outline-offset-2',
            variant === 'scrubber' ? 'flex items-center gap-3 px-4 cursor-ew-resize' : 'cursor-ew-resize',
            shape.bg,
            disabled && 'opacity-50 pointer-events-none',
            className,
          )}
          initial={false}
          animate={{
            outline: isFocused ? '1px solid var(--focus-ring)' : '1px solid transparent',
          }}
          transition={spring.fast}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          {...props}
        >
          {/* Invisible: the roles and arrow keys. */}
          <SliderPrimitive.Root
            value={[value]}
            onValueChange={v => handleRadixChange(v as number[])}
            name={name}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="absolute inset-0 opacity-0 pointer-events-none [&_*]:pointer-events-none"
          >
            <SliderPrimitive.Control className="w-full h-full">
              <SliderPrimitive.Track className="w-full h-full">
                <SliderPrimitive.Indicator />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb
                index={0}
                aria-label={label}
                className="block outline-none"
                onFocus={e => {
                  if ((e.currentTarget as HTMLElement).matches(':focus-visible')) setIsFocused(true)
                }}
                onBlur={() => setIsFocused(false)}
              />
            </SliderPrimitive.Control>
          </SliderPrimitive.Root>

          <motion.div
            className="absolute inset-y-0 bg-accent/40 pointer-events-none z-[3]"
            initial={false}
            animate={{
              opacity: hoverPreview && !isPressed ? 1 : 0,
            }}
            transition={{ opacity: { duration: 0.15 } }}
            style={{
              left: hoverPreview ? hoverPreview.left : 0,
              width: hoverPreview ? hoverPreview.width : 0,
            }}
          />

          {variant === 'pips' && (
            <motion.div
              className="absolute inset-0 flex justify-between items-center px-3 pointer-events-none z-[1]"
              style={{ WebkitMaskImage: pipsMaskStyle, maskImage: pipsMaskStyle }}
            >
              {pipSteps.map(pipValue => {
                const isActivePip = pipValue === value
                return (
                  <div
                    key={pipValue}
                    className="relative flex items-center justify-center"
                    style={{ width: PIP_SIZE, height: PIP_SIZE }}
                  >
                    <motion.div
                      className="rounded-full"
                      initial={false}
                      animate={{
                        backgroundColor: isActivePip ? 'var(--foreground)' : 'var(--muted-foreground)',
                        opacity: isActivePip ? 1 : 0.3,
                      }}
                      transition={spring.fast}
                      style={{ width: PIP_SIZE, height: PIP_SIZE }}
                    />
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* Masks the pips behind the label and value. */}
          {variant === 'pips' && (
            <div className="absolute inset-0 flex items-center px-2 z-[2] pointer-events-none" aria-hidden>
              {label && <span className="text-body px-2 bg-background text-transparent select-none">{label}</span>}
              <span
                className="text-body tabular-nums ml-auto px-2 bg-background text-transparent select-none"
                style={{ minWidth: `${String(formatValue(max)).length}ch` }}
              >
                {formatValue(value)}
              </span>
            </div>
          )}

          {variant === 'pips' && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 bg-active pointer-events-none z-[3]"
              style={{
                width: pipsFillWidthStyle,
              }}
            />
          )}

          {variant === 'pips' && (
            <motion.div
              className="absolute rounded-full pointer-events-none z-[3]"
              initial={false}
              animate={{
                top: isActive ? 7 : 8,
                bottom: isActive ? 7 : 8,
                backgroundColor: isFocused
                  ? 'var(--foreground)'
                  : isHovered
                    ? 'color-mix(in srgb, var(--foreground) 50%, transparent)'
                    : 'color-mix(in srgb, var(--foreground) 25%, transparent)',
              }}
              transition={spring.fast}
              style={{
                left: pipsHandleLineLeftStyle,
                width: 2,
              }}
            />
          )}

          {variant === 'pips' && (
            <div className="absolute inset-0 flex items-center px-2 z-[4] pointer-events-none">
              {label && (
                <motion.span
                  className="text-body px-2"
                  initial={false}
                  animate={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                  transition={spring.fast}
                >
                  {label}
                </motion.span>
              )}
              <motion.span
                className="text-body tabular-nums ml-auto px-2"
                initial={false}
                animate={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                transition={spring.fast}
                style={{ minWidth: `${String(formatValue(max)).length}ch`, textAlign: 'right' }}
              >
                {formatValue(value)}
              </motion.span>
            </div>
          )}

          {variant === 'scrubber' && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 bg-active pointer-events-none"
              style={{
                width: fillWidthStyle,
              }}
            />
          )}

          {variant === 'scrubber' && (
            <motion.div
              className="absolute rounded-full pointer-events-none z-10"
              initial={false}
              animate={{
                top: isActive ? 7 : 8,
                bottom: isActive ? 7 : 8,
                backgroundColor: isFocused
                  ? 'var(--foreground)'
                  : isHovered
                    ? 'color-mix(in srgb, var(--foreground) 50%, transparent)'
                    : 'color-mix(in srgb, var(--foreground) 25%, transparent)',
              }}
              transition={spring.fast}
              style={{
                left: handleLineLeftStyle,
                width: 2,
              }}
            />
          )}

          {variant === 'scrubber' && label && (
            <motion.span
              className="text-body shrink-0 z-10"
              initial={false}
              animate={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
              transition={spring.fast}
            >
              {label}
            </motion.span>
          )}

          {variant === 'scrubber' && (
            <>
              <div className="flex-1" />
              <motion.span
                className="text-body shrink-0 tabular-nums text-right z-10"
                initial={false}
                animate={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                transition={spring.fast}
                style={{ minWidth: `${String(formatValue(max)).length}ch` }}
              >
                {formatValue(value)}
              </motion.span>
            </>
          )}

          {variant === 'scrubber' && (
            <motion.div
              className="absolute top-0 bottom-0 w-2 cursor-ew-resize z-20"
              style={{ left: handleLeftStyle }}
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
            />
          )}
        </motion.div>
      </div>
    )
  },
)

ComfortableSlider.displayName = 'ComfortableSlider'

export type { ComfortableSliderProps }
export { ComfortableSlider }
