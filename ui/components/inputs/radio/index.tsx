// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/radio-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { AnimatePresence, motion } from 'motion/react'
import {
  Children,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { mergeRefs } from '../../../lib/merge-refs'
import { focusRowOnPress, useRowGroup } from '../../../lib/row-group'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { SizeScope } from '../../../primitives/sizes'

interface RadioGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  selectedIndex: number | null
  selectedValue?: string
  onValueChange: (value: string) => void
  /** With no selection the first row stays tabbable, or the group is unreachable by keyboard. */
  hasSelection: boolean
  selectIndex: (index: number) => void
  disabled: boolean
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function useRadioGroupContext() {
  const ctx = useContext(RadioGroupContext)
  if (!ctx) throw new Error('Radio must be used within a Radio.Group')
  return ctx
}

interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultValue'> {
  /** `Radio` rows. */
  children: ReactNode
  /** Index of the currently selected item. Controlled — pair it with `onSelectedIndexChange` (or per-item `onSelect`). */
  selectedIndex?: number
  /** Selected index on first render when uncontrolled. Defaults to no selection. */
  defaultSelectedIndex?: number
  /** Called with the new index whenever an item is selected. */
  onSelectedIndexChange?: (index: number) => void
  /** Selected item `value` (value mode; items then need a `value`). Controlled. */
  value?: string
  /** Selected item `value` on first render when uncontrolled (value mode). */
  defaultValue?: string
  /** Called with the selected item's `value` when it changes (value mode). */
  onValueChange?: (value: string) => void
  /** Submits the selected row's `value` under this name in a form (value mode). */
  name?: string
  /** Disables every row. Defaults to `false`. */
  disabled?: boolean
  /** Pins the group's rows to one step of the size ladder (default 36px, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

// `Radio.Group`: the list, its selection, hover highlight and focus ring.
const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      children,
      selectedIndex: selectedIndexProp,
      defaultSelectedIndex,
      onSelectedIndexChange,
      value: valueProp,
      defaultValue,
      onValueChange: onValueChangeProp,
      name,
      disabled = false,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [selectedIndex, selectIndex] = useControllableState<number | undefined>(
      selectedIndexProp,
      defaultSelectedIndex,
      next => next !== undefined && onSelectedIndexChange?.(next),
    )
    const [value, setValue] = useControllableState<string | undefined>(
      valueProp,
      defaultValue,
      next => next !== undefined && onValueChangeProp?.(next),
    )

    const containerRef = useRef<HTMLDivElement>(null)
    const rows = Children.toArray(children)
      .filter(isValidElement)
      .map(child => child.props as { value?: string; selected?: boolean })
    const childValues = rows.map(row => row.value)
    // Decided from the props, not the current value: a group with only
    // `onValueChange` starts with no value and must still report one.
    const valueMode =
      valueProp !== undefined ||
      defaultValue !== undefined ||
      onValueChangeProp !== undefined ||
      childValues.some(v => v !== undefined)

    const hover = useFluidHover(containerRef)
    const { activeIndex, itemRects, handlers, registerItem } = hover
    const rowGroup = useRowGroup(hover, { axis: 'xy', activateOnFocus: true })

    const resolvedSelectedIndex = valueMode
      ? childValues.findIndex(childValue => childValue !== undefined && childValue === value)
      : (selectedIndex ?? -1)
    const hasSelection = resolvedSelectedIndex >= 0 || rows.some(row => row.selected === true)

    const selectedRect = resolvedSelectedIndex >= 0 ? itemRects[resolvedSelectedIndex] : null
    const shape = useShape()

    // Bare radios lay themselves out: with no labelled row among the children
    // the group draws no rows and leaves the arrow keys to Base UI's group.
    const hasRows = Children.toArray(children).some(
      child => isValidElement(child) && (child.props as { label?: string }).label !== undefined,
    )
    const context = {
      registerItem,
      activeIndex,
      selectedIndex: resolvedSelectedIndex >= 0 ? resolvedSelectedIndex : null,
      selectedValue: valueMode || !hasRows ? value : undefined,
      onValueChange: setValue,
      hasSelection,
      selectIndex,
      disabled,
    }

    if (!hasRows) {
      return (
        <SizeScope size={size}>
          <RadioGroupContext.Provider value={context}>
            <RadioGroupPrimitive
              ref={mergeRefs(containerRef, ref)}
              value={value ?? null}
              onValueChange={v => setValue(v as string)}
              name={name}
              disabled={disabled}
              className={cn('flex flex-col gap-2', className)}
              {...props}
            >
              {children}
            </RadioGroupPrimitive>
          </RadioGroupContext.Provider>
        </SizeScope>
      )
    }

    const content = (
      <div
        ref={mergeRefs(containerRef, ref)}
        onMouseEnter={handlers.onMouseEnter}
        onMouseMove={handlers.onMouseMove}
        onMouseLeave={handlers.onMouseLeave}
        onClick={handlers.onClick}
        {...rowGroup.handlers}
        role="radiogroup"
        aria-disabled={disabled || undefined}
        className={cn('relative flex flex-col w-72 max-w-full select-none', className)}
        {...props}
      >
        {selectedRect && <GooIndicator rect={selectedRect} className={cn('bg-active', shape.bg)} />}

        <FluidHoverHighlight hover={hover} className={shape.bg} />

        <FocusRing rect={rowGroup.focusRect} />

        <IndexedRows>{children}</IndexedRows>
      </div>
    )

    return (
      <SizeScope size={size}>
        <RadioGroupContext.Provider value={context}>
          {/* Each valued row renders a Base UI radio, which needs this group above it. */}
          {valueMode ? (
            <RadioGroupPrimitive
              value={value ?? null}
              onValueChange={v => setValue(v as string)}
              name={name}
              disabled={disabled}
              render={content}
            />
          ) : (
            content
          )}
        </RadioGroupContext.Provider>
      </SizeScope>
    )
  },
)

