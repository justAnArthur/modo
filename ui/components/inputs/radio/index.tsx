// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/radio-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `"use client"` dropped; `@/lib/*` and `@/hooks/*` imports
 * rewritten to `../../../lib/*` (`SizeProvider` to `../../../primitives/sizes`),
 * `@/components/ui/fluid-hover-highlight` to `../../../lib/fluid-hover-highlight`,
 * `framer-motion` to `motion/react`;
 * uncontrolled mode added — `defaultSelectedIndex` + group-level
 * `onSelectedIndexChange` twin `selectedIndex`, and `defaultValue` twins
 * `value` (`onValueChange` now also fires uncontrolled), both backed by
 * `useControllableState`; the group context carries a `selectIndex` setter
 * that every `RadioItem` selection calls (after its own `onValueChange` /
 * `onSelect`), so items need no `selected` / `onSelect` of their own; arrow-key
 * focus guarded for `noUncheckedIndexedAccess`; modo docs — TSDoc with FF's
 * docs/API text, statics typed via a cast on the root, default export.
 * Styling reads DS tokens (AGENTS.md styling): inline `fontVariationSettings`
 * → `weight-*`; the hex focus-ring fallback → `ring-focus-ring` /
 * `border-focus-ring`; `duration-80|120|160` and tier-length JS durations →
 * `duration-<tier>` / `spring.*`; the unchecked `border-neutral-400` /
 * `dark:border-neutral-500` → `border-control`.
 * The selected background is a `GooIndicator` (`lib/goo-indicator.tsx`): it
 * melts from row to row instead of sliding.
 * Renamed for modo (item `radio`): `RadioItem` → `Radio`, the default
 * export; `RadioGroup` → its `Radio.Group` static. A row's `index` is
 * optional: the group numbers its rows in order (`lib/row-index.tsx`).
 */

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
import { GooIndicator } from '../../../lib/goo-indicator'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'

