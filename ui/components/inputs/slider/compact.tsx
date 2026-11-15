// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the Slider port (Fluid Functionalism `registry/base/slider.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { AnimatePresence, animate, type MotionValue, motion, useMotionValue, useTransform } from 'motion/react'
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import {
  DOT_SIZE,
  layoutX,
  nearestStepIndex,
  pixelToValue,
  type SliderValue,
  snapValue,
  THUMB_SIZE,
  THUMB_SIZE_REST,
  TRACK_BG_HEIGHT,
  TRACK_INSET,
  toRadixValue,
  useDelayedFlag,
  type ValuePosition,
  valueToPixel,
} from './geometry'
import { TooltipValue, ValueBubble, ValueDisplay } from './value-display'

/** The compact engine's props: the dense design (ranges, step lists, value display). */
interface SliderEngineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value: SliderValue
  onValueChange: (value: SliderValue) => void
  min?: number
  max?: number
  step?: number
  /**
   * Discrete list of allowed values, e.g. [0.1, 0.5, 0.7, 1.1, 1.3].
   *
   * When set, the thumb snaps only to these values (positioned proportionally
   * along the track) and arrow keys walk the list. `min`/`max` derive from the
   * list's extremes and `step` is ignored.
   */
  steps?: number[]
  showSteps?: boolean
  showValue?: boolean
  valuePosition?: ValuePosition
  formatValue?: (v: number) => string
  label?: string
  disabled?: boolean
  name?: string
  trackClassName?: string
  trackStyle?: CSSProperties
  fillClassName?: string
  fillStyle?: CSSProperties
  hideFill?: boolean
  thumbColor?: string
  thumbBorderColor?: string
}