RadioGroup.displayName = 'RadioGroup'

interface RadioProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label for the radio item. Omit it for the bare circle in a layout of your own (see Bare): it then needs a `value`, and a name from `aria-label`, `aria-labelledby` or a `<label htmlFor>` pointing at its `id`. */
  label?: string
  /** Position within the `Radio.Group`: the row's `selectedIndex`. Defaults to its order among the group's rows. */
  index?: number
  /** Whether this item is selected. Defaults to the group's selection. */
  selected?: boolean
  /** Called when this item is selected (the group's change callbacks fire too). */
  onSelect?: () => void
  /** The row's value: selects it by value and submits it under the group's `name`. A bare radio needs one. */
  value?: string
  /** Disables the row. Defaults to the group's `disabled`. */
  disabled?: boolean
  /** Pins the row to one step of the size ladder. Defaults to the surrounding SizeProvider (a group's `size`). */
  size?: SizeVariant
}

type RadioComponent = ForwardRefExoticComponent<RadioProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof RadioGroup
}

interface RadioCircleProps {
  selected: boolean
  /** Lit: the border darkens. */
  active: boolean
  compact: boolean
  /** Already selected at mount: the dot is there, not scaled in. */
  skipAnimation: boolean
  /** A bare circle keeps its border when picked: a lone dot would read as a bullet. */
  bare: boolean
}

