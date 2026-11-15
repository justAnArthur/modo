// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { NumberField } from '@base-ui/react/number-field'
import { forwardRef, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mergeRefs } from '../../../lib/merge-refs'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { Tooltip } from '../../overlays/tooltip'

interface ColorInputProps {
  value: string
  onCommit: (next: string) => void
  ariaLabel: string
  width?: string
  className?: string
  inputClassName?: string
  align?: 'left' | 'center' | 'right'
  prefix?: ReactNode
  inputMode?: 'numeric' | 'decimal' | 'text'
  nudgeStep?: number
  nudgeShiftStep?: number
  hasPercent?: boolean
  decimals?: number
  scrubbable?: boolean
  min?: number
  max?: number
  /** When true with min and max, wrap (modulo) instead of clamping. Used for angular values like hue. */
  wrap?: boolean
}

const TextColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  (
    {
      value,
      onCommit,
      ariaLabel,
      width,
      className,
      inputClassName,
      align = 'left',
      prefix,
      inputMode = 'text',
      nudgeStep,
      nudgeShiftStep,
      hasPercent = false,
      decimals,
      min,
      max,
      wrap = false,
    },
    ref,
  ) => {
    const [draft, setDraft] = useState(value)
    const interactingRef = useRef(false)
    const shape = useShape()
    const sizeClasses = useSize()
    const compact = sizeClasses.variant === 'compact'

    useEffect(() => {
      if (!interactingRef.current) setDraft(value)
    }, [value])

    const formatNumber = (n: number) => (decimals != null ? n.toFixed(decimals) : String(Math.round(n)))

    const commitNumber = (n: number) => {
      let bounded = n
      if (wrap && min != null && max != null) {
        const range = max - min
        bounded = ((((bounded - min) % range) + range) % range) + min
      } else {
        if (min != null) bounded = Math.max(min, bounded)
        if (max != null) bounded = Math.min(max, bounded)
      }
      const formatted = formatNumber(bounded)
      const withSuffix = hasPercent ? `${formatted}%` : formatted
      setDraft(withSuffix)
      onCommit(withSuffix)
    }

    const nudge = (direction: 1 | -1, shift: boolean) => {
      const baseStep = shift ? (nudgeShiftStep ?? 10) : (nudgeStep ?? 1)
      const cur = parseFloat(draft.replace('%', ''))
      if (Number.isNaN(cur)) return
      commitNumber(cur + direction * baseStep)
    }

    return (
      <div
        className={cn(
          'flex items-center px-2 bg-transparent hover:bg-hover active:bg-active transition-colors duration-fast focus-within:ring-1 focus-within:ring-focus-ring select-none',
          sizeClasses.control,
          shape.input,
          className,
        )}
        style={{ width }}
      >
        {prefix && (
          <span
            className={cn('text-muted-foreground mr-1 select-none', compact ? 'text-caption-compact' : 'text-caption')}
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={e => {
            interactingRef.current = true
            e.currentTarget.select()
          }}
          onBlur={() => {
            interactingRef.current = false
            if (draft !== value) {
              const numeric = parseFloat(draft.replace('%', ''))
              if (!Number.isNaN(numeric) && (min != null || max != null)) {
                commitNumber(numeric)
              } else {
                onCommit(draft)
              }
            } else setDraft(value)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              ;(e.currentTarget as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              setDraft(value)
              ;(e.currentTarget as HTMLInputElement).blur()
            } else if (
              (nudgeStep != null || nudgeShiftStep != null) &&
              (e.key === 'ArrowUp' || e.key === 'ArrowDown')
            ) {
              e.preventDefault()
              nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey)
            }
          }}
          inputMode={inputMode}
          aria-label={ariaLabel}
          className={cn(
            'flex-1 min-w-0 bg-transparent text-foreground outline-none tabular-nums',
            sizeClasses.text,
            align === 'center' && 'text-center',
            align === 'right' && 'text-right',
            'weight-medium',
            inputClassName,
          )}
        />
      </div>
    )
  },
)

TextColorInput.displayName = 'TextColorInput'

const ScrubColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  (
    {
      value,
      onCommit,
      ariaLabel,
      width,
      className,
      inputClassName,
      align = 'left',
      prefix,
      inputMode = 'numeric',
      nudgeStep,
      nudgeShiftStep,
      hasPercent = false,
      decimals,
      min,
      max,
      wrap = false,
    },
    ref,
  ) => {
    const shape = useShape()
    const sizeClasses = useSize()
    const compact = sizeClasses.variant === 'compact'
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [editing, setEditing] = useState(false)
    // Set on pointerdown (capture, before Base UI focuses the input to scrub),
    // so onFocus can tell a scrub from keyboard focus.
    const pointerDownRef = useRef(false)

    const numeric = parseFloat(String(value).replace('%', ''))
    const fieldValue = Number.isNaN(numeric) ? null : numeric

    const format = useMemo(() => {
      const f: Intl.NumberFormatOptions = { useGrouping: false }
      if (decimals != null) {
        f.minimumFractionDigits = decimals
        f.maximumFractionDigits = decimals
      } else {
        f.maximumFractionDigits = 0
      }
      if (hasPercent) {
        // style "unit" + unit "percent" renders "50%" while keeping the
        // numeric value on the 0..100 scale (unlike style "percent").
        f.style = 'unit'
        f.unit = 'percent'
      }
      return f
    }, [decimals, hasPercent])

    const commit = useCallback(
      (n: number) => {
        let bounded = n
        if (wrap && min != null && max != null) {
          // NumberField doesn't wrap: 361 → 1, -1 → 359, `max` itself stays.
          if (bounded < min || bounded > max) {
            const range = max - min
            bounded = ((((bounded - min) % range) + range) % range) + min
          }
        } else {
          if (min != null) bounded = Math.max(min, bounded)
          if (max != null) bounded = Math.min(max, bounded)
        }
        const formatted = decimals != null ? bounded.toFixed(decimals) : String(Math.round(bounded))
        onCommit(hasPercent ? `${formatted}%` : formatted)
      },
      [wrap, min, max, decimals, hasPercent, onCommit],
    )

    return (
      <NumberField.Root
        value={fieldValue}
        onValueChange={(next, eventDetails) => {
          if (next == null) return
          const reason = eventDetails.reason
          // Typing commits on blur; nudges, scrubbing and the wheel commit at once.
          if (reason === 'input-change' || reason === 'input-paste' || reason === 'input-clear') {
            return
          }
          commit(next)
        }}
        onValueCommitted={(_, eventDetails) => {
          // A scrub leaves focus in the input: drop it, so the field rests. A
          // press without a drag gets ScrubArea's synthetic click next, which edits.
          if (eventDetails.reason === 'scrub') {
            pointerDownRef.current = false
            inputRef.current?.blur()
          }
        }}
        min={wrap ? undefined : min}
        max={wrap ? undefined : max}
        step={nudgeStep ?? 1}
        largeStep={nudgeShiftStep ?? 10}
        format={format}
        className={cn(
          'flex items-center bg-transparent hover:bg-hover active:bg-active transition-colors duration-fast focus-within:ring-1 focus-within:ring-focus-ring select-none',
          sizeClasses.control,
          shape.input,
          className,
        )}
        style={{ width }}
      >
        <NumberField.ScrubArea
          direction="horizontal"
          pixelSensitivity={1}
          onPointerDownCapture={() => {
            pointerDownRef.current = true
          }}
          onClick={() => {
            // A click, or ScrubArea's synthetic one after a press without a drag, edits.
            pointerDownRef.current = false
            setEditing(true)
            inputRef.current?.focus()
            inputRef.current?.select()
          }}
          className={cn('flex flex-1 min-w-0 items-center self-stretch px-2', !editing && 'cursor-ew-resize')}
        >
          <NumberField.ScrubAreaCursor className="drop-shadow-picker-cursor">
            <svg
              width={24}
              height={14}
              viewBox="0 0 24 14"
              className="fill-picker-edge stroke-thumb"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path d="M0.5 7l5-5v3.5h13V2l5 5-5 5V8.5h-13V12l-5-5z" />
            </svg>
          </NumberField.ScrubAreaCursor>
          {prefix && (
            <span
              className={cn(
                'text-muted-foreground mr-1 select-none',
                compact ? 'text-caption-compact' : 'text-caption',
              )}
            >
              {prefix}
            </span>
          )}
          <NumberField.Input
            ref={mergeRefs(inputRef, ref)}
            aria-label={ariaLabel}
            inputMode={inputMode}
            onPointerDown={e => {
              // While editing, a press places the caret instead of scrubbing.
              if (editing) e.stopPropagation()
            }}
            onFocus={e => {
              if (pointerDownRef.current) return
              setEditing(true)
              e.currentTarget.select()
            }}
            onBlur={() => {
              setEditing(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              } else if (e.key === 'Escape') {
                // Restore the committed text before blurring, so the blur commits nothing.
                const input = e.currentTarget
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
                if (setter && fieldValue != null) {
                  const restored = decimals != null ? fieldValue.toFixed(decimals) : String(Math.round(fieldValue))
                  setter.call(input, hasPercent ? `${restored}%` : restored)
                  input.dispatchEvent(new Event('input', { bubbles: true }))
                }
                input.blur()
              }
            }}
            className={cn(
              'flex-1 min-w-0 bg-transparent text-foreground outline-none tabular-nums',
              sizeClasses.text,
              align === 'center' && 'text-center',
              align === 'right' && 'text-right',
              !editing && 'pointer-events-none',
              'weight-medium',
              inputClassName,
            )}
          />
        </NumberField.ScrubArea>
      </NumberField.Root>
    )
  },
)

ScrubColorInput.displayName = 'ScrubColorInput'

export const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(({ scrubbable = false, ...props }, ref) =>
  scrubbable ? <ScrubColorInput ref={ref} {...props} /> : <TextColorInput ref={ref} {...props} />,
)

ColorInput.displayName = 'ColorInput'

export function ChannelTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip content={label} delayDuration={300}>
      <div>{children}</div>
    </Tooltip>
  )
}

export function AlphaInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  return (
    <ChannelTooltip label="Alpha">
      <ColorInput
        value={`${value}%`}
        onCommit={input => {
          const n = parseFloat(input.replace('%', ''))
          if (Number.isNaN(n)) return
          onCommit(Math.max(0, Math.min(100, Math.round(n))))
        }}
        ariaLabel="Alpha"
        align="center"
        inputMode="numeric"
        nudgeStep={1}
        nudgeShiftStep={10}
        hasPercent
        scrubbable
        min={0}
        max={100}
      />
    </ChannelTooltip>
  )
}
