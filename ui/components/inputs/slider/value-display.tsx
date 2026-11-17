// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the Slider port (Fluid Functionalism `registry/base/slider.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { type MotionValue, motion, useTransform } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useShape } from '../../../lib/shape-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { snapValue, THUMB_SIZE } from './geometry'

/** The inverted value chip of the tooltips. */
export function ValueBubble({ children }: { children: ReactNode }) {
  const shape = useShape()
  return (
    <span
      className={cn(
        'text-caption text-background tabular-nums whitespace-nowrap bg-foreground px-2 py-1',
        shape.bg,
        'weight-medium',
      )}
    >
      {children}
    </span>
  )
}

interface ValueDisplayProps {
  values: number[]
  editingIndex: number | null
  onStartEdit: (index: number) => void
  onCommitEdit: (index: number, v: number) => void
  onCancelEdit: () => void
  min: number
  max: number
  step: number
  stepValues: number[] | null
  formatValue: (v: number) => string
  label?: string
  isRange: boolean
  isInteracting: boolean
}

export function ValueDisplay({
  values,
  editingIndex,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  min,
  max,
  step,
  stepValues,
  formatValue,
  label,
  isRange,
  isInteracting,
}: ValueDisplayProps) {
  const shape = useShape()
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingIndex !== null) {
      setInputValue(String(values[editingIndex]))
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editingIndex])

  const commitEdit = useCallback(
    (index: number) => {
      const parsed = parseFloat(inputValue)
      if (!isNaN(parsed)) {
        onCommitEdit(index, snapValue(parsed, min, max, step, stepValues))
      } else {
        onCancelEdit()
      }
    },
    [inputValue, min, max, step, stepValues, onCommitEdit, onCancelEdit],
  )

  const renderValue = (index: number) => {
    if (editingIndex === index) {
      return (
        <span className="inline-grid text-body">
          {/* Reserves the widest value, so editing doesn't reflow. */}
          <span className="col-start-1 row-start-1 invisible weight-medium" aria-hidden="true">
            {label ? `${label}: ` : ''}
            {formatValue(max)}
          </span>
          <span className="col-start-1 row-start-1 flex items-center gap-1">
            {label && <span className="text-muted-foreground">{label}:</span>}
            <input
              ref={inputRef}
              type="number"
              value={inputValue}
              min={min}
              max={max}
              step={stepValues ? 'any' : step}
              onChange={e => setInputValue(e.target.value)}
              onBlur={() => commitEdit(index)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit(index)
                if (e.key === 'Escape') onCancelEdit()
              }}
              aria-label={`Edit slider value${isRange ? (index === 0 ? ' (start)' : ' (end)') : ''}`}
              className={cn(
                'w-[5ch] bg-transparent text-foreground outline-none border-b border-border text-center',
                shape.input,
                'weight-medium',
              )}
            />
          </span>
        </span>
      )
    }

    return (
      <span className="cursor-text select-none" onClick={() => onStartEdit(index)}>
        {formatValue(values[index]!)}
      </span>
    )
  }

  const widestValue = isRange
    ? `${label ? `${label}: ` : ''}${formatValue(max)} — ${formatValue(max)}`
    : `${label ? `${label}: ` : ''}${formatValue(max)}`

  return (
    <span
      className={cn(
        'inline-grid shrink-0 text-body leading-none text-muted-foreground transition-[font-variation-settings] duration-100',
        'tabular-nums',
        isInteracting ? 'weight-medium' : 'weight-normal',
      )}
    >
      {/* Reserves the widest value. */}
      <span className="col-start-1 row-start-1 invisible whitespace-nowrap weight-medium" aria-hidden="true">
        {widestValue}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap">
        {label && editingIndex === null && <span className="text-muted-foreground">{label}: </span>}
        {isRange ? (
          <>
            {renderValue(0)}
            <span className="mx-1 text-muted-foreground/50">—</span>
            {renderValue(1)}
          </>
        ) : (
          renderValue(0)
        )}
      </span>
    </span>
  )
}

interface TooltipValueProps {
  value: number
  formatValue: (v: number) => string
  motionX: MotionValue<number>
  vertical?: boolean
}

export function TooltipValue({ value, formatValue, motionX, vertical = false }: TooltipValueProps) {
  const tooltipX = useTransform(motionX, x => x + THUMB_SIZE / 2)
  const tooltipY = useTransform(motionX, x => -x)
  return (
    <motion.div
      className={cn('absolute pointer-events-none z-20', vertical ? 'translate-y-1/2' : '-translate-x-1/2')}
      style={
        vertical
          ? { y: tooltipY, bottom: THUMB_SIZE / 2, left: `calc(50% + ${THUMB_SIZE}px)` }
          : { x: tooltipX, top: -16 }
      }
      initial={vertical ? { opacity: 0, x: -4 } : { opacity: 0, y: 4 }}
      animate={vertical ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
      exit={
        vertical
          ? { opacity: 0, x: -4, transition: spring.fast.exit }
          : { opacity: 0, y: 4, transition: spring.fast.exit }
      }
      transition={spring.fast}
    >
      <ValueBubble>{formatValue(value)}</ValueBubble>
    </motion.div>
  )
}