function RadioCircle({ selected, active, compact, skipAnimation, bare }: RadioCircleProps) {
  return (
    <>
      <div
        className={cn(
          'absolute inset-0 rounded-full border-solid border-[1.5px] transition-all duration-fast',
          selected && !bare ? 'border-transparent' : active || selected ? 'border-control' : 'border-border',
        )}
      />
      <AnimatePresence>
        {selected && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{
              opacity: skipAnimation ? 1 : 0,
              scale: skipAnimation ? 1 : 0.3,
            }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.3, transition: { duration: 0.04 } }}
            transition={spring.fast}
          >
            <div className={cn('rounded-full bg-foreground', compact ? 'w-[7px] h-[7px]' : 'w-[8px] h-[8px]')} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Radio buttons with fluid hover and animated selection.
 *
 * Each `Radio` is one row of a `Radio.Group`. The selected background melts
 * to the chosen row, a fluid hover highlight melts between rows (the liquid
 * indicators in Morph), the dot scales in, and the label animates to
 * semibold without shifting its width. Arrow keys, Home and End move focus
 * and select, with a roving tabindex on the selected row. The group numbers
 * its rows in order, so they need no `index`. FF's per-row `selected` /
 * `onSelect` still work and override the group for their row.
 *
 * Without a `label` a radio is the circle alone: Base UI's radio, picked by
 * its `value`, named by a `<label htmlFor>` pointing at its `id` or by
 * `aria-label`. Lay bare radios out however you like inside the group (a
 * row with a description, a grid of cards); when none of its direct children
 * is a labelled row, the group draws no rows of its own (no hover, selected
 * background or ring) and Base UI moves focus and selection with the arrow
 * keys. A picked bare circle keeps its border.
 *
 * Statics:
 * - `Radio.Group` — the list. Select by index — uncontrolled with
 *   `defaultSelectedIndex`, controlled with `selectedIndex` +
 *   `onSelectedIndexChange` — or by row `value` (`defaultValue` / `value` +
 *   `onValueChange`), which also renders Base UI radios, so the group
 *   submits under its `name` in a form; `disabled` turns every row off;
 *   `size` pins every row to one step of the size ladder.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/radio-group.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Radio = forwardRef<HTMLDivElement, RadioProps>(
  ({ label, index: indexProp, selected, onSelect, value, disabled: disabledProp, size, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const hasMounted = useRef(false)
    const group = useRadioGroupContext()
    const { registerItem, activeIndex, selectedIndex, selectedValue, onValueChange, hasSelection, selectIndex } = group
    const index = useRowIndex(indexProp)
    const disabled = disabledProp ?? group.disabled
    const bare = label === undefined
    const [hovered, setHovered] = useState(false)

    // A bare radio is no row: it joins neither the hover nor the arrow keys.
    useRegisterFluidHoverItem(bare ? undefined : registerItem, index, internalRef)

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const isActive = !disabled && (bare ? hovered : activeIndex === index)
    const shape = useShape()
    const sizeClasses = useSize(size)
    const compact = sizeClasses.variant === 'compact'
    const isSelected =
      value !== undefined && selectedValue !== undefined
        ? selectedValue === value
        : (selected ?? selectedIndex === index)

    const handleSelect = () => {
      if (disabled) return
      if (value !== undefined) onValueChange(value)
      onSelect?.()
      selectIndex(index)
    }

    const circle = (
      <RadioCircle
        selected={isSelected}
        active={isActive}
        compact={compact}
        skipAnimation={!hasMounted.current}
        bare={bare}
      />
    )

    if (bare) {
      return (
        <RadioPrimitive.Root
          ref={mergeRefs(internalRef, ref)}
          render={<div />}
          value={value}
          disabled={disabled}
          // Base UI's group picks it; this reports the row's own `onSelect`.
          onClick={() => {
            if (!disabled) onSelect?.()
          }}
          onPointerEnter={e => {
            if (e.pointerType === 'mouse') setHovered(true)
          }}
          onPointerLeave={() => setHovered(false)}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer rounded-full outline-none',
            'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            compact ? 'size-3.5' : 'size-4',
            disabled && 'opacity-50 pointer-events-none',
            className,
          )}
          // The root renders a div (`render`); its handlers are typed for Base UI's span.
          {...(props as HTMLAttributes<HTMLSpanElement>)}
        >
          {circle}
        </RadioPrimitive.Root>
      )
    }

    return (
      <div
        ref={mergeRefs(internalRef, ref)}
        data-fluid-hover-index={index}
        tabIndex={disabled ? -1 : isSelected ? 0 : !hasSelection && index === 0 ? 0 : -1}
        role="radio"
        aria-checked={isSelected}
        aria-disabled={disabled || undefined}
        aria-label={label}
        onClick={handleSelect}
        onMouseDown={focusRowOnPress}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            handleSelect()
          }
        }}
        className={cn(
          `relative z-10 flex ${sizeClasses.control} items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} cursor-pointer outline-none`,
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
        {...props}
      >
        <div className={cn('relative shrink-0', compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]')}>{circle}</div>

        <WeightLabel emphasized={isSelected} lit={isSelected || isActive} trim className={sizeClasses.text}>
          {label}
        </WeightLabel>

        {value !== undefined && (
          <RadioPrimitive.Root value={value} disabled={disabled} className="sr-only" tabIndex={-1} aria-hidden />
        )}
      </div>
    )
  },
) as RadioComponent

Radio.displayName = 'Radio'

Object.assign(Radio, { Group: RadioGroup })

export type { RadioGroupProps, RadioProps }
export { Radio, RadioGroup }
export default Radio
