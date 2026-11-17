// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/checkbox-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { useIcon } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { focusRowOnPress, useRowGroup } from '../../../lib/row-group'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { SizeScope } from '../../../primitives/systems/sizes'

interface CheckboxGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  checkedIndices: Set<number>
  setItemChecked: (index: number, checked: boolean) => void
  disabled: boolean
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null)

interface CheckboxGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** `Checkbox` rows. */
  children: ReactNode
  /** Set of checked item indices; drives the merged background across contiguous picks. Controlled — pair it with `onCheckedIndicesChange` (or per-item `onToggle`). */
  checkedIndices?: Set<number>
  /** Checked indices on first render when uncontrolled (a Set or an array). Defaults to none. */
  defaultCheckedIndices?: Set<number> | number[]
  /** Called with the next checked set whenever an item is toggled. */
  onCheckedIndicesChange?: (checkedIndices: Set<number>) => void
  /** Disables every row. Defaults to `false`. */
  disabled?: boolean
  /** Pins the group's rows to one step of the size ladder (default 36px, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
}

// `Checkbox.Group`: the list, its checked set, hover highlight and focus ring.
const CheckboxGroup = forwardRef<HTMLDivElement, CheckboxGroupProps>(
  (
    {
      children,
      checkedIndices: checkedIndicesProp,
      defaultCheckedIndices,
      onCheckedIndicesChange,
      disabled = false,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const [checkedIndices, setCheckedIndices] = useControllableState<Set<number>>(
      checkedIndicesProp,
      new Set(defaultCheckedIndices),
      onCheckedIndicesChange,
    )
    const setItemChecked = useCallback(
      (index: number, checked: boolean) => {
        setCheckedIndices(prev => {
          if (prev.has(index) === checked) return prev
          const next = new Set(prev)
          if (checked) next.add(index)
          else next.delete(index)
          return next
        })
      },
      [setCheckedIndices],
    )

    const hover = useFluidHover(containerRef)
    const { activeIndex, itemRects, handlers, registerItem } = hover

    const checkedGroups = useSelectionRuns([...checkedIndices])

    const rowGroup = useRowGroup(hover)
    const shape = useShape()

    const blocks = useMergeSplitBlocks(checkedGroups, itemRects, shape.mergedRadius)

    return (
      <SizeScope size={size}>
        <CheckboxGroupContext.Provider value={{ registerItem, activeIndex, checkedIndices, setItemChecked, disabled }}>
          <div
            ref={mergeRefs(containerRef, ref)}
            onMouseEnter={handlers.onMouseEnter}
            onMouseMove={handlers.onMouseMove}
            onMouseLeave={handlers.onMouseLeave}
            onClick={handlers.onClick}
            {...rowGroup.handlers}
            role="group"
            aria-disabled={disabled || undefined}
            className={cn('relative flex flex-col w-72 max-w-full select-none', className)}
            {...props}
          >
            <SelectionBackgrounds blocks={blocks} />

            <FluidHoverHighlight hover={hover} className={shape.bg} />

            <FocusRing rect={rowGroup.focusRect} />

            <IndexedRows>{children}</IndexedRows>
          </div>
        </CheckboxGroupContext.Provider>
      </SizeScope>
    )
  },
)

CheckboxGroup.displayName = 'CheckboxGroup'

/** A checkbox's state: on, off, or `'indeterminate'` (partly on), as Radix and shadcn spell it. */
type CheckboxCheckedState = boolean | 'indeterminate'

interface CheckboxProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label for the checkbox. Omit it, outside a group, for the bare box (see Bare): name it with `aria-label`, `aria-labelledby` or a `<label htmlFor>` pointing at its `id`. */
  label?: string
  /** Whether the checkbox is checked (controlled); `'indeterminate'` shows the dash, as `indeterminate` does. Defaults to the group's checked set inside a `Checkbox.Group`, else its own state. */
  checked?: CheckboxCheckedState
  /** Whether a standalone checkbox starts checked (uncontrolled). Defaults to `false`. */
  defaultChecked?: boolean
  /** Shows a dash instead of the check: some, not all, of what it stands for is on. A press checks it. Defaults to `false`. */
  indeterminate?: boolean
  /** Called with the new state whenever the checkbox is toggled, in a group or not. */
  onCheckedChange?: (checked: boolean) => void
  /** Called when the checkbox is toggled (a group's `onCheckedIndicesChange` fires too). */
  onToggle?: () => void
  /** Position within a `Checkbox.Group`: the row's key in `checkedIndices`. Defaults to its order among the group's rows. */
  index?: number
  /** Disables the checkbox. Defaults to the group's `disabled`, else `false`. */
  disabled?: boolean
  /** Submits the checkbox under this name in a form, while checked. */
  name?: string
  /** The value submitted while checked. Defaults to `"on"`. */
  value?: string
  /** Pins the checkbox to one step of the size ladder (see Sizes). Defaults to the surrounding SizeProvider (a group's `size`). */
  size?: SizeVariant
}