interface RadioGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  selectedIndex: number | null
  selectedValue?: string
  onValueChange?: (value: string) => void
  /** Whether any item in the group is currently selected. Drives the roving
   *  tabindex fallback: with no selection, the first item must stay tabbable
   *  or the whole group becomes unreachable by keyboard. */
  hasSelection: boolean
  /** Local: selects a row by index, through `onSelectedIndexChange`. */
  selectIndex: (index: number) => void
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
  /** Selected item `value` (value mode; items then need a `value`). Controlled; wraps the group in Base UI's RadioGroup for form integration. */
  value?: string
  /** Selected item `value` on first render when uncontrolled (value mode). */
  defaultValue?: string
  /** Called with the selected item's `value` when it changes (value mode). */
  onValueChange?: (value: string) => void
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
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [selectedIndex, selectIndex] = useControllableState<number | undefined>(
      selectedIndexProp,
      defaultSelectedIndex,
      onSelectedIndexChange as ((index: number | undefined) => void) | undefined,
    )
    const [value, onValueChange] = useControllableState<string | undefined>(
      valueProp,
      defaultValue,
      onValueChangeProp as ((value: string | undefined) => void) | undefined,
    )

    const containerRef = useRef<HTMLDivElement>(null)
    const childValues = Children.toArray(children)
      .filter(isValidElement)
      .map(child => (child.props as { value?: string }).value)
    const hover = useFluidHover(containerRef)
    const { activeIndex, setActiveIndex, itemRects, handlers, registerItem } = hover

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
    const resolvedSelectedIndex =
      value !== undefined ? childValues.findIndex(childValue => childValue === value) : (selectedIndex ?? -1)
    // Covers all three selection APIs: value, selectedIndex, per-item selected.
    const hasSelection =
      resolvedSelectedIndex >= 0 ||
      Children.toArray(children)
        .filter(isValidElement)
        .some(child => (child.props as { selected?: boolean }).selected === true)

    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null
    const selectedRect = resolvedSelectedIndex >= 0 ? itemRects[resolvedSelectedIndex] : null
    const shape = useShape()

    const content = (
      <div
        ref={node => {
          ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        onMouseEnter={handlers.onMouseEnter}
        onMouseMove={handlers.onMouseMove}
        onMouseLeave={handlers.onMouseLeave}
        onClick={handlers.onClick}
        onFocus={e => {
          const indexAttr = (e.target as HTMLElement)
            .closest('[data-fluid-hover-index]')
            ?.getAttribute('data-fluid-hover-index')
          if (indexAttr != null) {
            const idx = Number(indexAttr)
            setActiveIndex(idx)
            setFocusedIndex((e.target as HTMLElement).matches(':focus-visible') ? idx : null)
          }
        }}
        onBlur={e => {
          if (containerRef.current?.contains(e.relatedTarget as Node)) return
          setFocusedIndex(null)
          setActiveIndex(null)
        }}
        onKeyDown={e => {
          // Scope to row wrappers only. The hidden radio primitive also
          // carries role="radio", so a bare [role="radio"] selector matches
          // twice per row and arrows land on the invisible control.
          const items = Array.from(
            containerRef.current?.querySelectorAll('[data-fluid-hover-index]') ?? [],
          ) as HTMLElement[]
          const currentIdx = items.indexOf(e.target as HTMLElement)
          if (currentIdx === -1) return

          // In value mode this handler is merged with Base UI RadioGroup's
          // composite onto the same element; suppress the composite's own
          // roving focus (it targets the hidden sr-only radios).
          const preventBaseUI = (e as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler

          if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
            e.preventDefault()
            preventBaseUI?.()
            const next = ['ArrowDown', 'ArrowRight'].includes(e.key)
              ? (currentIdx + 1) % items.length
              : (currentIdx - 1 + items.length) % items.length
            items[next]?.focus()
            items[next]?.click()
          } else if (e.key === 'Home') {
            e.preventDefault()
            preventBaseUI?.()
            items[0]?.focus()
            items[0]?.click()
          } else if (e.key === 'End') {
            e.preventDefault()
            preventBaseUI?.()
            items[items.length - 1]?.focus()
            items[items.length - 1]?.click()
          }
        }}
        role="radiogroup"
        className={cn('relative flex flex-col w-72 max-w-full select-none', className)}
        {...props}
      >
        {selectedRect && <GooIndicator rect={selectedRect} className={cn('bg-active', shape.bg)} />}

        {/* Hover background */}
        <FluidHoverHighlight hover={hover} className={shape.bg} />

        {/* Focus ring */}
        <AnimatePresence>
          {focusRect && (
            <motion.div
              className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-focus-ring`}
              initial={false}
              animate={{
                left: focusRect.left - 2,
                top: focusRect.top - 2,
                width: focusRect.width + 4,
                height: focusRect.height + 4,
              }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{
                ...spring.fast,
                opacity: { duration: spring.fast.duration },
              }}
            />
          )}
        </AnimatePresence>

        <IndexedRows>{children}</IndexedRows>
      </div>
    )

    // If `value` is provided (controlled-by-value mode), always wrap with the
    // Base UI RadioGroup primitive — even when `onValueChange` is absent. The
    // inner `<RadioPrimitive.Root>` rendered by each Radio requires a
    // parent RadioGroup context; without it, Base UI crashes on context reads.
    // The wrapper just doesn't forward changes when the consumer doesn't ask
    // to be notified.
    // A size prop pins every row in the group to one ladder step.
    const withSize = (node: ReactNode) => (size ? <SizeProvider size={size}>{node}</SizeProvider> : node)

    if (value !== undefined) {
      return withSize(
        <RadioGroupContext.Provider
          value={{
            registerItem,
            activeIndex,
            selectedIndex: resolvedSelectedIndex >= 0 ? resolvedSelectedIndex : null,
            selectedValue: value,
            onValueChange,
            hasSelection,
            selectIndex,
          }}
        >
          <RadioGroupPrimitive value={value} onValueChange={v => onValueChange(v as string)} render={content} />
        </RadioGroupContext.Provider>,
      )
    }

    return withSize(
      <RadioGroupContext.Provider
        value={{
          registerItem,
          activeIndex,
          selectedIndex: selectedIndex ?? null,
          hasSelection,
          selectIndex,
        }}
      >
        {content}
      </RadioGroupContext.Provider>,
    )
  },
)

RadioGroup.displayName = 'RadioGroup'

interface RadioProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label for the radio item. */
  label: string
  /** Position within the `Radio.Group`: the row's `selectedIndex`. Defaults to its order among the group's rows. */
  index?: number
  /** Whether this item is selected. Defaults to the group's selection. */
  selected?: boolean
  /** Called when this item is selected (the group's change callbacks fire too). */
  onSelect?: () => void
  /** Optional value forwarded to the underlying Base UI primitive for form integration. */
  value?: string
}

type RadioComponent = ForwardRefExoticComponent<RadioProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof RadioGroup
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
 * Statics:
 * - `Radio.Group` — the list. Select by index — uncontrolled with
 *   `defaultSelectedIndex`, controlled with `selectedIndex` +
 *   `onSelectedIndexChange` — or by row `value` (`defaultValue` / `value` +
 *   `onValueChange`), which also renders Base UI radios for form
 *   integration; `size` pins every row to one step of the size ladder.
 *
 * @example {@include ./examples.mdx}
 */
const Radio = forwardRef<HTMLDivElement, RadioProps>(
  ({ label, index: indexProp, selected, onSelect, value, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const hasMounted = useRef(false)
    const { registerItem, activeIndex, selectedIndex, selectedValue, onValueChange, hasSelection, selectIndex } =
      useRadioGroupContext()
    const index = useRowIndex(indexProp)

    useRegisterFluidHoverItem(registerItem, index, internalRef)

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const isActive = activeIndex === index
    const skipAnimation = !hasMounted.current
    const shape = useShape()
    const sizeClasses = useSize()
    const compact = sizeClasses.variant === 'compact'
    const isSelected =
      value !== undefined && selectedValue !== undefined
        ? selectedValue === value
        : (selected ?? selectedIndex === index)

    const handleSelect = () => {
      if (value !== undefined) {
        onValueChange?.(value)
      }
      onSelect?.()
      selectIndex(index)
    }

    return (
      <div
        ref={node => {
          ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        data-fluid-hover-index={index}
        // Roving tabindex: selected item is the tab stop; with no selection the
        // first item takes it so the group stays keyboard-reachable.
        tabIndex={isSelected ? 0 : !hasSelection && index === 0 ? 0 : -1}
        role="radio"
        aria-checked={isSelected}
        aria-label={label}
        onClick={handleSelect}
        onMouseDown={e => {
          // Clicking the 15px radio circle would natively focus the hidden
          // primitive (nearest focusable ancestor of the click target), after
          // which arrow-key nav dead-zones: the group keydown handler can't
          // find the target among the row wrappers. Prevent the native focus
          // move (click still fires) and land focus on the row instead. Skip
          // genuinely interactive children so we don't hijack their focus.
          const interactive = (e.target as HTMLElement).closest(
            'button:not([tabindex="-1"]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          if (interactive && interactive !== e.currentTarget) return
          e.preventDefault()
          e.currentTarget.focus()
        }}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            handleSelect()
          }
        }}
        className={cn(
          // Fixed height (was py-1.5 around a 19.5px line box ≈ 31.5px) so the
          // text-box trim on the label doesn't shrink the row.
          `relative z-10 flex ${sizeClasses.control} items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} cursor-pointer outline-none`,
          className,
        )}
        {...props}
      >
        {/* Radio circle */}
        <div className={cn('relative shrink-0', compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]')}>
          {/* Border */}
          <div
            className={cn(
              'absolute inset-0 rounded-full border-solid transition-all duration-fast',
              isSelected
                ? 'border-[1.5px] border-transparent'
                : isActive
                  ? 'border-[1.5px] border-control'
                  : 'border-[1.5px] border-border',
            )}
          />
          {/* Dot */}
          <AnimatePresence>
            {isSelected && (
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
        </div>

        {/* Label */}
        {/* Both stacked spans carry the text-box trim so the invisible bold
            sizer and the visible label keep identical boxes. */}
        <span className={cn('inline-grid', sizeClasses.text)}>
          <span
            className="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic] weight-semibold"
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast [text-box:trim-both_cap_alphabetic]',
              isSelected || isActive ? 'text-foreground' : 'text-muted-foreground',
              isSelected ? 'weight-semibold' : 'weight-normal',
            )}
          >
            {label}
          </span>
        </span>

        {/* Hidden Base UI Radio input for accessibility */}
        {value !== undefined && <RadioPrimitive.Root value={value} className="sr-only" tabIndex={-1} aria-hidden />}
      </div>
    )
  },
) as RadioComponent

Radio.displayName = 'Radio'

Object.assign(Radio, { Group: RadioGroup })

export type { RadioGroupProps, RadioProps }
export { Radio, RadioGroup }
export default Radio
