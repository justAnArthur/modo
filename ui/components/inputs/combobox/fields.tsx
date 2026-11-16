/*!
 * Part of the Fluid Functionalism combobox port (`registry/base/combobox.tsx`
 * @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b, MIT © 2026 Micka Touillaud,
 * notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { forwardRef, type InputHTMLAttributes, useCallback, useRef } from 'react'
import { useFieldBox } from '../../../lib/field-box'
import { type FieldVariant, fieldIconClasses } from '../../../lib/field-classes'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { useOverlay } from '../../../lib/overlay'
import { useShape } from '../../../lib/shape-context'
import type { SizeVariant } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { type ComboboxItemData, itemLabel, itemValue, useComboboxContext } from './context'

// The clear and chevron buttons sit inside the field's ring, so they need no frame.
const fieldButtonClass =
  'flex shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-fast hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[disabled]:pointer-events-none'
// The clear ✕ is a real icon button; the chevron beside it only decorates the field.
const clearButtonClass = cn(fieldButtonClass, 'hover:bg-hover active:bg-active transition-[color,background-color]')
// A chip's ✕ sits on the chip's own hover fill, so it steps up a notch.
const chipRemoveClass = cn(fieldButtonClass, 'rounded hover:bg-active')

export interface ComboboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'defaultValue' | 'onChange'> {
  /** Framed at rest, or invisible until hovered or focused. Defaults to `"bordered"`. */
  variant?: FieldVariant
  /** Leading icon inside the field. */
  icon?: IconComponent
  /** Shown while nothing is typed or selected. Defaults to `"Search…"`. */
  placeholder?: string
  /** Error message under the field; turns it destructive and sets `aria-invalid`. */
  error?: string
  /** Render a ✕ that clears the selection and query. Its slot is always reserved so the field never changes width. Defaults to `false`. */
  clearable?: boolean
  /** Size override for the field alone. Prefer the `size` prop on <Combobox> (or a surrounding SizeProvider) so the popup matches. */
  size?: SizeVariant
}

type ComboboxInputProps = ComboboxFieldProps
type ComboboxChipsProps = ComboboxFieldProps

/** The field box both fields build on, with the root's disabled state. */
function useComboboxField(variant: FieldVariant, error: string | undefined, size: SizeVariant | undefined) {
  const { disabled } = useComboboxContext()
  const field = useFieldBox({ variant, invalid: error ? true : undefined, disabled: disabled || undefined, size })
  return { ...field, compact: field.size.variant === 'compact' }
}

function FieldControls({ clearable, compact, iconSize }: { clearable: boolean; compact: boolean; iconSize: number }) {
  const XIcon = useIcon('x')
  const pill = useShape().variant === 'pill'
  return (
    <>
      {clearable && (
        // The primitive hides the button while there is nothing to clear; the slot stays.
        <span className={cn('flex shrink-0 items-center justify-center', compact ? 'size-5' : 'size-6')}>
          <ComboboxPrimitive.Clear
            aria-label="Clear"
            className={cn(clearButtonClass, pill && 'rounded-full', compact ? 'size-5' : 'size-6')}
          >
            <XIcon size={iconSize} strokeWidth={1.5} />
          </ComboboxPrimitive.Clear>
        </span>
      )}
      {/* Not a tab stop: the field itself opens on ArrowDown or typing. */}
      <ComboboxPrimitive.Trigger
        aria-label="Open"
        tabIndex={-1}
        className={cn(fieldButtonClass, compact ? 'size-5' : 'size-6')}
      >
        <svg
          aria-hidden
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-fast"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </ComboboxPrimitive.Trigger>
    </>
  )
}

export const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  (
    { className, variant = 'bordered', icon: Icon, placeholder = 'Search…', error, clearable = false, size, ...props },
    ref,
  ) => {
    const { size: sizeClasses, props: boxProps, invalid, compact } = useComboboxField(variant, error, size)
    const { anchorRef } = useComboboxContext()

    return (
      <div className="flex max-w-full flex-col gap-1">
        {/* The group is the anchor, so the list spans the whole field. */}
        <ComboboxPrimitive.InputGroup
          ref={anchorRef}
          {...boxProps}
          className={cn(
            boxProps.className,
            'flex items-center',
            sizeClasses.control,
            sizeClasses.gap,
            compact ? 'min-w-[128px]' : 'min-w-[160px]',
            className,
          )}
        >
          {Icon && <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />}
          <ComboboxPrimitive.Input
            ref={ref}
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            className={cn(
              'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
              sizeClasses.text,
              // The caret is as tall as the line box (Chrome, Safari).
              compact ? 'leading-5' : 'leading-6',
            )}
            {...props}
          />
          <FieldControls clearable={clearable} compact={compact} iconSize={sizeClasses.icon} />
        </ComboboxPrimitive.InputGroup>
        {error && <span className="text-caption text-destructive pl-3">{error}</span>}
      </div>
    )
  },
)

ComboboxInput.displayName = 'ComboboxInput'

/**
 * Springs the chips field's height to its chip rows (plus `padY`) as they
 * wrap. The field stays pinned at its old height through the reflow, or its
 * auto height would land before a spring could start. Measured layout, never
 * `height: "auto"`: motion resolves that from the transformed size, which
 * overshoots under a scaled ancestor.
 */