type CheckboxComponent = ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof CheckboxGroup
}

// Icon swap (motion.md): the dash shares the check's cell, so the box never resizes.
const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const swapEnter = { type: 'tween' as const, duration: spring.fast.duration, ease: 'easeOut' as const }
const swapLeave = { type: 'tween' as const, ...spring.fast.exit, ease: 'easeIn' as const }

interface CheckboxBoxProps {
  checked: boolean
  indeterminate: boolean
  /** Lit: the border darkens. */
  active: boolean
  compact: boolean
  /** Already checked at mount: the check is there, not drawn in. */
  skipAnimation: boolean
  /** A bare box keeps its border when marked: a lone check would read as a bullet. */
  bare: boolean
}

function CheckboxBox({ checked, indeterminate, active, compact, skipAnimation, bare }: CheckboxBoxProps) {
  const Minus = useIcon('minus')
  const reduced = useReduceMotion()
  const marked = checked || indeterminate

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 border-solid border-[1.5px] transition-all duration-fast',
          compact ? 'rounded-sm' : 'rounded-box',
          marked && !bare ? 'border-transparent' : active || marked ? 'border-control' : 'border-border',
        )}
      />
      <AnimatePresence>
        {checked && !indeterminate && (
          <CheckboxPrimitive.Indicator
            keepMounted
            render={indicatorProps => {
              const {
                style: _s,
                onDrag: _onDrag,
                onDragStart: _onDragStart,
                onDragEnd: _onDragEnd,
                onAnimationStart: _onAnimationStart,
                onAnimationEnd: _onAnimationEnd,
                onAnimationIteration: _onAnimationIteration,
                ...rest
              } = indicatorProps as React.HTMLAttributes<SVGSVGElement>
              return (
                <motion.svg
                  {...rest}
                  width={compact ? 16 : 18}
                  height={compact ? 16 : 18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 1 }}
                >
                  <motion.path
                    d="M6 12L10 16L18 8"
                    initial={{ pathLength: skipAnimation ? 1 : 0 }}
                    animate={{
                      pathLength: 1,
                      transition: { duration: spring.fast.duration, ease: 'easeOut' },
                    }}
                    exit={{
                      pathLength: 0,
                      transition: { duration: 0.04, ease: 'easeIn' },
                    }}
                  />
                </motion.svg>
              )
            }}
          />
        )}
      </AnimatePresence>
      {/* The dash blurs in where the check retracts, and back. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-foreground"
        initial={false}
        animate={indeterminate ? SHOWN : reduced ? { opacity: 0 } : HIDDEN}
        transition={indeterminate ? swapEnter : swapLeave}
      >
        <Minus size={compact ? 14 : 16} strokeWidth={2} />
      </motion.span>
    </>
  )
}

/**
 * Checkbox with a self-drawing check, alone, bare, or in a group with merged
 * backgrounds for contiguous picks.
 *
 * The whole row is the hit target; Space or Enter toggles it, the check mark
 * draws itself in, and the checked label animates to semibold without
 * shifting its width. A standalone checkbox keeps its own state from
 * `defaultChecked`, or is controlled with `checked`; `onCheckedChange`
 * reports every toggle. `indeterminate` (or `checked="indeterminate"`) shows
 * a dash (`aria-checked="mixed"`), which blurs into the check when it is
 * pressed; the press reports `true`.
 *
 * Without a `label`, outside a group, the checkbox is the box alone: Base
 * UI's checkbox, so a `<label htmlFor>` pointing at its `id` toggles it,
 * `aria-label` names it, and `name` / `value` take part in a form. It sits in
 * a table cell or beside a label you lay out yourself, and keeps its border
 * when checked, so the check never reads as a bullet.
 *
 * In a `Checkbox.Group`, contiguous checked rows share one background: a
 * checked row's background grows out of its center and melts into its
 * neighbours, an unchecked one pinches off and shrinks away (the liquid
 * indicators in Morph). A fluid hover highlight melts from row to row, and
 * Arrow Up/Down, Home and End move focus. The group numbers its rows in
 * order, so they need no `index`; pass one to key a row explicitly.
 *
 * Statics:
 * - `Checkbox.Group` — the list: uncontrolled with `defaultCheckedIndices`
 *   (a Set or an array of row indices), or controlled with `checkedIndices`
 *   plus `onCheckedIndicesChange`; `size` pins every row to one step of the
 *   size ladder; `disabled` turns every row off. A row's own `checked` /
 *   `onToggle` still override the group for that row.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/checkbox-group.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Checkbox = forwardRef<HTMLDivElement, CheckboxProps>(
  (
    {
      label,
      checked: checkedProp,
      defaultChecked = false,
      indeterminate: indeterminateProp = false,
      onCheckedChange,
      onToggle: onToggleProp,
      index: indexProp,
      disabled: disabledProp,
      name,
      value,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const hasMounted = useRef(false)
    const group = useContext(CheckboxGroupContext)
    const index = useRowIndex(indexProp)
    const explicit = checkedProp === 'indeterminate' ? false : checkedProp
    const [ownChecked, setOwnChecked] = useControllableState(explicit, defaultChecked, onCheckedChange)
    const [hovered, setHovered] = useState(false)
    const disabled = disabledProp ?? group?.disabled ?? false
    const bare = label === undefined && !group

    // An explicit `checked` wins, then the group's set, then the row's own state.
    const checked = explicit ?? (group ? group.checkedIndices.has(index) : ownChecked)
    const indeterminate = indeterminateProp || checkedProp === 'indeterminate'
    const onToggle = () => {
      if (disabled) return
      // A dash checks, as a native mixed checkbox does.
      const next = indeterminate || !checked
      onToggleProp?.()
      group?.setItemChecked(index, next)
      // Checked and dashed at once: only the dash goes, so the setter would skip the report.
      if (next === checked) onCheckedChange?.(next)
      else setOwnChecked(next)
    }

    useRegisterFluidHoverItem(group?.registerItem, index, internalRef)

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const isActive = !disabled && (group ? group.activeIndex === index : hovered)
    const shape = useShape()
    const sizeClasses = useSize(size)
    const compact = sizeClasses.variant === 'compact'
    const box = (
      <CheckboxBox
        checked={checked}
        indeterminate={indeterminate}
        active={isActive}
        compact={compact}
        skipAnimation={!hasMounted.current}
        bare={bare}
      />
    )
    const hover = {
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType === 'mouse') setHovered(true)
      },
      onPointerLeave: () => setHovered(false),
    }

    if (bare) {
      return (
        <CheckboxPrimitive.Root
          ref={mergeRefs(internalRef, ref)}
          render={<div />}
          checked={checked}
          indeterminate={indeterminate}
          onCheckedChange={onToggle}
          disabled={disabled}
          name={name}
          value={value}
          {...hover}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer outline-none',
            'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            compact ? 'size-3.5 rounded-sm' : 'size-4 rounded-box',
            disabled && 'opacity-50 pointer-events-none',
            className,
          )}
          // The root renders a div (`render`); its handlers are typed for Base UI's span.
          {...(props as HTMLAttributes<HTMLSpanElement>)}
        >
          {box}
        </CheckboxPrimitive.Root>
      )
    }

    return (
      <div
        ref={mergeRefs(internalRef, ref)}
        data-fluid-hover-index={index}
        tabIndex={disabled ? -1 : 0}
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled || undefined}
        aria-label={label}
        onClick={onToggle}
        {...hover}
        onMouseDown={focusRowOnPress}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onToggle()
          }
        }}
        className={cn(
          `relative z-10 flex ${sizeClasses.control} items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} cursor-pointer outline-none`,
          // The group draws one travelling focus ring; alone, the row rings itself.
          !group && 'focus-visible:ring-1 focus-visible:ring-focus-ring',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
        {...props}
      >
        {/* The row is the control; the primitive draws the box and carries the form input. */}
        <CheckboxPrimitive.Root
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          name={name}
          value={value}
          onCheckedChange={onToggle}
          tabIndex={-1}
          aria-hidden
          className={cn(
            'relative shrink-0 appearance-none bg-transparent p-0 border-0 outline-none cursor-pointer',
            compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]',
          )}
          onClick={e => e.stopPropagation()}
        >
          {box}
        </CheckboxPrimitive.Root>

        <WeightLabel emphasized={checked} lit={checked || indeterminate || isActive} trim className={sizeClasses.text}>
          {label}
        </WeightLabel>
      </div>
    )
  },
) as CheckboxComponent

Checkbox.displayName = 'Checkbox'

Object.assign(Checkbox, { Group: CheckboxGroup })

export type { CheckboxCheckedState, CheckboxGroupProps, CheckboxProps }
export { Checkbox, CheckboxGroup }
export default Checkbox