const CompactSlider = forwardRef<HTMLDivElement, SliderEngineProps>(
  (
    {
      value,
      onValueChange,
      min: minProp = 0,
      max: maxProp = 100,
      step = 1,
      steps,
      showSteps = false,
      showValue = true,
      valuePosition = 'left',
      formatValue = String,
      label,
      disabled = false,
      name,
      trackClassName,
      trackStyle,
      fillClassName,
      fillStyle,
      hideFill = false,
      thumbColor,
      thumbBorderColor,
      className,
      ...props
    },
    ref,
  ) => {
    const isRange = Array.isArray(value)
    const values = toRadixValue(value)

    // Non-uniform step mode: sorted, deduped list of allowed values. Keyed on
    // the joined string so inline array literals don't recompute every render.
    const stepsKey = steps ? steps.join(',') : ''
    const stepValues = useMemo(() => {
      if (!stepsKey) return null
      const parsed = Array.from(new Set(stepsKey.split(',').map(Number))).sort((a, b) => a - b)
      return parsed.length > 1 ? parsed : null
    }, [stepsKey])
    const min = stepValues ? stepValues[0]! : minProp
    const max = stepValues ? stepValues[stepValues.length - 1]! : maxProp

    const trackRef = useRef<HTMLDivElement>(null)
    const trackWidthRef = useRef(0)
    const dragging = useRef(false)
    const activeDragThumb = useRef<number>(0)
    const valuesRef = useRef(values)
    const minRef = useRef(min)
    const maxRef = useRef(max)
    valuesRef.current = values
    minRef.current = min
    maxRef.current = max

    const [isHovered, setIsHovered] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [hoverPreview, setHoverPreview] = useState<{
      left: number
      width: number
      snappedValue: number
      cursorX: number
    } | null>(null)
    const [focusedThumb, setFocusedThumb] = useState<number | null>(null)
    const showHoverTooltip = useDelayedFlag(isHovered, 100)

    const motionX0 = useMotionValue(0)
    const motionX1 = useMotionValue(0)

    const fillLeft = useTransform(motionX0, x => (isRange ? x + THUMB_SIZE / 2 - TRACK_INSET : 0))
    const fillWidthSingle = useTransform(motionX0, x => x + THUMB_SIZE / 2 - TRACK_INSET)
    const fillWidthRange = useTransform(
      [motionX0, motionX1] as MotionValue<number>[],
      ([x0, x1]) => (x1 as number) - (x0 as number),
    )
    const fillWidth = isRange ? fillWidthRange : fillWidthSingle

    // Hides the dots on the filled side, like the comfortable design's pips.
    const stepDotsMaskSingle = useTransform(motionX0, x => {
      const edge = x + THUMB_SIZE / 2
      return `linear-gradient(to right, transparent ${edge}px, black ${edge + 2}px)`
    })
    const stepDotsMaskRange = useTransform([motionX0, motionX1] as MotionValue<number>[], ([x0, x1]) => {
      const left = (x0 as number) + THUMB_SIZE / 2
      const right = (x1 as number) + THUMB_SIZE / 2
      return `linear-gradient(to right, black ${left - 2}px, transparent ${left}px, transparent ${right}px, black ${right + 2}px)`
    })
    const stepDotsMask = isRange ? stepDotsMaskRange : stepDotsMaskSingle

    const computeHoverPreview = useCallback(
      (cursorX: number, trackWidth: number) => {
        const usable = trackWidth - THUMB_SIZE
        const rawPx = cursorX - THUMB_SIZE / 2
        const clampedPx = Math.max(0, Math.min(usable, rawPx))
        const rawVal = usable > 0 ? (clampedPx / usable) * (max - min) + min : min
        const snappedVal = snapValue(rawVal, min, max, step, stepValues)
        const snappedPercent = max === min ? 0 : (snappedVal - min) / (max - min)
        const snappedX = THUMB_SIZE / 2 + snappedPercent * usable

        const c0 = motionX0.get() + THUMB_SIZE / 2
        const c1 = motionX1.get() + THUMB_SIZE / 2
        const nearestIdx = isRange ? (Math.abs(snappedX - c0) <= Math.abs(snappedX - c1) ? 0 : 1) : 0
        const nearest = nearestIdx === 0 ? c0 : c1

        // At the extremes the bar reaches the track's edge, leaving no gap.
        const edgeX = snappedVal === min ? 0 : snappedVal === max ? trackWidth : snappedX
        const left = Math.min(nearest, edgeX)
        const width = Math.abs(edgeX - nearest)
        setHoverPreview({ left, width, snappedValue: snappedVal, cursorX: snappedX })
      },
      [min, max, step, stepValues, isRange, motionX0, motionX1],
    )

    const initialSyncDone = useRef(false)
    const [ready, setReady] = useState(false)
    useLayoutEffect(() => {
      const el = trackRef.current
      if (!el || initialSyncDone.current) return
      const w = el.offsetWidth
      trackWidthRef.current = w
      const px0 = valueToPixel(values[0]!, min, max, w)
      motionX0.set(px0)
      if (isRange && values[1] !== undefined) {
        const px1 = valueToPixel(values[1]!, min, max, w)
        motionX1.set(px1)
      }
      initialSyncDone.current = true
      setReady(true)
    }, [])

    useEffect(() => {
      const el = trackRef.current
      if (!el) return
      const ro = new ResizeObserver(([entry]) => {
        const w = entry!.contentRect.width
        trackWidthRef.current = w
        if (!dragging.current && initialSyncDone.current) {
          const v = valuesRef.current
          const mn = minRef.current
          const mx = maxRef.current
          const px0 = valueToPixel(v[0]!, mn, mx, w)
          animate(motionX0, px0, spring.moderate)
          if (isRange && v[1] !== undefined) {
            const px1 = valueToPixel(v[1]!, mn, mx, w)
            animate(motionX1, px1, spring.moderate)
          }
        }
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [isRange, motionX0, motionX1])

    // Depend on a primitive key rather than the `values` array — its identity
    // changes every render (toRadixValue allocates), which would restart the
    // animation on unrelated re-renders (hover/tooltip state churn).
    const valuesKey = values.join(',')
    useEffect(() => {
      if (!initialSyncDone.current) return
      if (dragging.current) return
      const tw = trackWidthRef.current
      if (tw <= 0) return
      const v = valuesRef.current
      const px0 = valueToPixel(v[0]!, min, max, tw)
      animate(motionX0, px0, spring.moderate)
      if (isRange && v[1] !== undefined) {
        const px1 = valueToPixel(v[1]!, min, max, tw)
        animate(motionX1, px1, spring.moderate)
      }
    }, [valuesKey, min, max, isRange, motionX0, motionX1])

    const clampForRange = useCallback(
      (px: number, thumbIndex: number): number => {
        if (!isRange) return px
        if (thumbIndex === 0) {
          return Math.min(px, motionX1.get() - THUMB_SIZE * 0.5)
        }
        return Math.max(px, motionX0.get() + THUMB_SIZE * 0.5)
      },
      [isRange, motionX0, motionX1],
    )

    const emitChange = useCallback(
      (thumbIndex: number, newValue: number) => {
        if (isRange) {
          const newValues: [number, number] = [...(values as [number, number])]
          newValues[thumbIndex] = newValue
          onValueChange(newValues)
        } else {
          onValueChange(newValue)
        }
      },
      [isRange, values, onValueChange],
    )

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()

        const trackEl = trackRef.current
        if (!trackEl) return
        const x = layoutX(e.clientX, trackEl)
        if (x === null) return
        const layoutWidth = trackEl.offsetWidth
        const clamped = Math.max(0, Math.min(layoutWidth - THUMB_SIZE, x - THUMB_SIZE / 2))

        if (isRange) {
          const dist0 = Math.abs(clamped - motionX0.get())
          const dist1 = Math.abs(clamped - motionX1.get())
          activeDragThumb.current = dist0 <= dist1 ? 0 : 1
        } else {
          activeDragThumb.current = 0
        }

        dragging.current = true
        setIsPressed(true)

        const motionX = activeDragThumb.current === 0 ? motionX0 : motionX1

        const snappedValue = pixelToValue(clamped, min, max, step, layoutWidth, stepValues)
        const snappedPx = valueToPixel(snappedValue, min, max, layoutWidth)

        const finalPx = clampForRange(snappedPx, activeDragThumb.current)
        animate(motionX, finalPx, spring.moderate)

        const finalValue = pixelToValue(finalPx, min, max, step, layoutWidth, stepValues)
        emitChange(activeDragThumb.current, finalValue)

        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      },
      [disabled, isRange, min, max, step, stepValues, motionX0, motionX1, clampForRange, emitChange],
    )

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return
        e.stopPropagation()
        const trackEl = trackRef.current
        if (!trackEl) return
        const x = layoutX(e.clientX, trackEl)
        if (x === null) return
        const layoutWidth = trackEl.offsetWidth
        const clamped = Math.max(0, Math.min(layoutWidth - THUMB_SIZE, x - THUMB_SIZE / 2))

        const motionX = activeDragThumb.current === 0 ? motionX0 : motionX1

        const snappedValue = pixelToValue(clamped, min, max, step, layoutWidth, stepValues)
        const snappedPx = valueToPixel(snappedValue, min, max, layoutWidth)
        const finalPx = clampForRange(snappedPx, activeDragThumb.current)
        motionX.set(finalPx)

        const finalValue = pixelToValue(finalPx, min, max, step, layoutWidth, stepValues)
        emitChange(activeDragThumb.current, finalValue)
      },
      [min, max, step, stepValues, motionX0, motionX1, clampForRange, emitChange],
    )

    const handlePointerUp = useCallback(() => {
      if (!dragging.current) return
      dragging.current = false
      setIsPressed(false)
      setHoverPreview(null)

      const tw = trackWidthRef.current
      const motionX = activeDragThumb.current === 0 ? motionX0 : motionX1
      const currentPx = motionX.get()
      const snapped = pixelToValue(currentPx, min, max, step, tw, stepValues)
      const snappedPx = valueToPixel(snapped, min, max, tw)
      animate(motionX, snappedPx, spring.moderate)
    }, [min, max, step, stepValues, motionX0, motionX1])

    // In steps mode the primitive runs on indices (0..len-1, step 1) so arrow
    // keys walk the list; map indices back to actual values on the way out.
    const handleRadixChange = useCallback(
      (newValues: number[]) => {
        if (dragging.current) return
        const mapped = stepValues ? newValues.map(i => stepValues[Math.round(i)]!) : newValues
        if (isRange) {
          onValueChange(mapped as [number, number])
        } else {
          onValueChange(mapped[0]!)
        }
      },
      [isRange, onValueChange, stepValues],
    )

    const handleStartEdit = useCallback((index: number) => {
      setEditingIndex(index)
    }, [])

    const handleCommitEdit = useCallback(
      (index: number, v: number) => {
        emitChange(index, v)
        setEditingIndex(null)
      },
      [emitChange],
    )

    const handleCancelEdit = useCallback(() => {
      setEditingIndex(null)
    }, [])

    const stepDots = useMemo(
      () =>
        showSteps
          ? stepValues
            ? stepValues.map(v => ({
                value: v,
                percent: max === min ? 0 : (v - min) / (max - min),
              }))
            : Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => {
                const v = min + i * step
                const percent = (v - min) / (max - min)
                return { value: v, percent }
              })
          : [],
      [showSteps, min, max, step, stepValues],
    )

    const isInteracting = isHovered || isPressed

    // aria-label on Root lands on a role-less div and never reaches the
    // thumb's input, so each Thumb gets its own label.
    const thumbAriaLabel = (index: number): string | undefined => {
      if (!isRange) return label
      if (!label) return index === 0 ? 'Minimum' : 'Maximum'
      return index === 0 ? `${label} minimum` : `${label} maximum`
    }

    const valueDisplay = showValue && valuePosition !== 'tooltip' && (
      <ValueDisplay
        values={values}
        editingIndex={editingIndex}
        onStartEdit={handleStartEdit}
        onCommitEdit={handleCommitEdit}
        onCancelEdit={handleCancelEdit}
        min={min}
        max={max}
        step={step}
        stepValues={stepValues}
        formatValue={formatValue}
        label={label}
        isRange={isRange}
        isInteracting={isInteracting}
      />
    )

    const renderVisualThumb = (index: number) => {
      const motionX = index === 0 ? motionX0 : motionX1
      return (
        <motion.span
          key={`visual-thumb-${index}`}
          className="flex items-center justify-center pointer-events-none"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginTop: -THUMB_SIZE / 2,
            x: motionX,
            position: 'absolute',
            top: '50%',
            left: 0,
            zIndex: 10,
          }}
          initial={false}
        >
          <motion.span
            className={cn('block rounded-full shadow-thumb', !thumbColor && 'bg-thumb')}
            initial={false}
            animate={{
              width: THUMB_SIZE_REST,
              height: THUMB_SIZE_REST,
            }}
            transition={spring.fast}
            style={{
              backgroundColor: thumbColor,
              border: thumbBorderColor ? `1px solid ${thumbBorderColor}` : undefined,
            }}
          />
          <motion.span
            className="absolute rounded-full border border-focus-ring pointer-events-none"
            initial={false}
            animate={{
              opacity: focusedThumb === index ? 1 : 0,
              width: THUMB_SIZE + 4,
              height: THUMB_SIZE + 4,
            }}
            transition={spring.fast}
          />
        </motion.span>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-0 w-full select-none touch-none overflow-visible',
          valuePosition === 'left' || valuePosition === 'right' ? 'flex-row items-center gap-2 mb-2' : 'flex-col',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
        {...props}
      >
        {(valuePosition === 'top' || valuePosition === 'left') && valueDisplay}

        <div
          className="relative flex-1 overflow-visible"
          style={{
            height:
              valuePosition === 'left' || valuePosition === 'right'
                ? THUMB_SIZE + 16
                : THUMB_SIZE + (valuePosition === 'tooltip' ? 16 : 0),
            paddingTop: valuePosition === 'tooltip' ? 16 : 0,
          }}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => {
            setIsHovered(false)
            setHoverPreview(null)
          }}
          onMouseMove={e => {
            if (dragging.current) return
            const trackEl = trackRef.current
            if (!trackEl) return
            const x = layoutX(e.clientX, trackEl)
            if (x === null) return
            computeHoverPreview(Math.max(0, Math.min(trackEl.offsetWidth, x)), trackEl.offsetWidth)
          }}
        >
          {showValue && valuePosition === 'tooltip' && (
            <AnimatePresence>
              {isInteracting && (
                <TooltipValue key="tooltip-0" value={values[0]!} formatValue={formatValue} motionX={motionX0} />
              )}
              {isInteracting && isRange && values[1] !== undefined && (
                <TooltipValue key="tooltip-1" value={values[1]} formatValue={formatValue} motionX={motionX1} />
              )}
            </AnimatePresence>
          )}

          {/* Invisible: the roles and arrow keys. */}
          <SliderPrimitive.Root
            value={stepValues ? values.map(v => nearestStepIndex(v, stepValues)) : values}
            onValueChange={v => handleRadixChange(v as number[])}
            name={name}
            min={stepValues ? 0 : min}
            max={stepValues ? stepValues.length - 1 : max}
            step={stepValues ? 1 : step}
            disabled={disabled}
            className="absolute inset-0 opacity-0 pointer-events-none"
            style={{ height: THUMB_SIZE }}
          >
            <SliderPrimitive.Control className="w-full h-full">
              <SliderPrimitive.Track className="w-full h-full">
                <SliderPrimitive.Indicator />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb
                index={0}
                aria-label={thumbAriaLabel(0)}
                getAriaValueText={stepValues ? () => formatValue(values[0]!) : undefined}
                className="block outline-none"
                style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                onFocus={e => {
                  if ((e.currentTarget as HTMLElement).matches(':focus-visible')) setFocusedThumb(0)
                }}
                onBlur={() => setFocusedThumb(prev => (prev === 0 ? null : prev))}
              />
              {isRange && (
                <SliderPrimitive.Thumb
                  index={1}
                  aria-label={thumbAriaLabel(1)}
                  getAriaValueText={stepValues ? () => formatValue(values[1]!) : undefined}
                  className="block outline-none"
                  style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                  onFocus={e => {
                    if ((e.currentTarget as HTMLElement).matches(':focus-visible')) setFocusedThumb(1)
                  }}
                  onBlur={() => setFocusedThumb(prev => (prev === 1 ? null : prev))}
                />
              )}
            </SliderPrimitive.Control>
          </SliderPrimitive.Root>

          <div
            ref={trackRef}
            className="relative w-full cursor-ew-resize py-2"
            style={{ height: THUMB_SIZE + 16, opacity: ready ? 1 : 0 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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
            <AnimatePresence>
              {hoverPreview && showHoverTooltip && !isPressed && valuePosition !== 'tooltip' && (
                <motion.div
                  key="hover-tooltip"
                  className="absolute -translate-x-1/2 pointer-events-none z-20"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4, transition: spring.fast.exit }}
                  transition={spring.fast}
                  style={{
                    left: hoverPreview.cursorX,
                    top: -20,
                  }}
                >
                  <ValueBubble>{formatValue(hoverPreview.snappedValue)}</ValueBubble>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className={cn(
                'absolute bg-transparent border border-border overflow-hidden rounded-full',
                trackClassName,
              )}
              initial={false}
              animate={{
                height: TRACK_BG_HEIGHT,
                top: 8 + (THUMB_SIZE - TRACK_BG_HEIGHT) / 2,
              }}
              transition={spring.fast}
              style={{
                left: TRACK_INSET,
                right: TRACK_INSET,
                ...trackStyle,
              }}
            >
              {!hideFill && (
                <motion.div
                  className={cn('absolute h-full bg-selected/50 dark:bg-accent/40', fillClassName)}
                  style={{
                    left: fillLeft,
                    width: fillWidth,
                    ...fillStyle,
                  }}
                />
              )}

              <motion.div
                className="absolute h-full bg-accent/40 pointer-events-none z-[2]"
                initial={false}
                animate={{
                  opacity: hoverPreview && !isPressed ? 1 : 0,
                }}
                transition={{
                  opacity: { duration: 0.15 },
                }}
                style={{
                  left: hoverPreview ? hoverPreview.left - TRACK_INSET : 0,
                  width: hoverPreview ? hoverPreview.width : 0,
                  borderRadius:
                    hoverPreview && hoverPreview.cursorX > hoverPreview.left
                      ? '0 9999px 9999px 0'
                      : '9999px 0 0 9999px',
                }}
              />
            </motion.div>

            {stepDots.length > 0 && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: 8 + (THUMB_SIZE - TRACK_BG_HEIGHT) / 2,
                  height: TRACK_BG_HEIGHT,
                  WebkitMaskImage: stepDotsMask,
                  maskImage: stepDotsMask,
                }}
              >
                {stepDots.map(({ value: v, percent }) => (
                  <div
                    key={v}
                    className="absolute pointer-events-none flex items-center justify-center"
                    style={{
                      left: `calc(${THUMB_SIZE / 2}px + ${percent} * (100% - ${THUMB_SIZE}px))`,
                      top: '50%',
                      width: 0,
                      height: 0,
                    }}
                  >
                    <motion.div
                      className="rounded-full flex-shrink-0 bg-muted-foreground opacity-30"
                      initial={false}
                      animate={{
                        width: isHovered ? DOT_SIZE * 1.25 : DOT_SIZE,
                        height: isHovered ? DOT_SIZE * 1.25 : DOT_SIZE,
                      }}
                      transition={spring.moderate}
                    />
                  </div>
                ))}
              </motion.div>
            )}

            {renderVisualThumb(0)}
            {isRange && renderVisualThumb(1)}
          </div>
        </div>

        {(valuePosition === 'bottom' || valuePosition === 'right') && valueDisplay}
      </div>
    )
  },
)

CompactSlider.displayName = 'CompactSlider'

export type { SliderEngineProps }
export { CompactSlider }