function useChipRowHeight(padY: number) {
  const height = useMotionValue<number | 'auto'>('auto')
  const roRef = useRef<ResizeObserver | null>(null)
  const padRef = useRef(padY)
  padRef.current = padY
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      roRef.current?.disconnect()
      roRef.current = null
      if (!el) return
      const measure = () => {
        if (el.offsetHeight <= 0) return
        const target = el.offsetHeight + padRef.current
        if (height.get() === 'auto') height.set(target)
        else if (height.get() !== target) animate(height, target, spring.fast)
      }
      measure()
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      roRef.current = ro
    },
    [height],
  )
  return { ref, height }
}

export const ComboboxChips = forwardRef<HTMLInputElement, ComboboxChipsProps>(
  (
    { className, variant = 'bordered', icon: Icon, placeholder = 'Search…', error, clearable = false, size, ...props },
    ref,
  ) => {
    const XIcon = useIcon('x')
    const shape = useShape()
    const { open } = useOverlay('Combobox.Chips')
    const { anchorRef, inputValue, values } = useComboboxContext()
    const { size: sizeClasses, props: boxProps, invalid, compact } = useComboboxField(variant, error, size)
    const rowHeight = useChipRowHeight(compact ? 8 : 12)

    return (
      <div className="flex max-w-full flex-col gap-1">
        <ComboboxPrimitive.Chips
          ref={anchorRef}
          render={<motion.div style={{ height: rowHeight.height }} />}
          // Chips stamps no state attributes of its own (InputGroup does).
          {...boxProps}
          data-popup-open={open || undefined}
          className={cn(
            boxProps.className,
            'flex items-center',
            // The spring owns the height; a CSS transition on it would drag behind every frame.
            'transition-[color,background-color,border-radius,box-shadow,opacity]',
            // Rows top-align so the icon and controls hold the first line; the
            // padding centers one 24px (20px compact) row in the ladder height.
            '!items-start',
            compact ? 'min-h-7 py-1' : 'min-h-9 py-1.5',
            sizeClasses.gap,
            compact ? 'min-w-[128px]' : 'min-w-[160px]',
            className,
          )}
        >
          {Icon && (
            <span className={cn('flex shrink-0 items-center', compact ? 'h-5' : 'h-6')}>
              <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />
            </span>
          )}
          <div
            ref={rowHeight.ref}
            className={cn(
              'relative flex min-w-0 flex-1 flex-wrap items-center gap-1',
              // A leading chip sits an even distance from every edge. On the row,
              // not the container's padding, so it snaps with the chip instead of easing.
              !Icon && values.length > 0 && '-ml-1',
            )}
          >
            <ComboboxPrimitive.Value>
              {(selected: ComboboxItemData[] | null) => (
                <>
                  {/* popLayout lifts an exiting chip out of the flow at once, so the field reflows immediately. */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {(selected ?? []).map(item => {
                      const label = itemLabel(item)
                      return (
                        <motion.span
                          key={itemValue(item)}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, pointerEvents: 'none', transition: spring.fast.exit }}
                          transition={spring.fast}
                          // Grows from the left edge, where the typed text just was.
                          style={{ originX: 0 }}
                          className="inline-flex max-w-full shrink-0"
                        >
                          <ComboboxPrimitive.Chip
                            aria-label={label}
                            className={cn(
                              'inline-flex max-w-full shrink-0 items-center gap-0.5 bg-hover pl-2 pr-0.5 text-foreground outline-none',
                              shape.variant === 'pill' ? 'rounded-full' : 'rounded-md',
                              'focus-visible:ring-1 focus-visible:ring-focus-ring',
                              compact ? 'h-5 text-caption-compact' : 'h-6 text-caption',
                            )}
                          >
                            <span className="truncate">{label}</span>
                            <ComboboxPrimitive.ChipRemove
                              aria-label={`Remove ${label}`}
                              className={cn(
                                chipRemoveClass,
                                shape.variant === 'pill' && 'rounded-full',
                                compact ? 'size-4' : 'size-5',
                              )}
                            >
                              <XIcon size={compact ? 10 : 12} strokeWidth={2} />
                            </ComboboxPrimitive.ChipRemove>
                          </ComboboxPrimitive.Chip>
                        </motion.span>
                      )
                    })}
                  </AnimatePresence>
                  {/* Sized to what is typed, so it stays beside the chips until the text no longer fits. It never animates. */}
                  <span className="flex min-w-6 flex-auto">
                    <ComboboxPrimitive.Input
                      ref={ref}
                      size={Math.max(1, inputValue.length + 1)}
                      placeholder={selected?.length ? undefined : placeholder}
                      aria-invalid={invalid || undefined}
                      className={cn(
                        'w-full min-w-0 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
                        compact ? 'h-5 leading-5' : 'h-6 leading-6',
                        sizeClasses.text,
                      )}
                      {...props}
                    />
                  </span>
                </>
              )}
            </ComboboxPrimitive.Value>
          </div>
          <FieldControls clearable={clearable} compact={compact} iconSize={sizeClasses.icon} />
        </ComboboxPrimitive.Chips>
        {error && <span className="text-caption text-destructive pl-3">{error}</span>}
      </div>
    )
  },
)

ComboboxChips.displayName = 'ComboboxChips'

export type { ComboboxChipsProps, ComboboxInputProps }
