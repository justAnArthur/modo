// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/checkbox-group.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `"use client"` dropped; `@/lib/*` and `@/hooks/*` imports
 * rewritten to `../../../lib/*` (`SizeProvider` to `../../../primitives/sizes`),
 * `@/components/ui/fluid-hover-highlight` to `../../../lib/fluid-hover-highlight`,
 * `framer-motion` to `motion/react`;
 * uncontrolled mode added — `checkedIndices` is optional, with
 * `defaultCheckedIndices` (Set or array) and a group-level
 * `onCheckedIndicesChange` backed by `useControllableState`, and the group
 * context carries the checked set plus a setter; `CheckboxItem` `checked` and
 * `onToggle` are optional and fall back to that context (a toggle always
 * reports to the group as well); arrow-key focus guarded for
 * `noUncheckedIndexedAccess`; modo docs — TSDoc with FF's docs/API text,
 * statics typed via a cast on the root, default export.
 * Styling reads DS tokens (AGENTS.md styling): inline `fontVariationSettings`
 * → `weight-*`; the hex focus-ring fallback → `ring-focus-ring` /
 * `border-focus-ring`; `rounded-[Npx]` → radius tokens; `duration-80|120|160`
 * and tier-length JS durations → `duration-<tier>` / `spring.*`; the unchecked
 * `border-neutral-400` / `dark:border-neutral-500` → `border-control`.
 * The inline run grouping is the shared `useSelectionRuns`; the merged
 * backgrounds melt and split through the goo (`lib/use-merge-split.tsx`).
 * Renamed for modo (item `checkbox`): `CheckboxItem` → `Checkbox`, the
 * default export, which also stands alone (its own state from
 * `defaultChecked`, `onCheckedChange` on every toggle, a pointer hover and
 * a focus ring of its own, a `size`); `CheckboxGroup` → its `Checkbox.Group`
 * static. A row's `index` is optional: the group numbers its rows in order
 * (`lib/row-index.tsx`).
 * Local: `label` is optional and takes any node; without one (and outside a
 * group) the checkbox is a bare box, Base UI's Checkbox.Root itself (focus,
 * `id` / `<label htmlFor>`, `aria-label(ledby)`, `name` / `value` /
 * `required` for forms). `indeterminate` (or `checked="indeterminate"`)
 * shows the icon set's `minus`, swapped with the check in one cell
 * (icon-swap recipe); `disabled` dims a row and takes it out of the group's
 * hover and arrow keys.
 */

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { useIcon } from '../../../lib/icon-context'
import { isDisabledRow } from '../../../lib/popup'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'

interface CheckboxGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  /** Local: the group's checked set (controlled or internal). */
  checkedIndices: Set<number>
  /** Local: sets one row's checked state, through `onCheckedIndicesChange`. */
  setItemChecked: (index: number, checked: boolean) => void
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

    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, setActiveIndex, itemRects, handlers, registerItem } = hover

    const checkedGroups = useSelectionRuns([...checkedIndices])

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null
    const shape = useShape()

    const blocks = useMergeSplitBlocks(checkedGroups, itemRects, shape.mergedRadius)

    const group = (
      <CheckboxGroupContext.Provider value={{ registerItem, activeIndex, checkedIndices, setItemChecked }}>
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
            // Don't clear hover when focus moves to another item within the group
            if (containerRef.current?.contains(e.relatedTarget as Node)) return
            setFocusedIndex(null)
            setActiveIndex(null)
          }}
          onKeyDown={e => {
            // Scope to row wrappers only. The inner checkbox primitive also
            // carries role="checkbox", so a bare [role="checkbox"] selector
            // matches twice per row and arrows skip onto the hidden control.
            const items = Array.from(
              containerRef.current?.querySelectorAll('[data-fluid-hover-index]:not([aria-disabled="true"])') ?? [],
            ) as HTMLElement[]
            const currentIdx = items.indexOf(e.target as HTMLElement)
            if (currentIdx === -1) return

            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
              e.preventDefault()
              const next =
                e.key === 'ArrowDown' ? (currentIdx + 1) % items.length : (currentIdx - 1 + items.length) % items.length
              items[next]?.focus()
            } else if (e.key === 'Home') {
              e.preventDefault()
              items[0]?.focus()
            } else if (e.key === 'End') {
              e.preventDefault()
              items[items.length - 1]?.focus()
            }
          }}
          role="group"
          className={cn('relative flex flex-col w-72 max-w-full select-none', className)}
          {...props}
        >
          <SelectionBackgrounds blocks={blocks} />

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
      </CheckboxGroupContext.Provider>
    )

    // A size prop pins every row in the group to one ladder step.
    return size ? <SizeProvider size={size}>{group}</SizeProvider> : group
  },
)

CheckboxGroup.displayName = 'CheckboxGroup'

/** A checkbox's state: on, off, or `'indeterminate'` (partly on), as Radix and shadcn spell it. */
type CheckboxCheckedState = boolean | 'indeterminate'

interface CheckboxProps extends HTMLAttributes<HTMLDivElement> {
  /** Label beside the box, any node. Omit it, outside a group, for a bare box (see Bare): name it with `aria-label`, `aria-labelledby` or a `<label htmlFor>` pointing at its `id`. */
  label?: ReactNode
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
  /** Dims the checkbox and ignores presses; in a group the hover and the arrow keys skip it. Defaults to `false`. */
  disabled?: boolean
  /** Form field name: a hidden checkbox input submits `value` while checked. */
  name?: string
  /** Value submitted with `name` while checked. Defaults to `"on"`. */
  value?: string
  /** Marks the hidden form input required. Defaults to `false`. */
  required?: boolean
  /** Position within a `Checkbox.Group`: the row's key in `checkedIndices`. Defaults to its order among the group's rows. */
  index?: number
  /** Pins the checkbox to one step of the size ladder (see Sizes). Defaults to the surrounding SizeProvider (a group's `size`). */
  size?: SizeVariant
}

type CheckboxComponent = ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof CheckboxGroup
}

// Icon swap (motion.md): the dash and the check share one cell, so the box
// never resizes between them.
const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const SHOWN_REDUCED = { opacity: 1 }
const HIDDEN_REDUCED = { opacity: 0 }
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

/** The box's insides: the border, the self-drawing check and the dash. */
function CheckboxBox({ checked, indeterminate, active, compact, skipAnimation, bare }: CheckboxBoxProps) {
  const Minus = useIcon('minus')
  const reduced = useReduceMotion()
  const marked = checked || indeterminate

  return (
    <>
      {/* Border */}
      <div
        className={cn(
          'absolute inset-0 border-solid transition-all duration-fast',
          compact ? 'rounded-sm' : 'rounded-box',
          marked
            ? bare
              ? 'border-[1.5px] border-control'
              : 'border-[1.5px] border-transparent'
            : active
              ? 'border-[1.5px] border-control'
              : 'border-[1.5px] border-border',
        )}
      />
      {/* Check mark */}
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
      {/* Dash: blurs in where the check retracts, and back. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-foreground"
        initial={false}
        animate={indeterminate ? (reduced ? SHOWN_REDUCED : SHOWN) : reduced ? HIDDEN_REDUCED : HIDDEN}
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
 * a dash, which blurs into the check when it is pressed, and back.
 *
 * Without a `label` the checkbox is just the box: Base UI's checkbox, so a
 * `<label htmlFor>` pointing at its `id` toggles it, `aria-label` names it,
 * and `name` / `value` / `required` take part in a form. It sits on its own
 * in a table cell or beside a label you lay out yourself.
 *
 * In a `Checkbox.Group`, contiguous checked rows share one background: a
 * checked row's background grows out of its center and melts into its
 * neighbours, an unchecked one pinches off and shrinks away (the liquid
 * indicators in Morph). A fluid hover highlight melts from row to row, and
 * Arrow Up/Down, Home and End move focus, skipping disabled rows. The group
 * numbers its rows in order, so they need no `index`; pass one to key a row
 * explicitly.
 *
 * Statics:
 * - `Checkbox.Group` — the list: uncontrolled with `defaultCheckedIndices`
 *   (a Set or an array of row indices), or controlled with `checkedIndices`
 *   plus `onCheckedIndicesChange`; `size` pins every row to one step of the
 *   size ladder. A row's own `checked` / `onToggle` still override the group
 *   for that row.
 *
 * @example {@include ./examples.mdx}
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
      disabled = false,
      name,
      value,
      required = false,
      index: indexProp,
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
    const labelId = useId()
    const explicit = checkedProp === 'indeterminate' ? false : checkedProp
    const [ownChecked, setOwnChecked] = useControllableState(explicit, defaultChecked, onCheckedChange)
    const [hovered, setHovered] = useState(false)

    // Local: an explicit `checked` wins; otherwise the group's set (or, alone,
    // the row's own state) decides. A toggle reports to the group as well.
    const checked = explicit ?? (group ? group.checkedIndices.has(index) : ownChecked)
    const indeterminate = indeterminateProp || checkedProp === 'indeterminate'
    const onToggle = () => {
      if (disabled) return
      // A dash checks, as a native mixed checkbox does.
      const next = indeterminate || !checked
      onToggleProp?.()
      group?.setItemChecked(index, next)
      // Checked and dashed at once: the state "changes" only by the dash going.
      if (next === checked) onCheckedChange?.(next)
      else setOwnChecked(next)
    }

    useRegisterFluidHoverItem(group?.registerItem, index, internalRef)

    useEffect(() => {
      hasMounted.current = true
    }, [])

    const isActive = group ? group.activeIndex === index : hovered
    const skipAnimation = !hasMounted.current
    const shape = useShape()
    const sizeClasses = useSize(size)
    const compact = sizeClasses.variant === 'compact'
    const setRef = (node: HTMLDivElement | null) => {
      ;(internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
    const box = (
      <CheckboxBox
        checked={checked}
        indeterminate={indeterminate}
        active={isActive}
        compact={compact}
        skipAnimation={skipAnimation}
        bare={label === undefined && !group}
      />
    )

    // Bare: no label and no group — the box alone is the control.
    if (label === undefined && !group) {
      return (
        <CheckboxPrimitive.Root
          ref={setRef}
          render={<div />}
          checked={checked}
          indeterminate={indeterminate}
          onCheckedChange={() => onToggle()}
          disabled={disabled}
          name={name}
          value={value}
          required={required}
          onPointerEnter={e => {
            if (e.pointerType === 'mouse') setHovered(true)
          }}
          onPointerLeave={() => setHovered(false)}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer outline-none transition-[opacity] duration-fast',
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
        ref={setRef}
        data-fluid-hover-index={index}
        data-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled || undefined}
        aria-label={typeof label === 'string' ? label : undefined}
        aria-labelledby={label !== undefined && typeof label !== 'string' ? labelId : undefined}
        onClick={onToggle}
        onPointerEnter={e => {
          if (e.pointerType === 'mouse') setHovered(true)
        }}
        onPointerLeave={() => setHovered(false)}
        onMouseDown={e => {
          // Clicking the 15px checkbox square would natively focus the hidden
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
            onToggle()
          }
        }}
        className={cn(
          // Fixed height (was py-1.5 around a 19.5px line box ≈ 31.5px) so the
          // text-box trim on the label doesn't shrink the row.
          `relative z-10 flex ${sizeClasses.control} items-center ${sizeClasses.gap} ${shape.item} ${sizeClasses.px} cursor-pointer outline-none transition-[opacity] duration-fast`,
          // The group draws one travelling focus ring; alone, the row rings itself.
          !group && 'focus-visible:ring-1 focus-visible:ring-focus-ring',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
        {...props}
      >
        {/* Checkbox — Base UI primitive for accessibility and forms */}
        <CheckboxPrimitive.Root
          checked={checked}
          indeterminate={indeterminate}
          onCheckedChange={() => onToggle()}
          disabled={disabled}
          name={name}
          value={value}
          required={required}
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

        {/* Label */}
        {/* Both stacked spans carry the text-box trim so the invisible bold
            sizer and the visible label keep identical boxes. */}
        {label !== undefined && (
          <span className={cn('inline-grid', sizeClasses.text)}>
            <span
              className="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic] weight-semibold"
              aria-hidden="true"
            >
              {label}
            </span>
            <span
              id={labelId}
              className={cn(
                'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-fast [text-box:trim-both_cap_alphabetic]',
                checked || indeterminate || isActive ? 'text-foreground' : 'text-muted-foreground',
                checked ? 'weight-semibold' : 'weight-normal',
              )}
            >
              {label}
            </span>
          </span>
        )}
      </div>
    )
  },
) as CheckboxComponent

Checkbox.displayName = 'Checkbox'

Object.assign(Checkbox, { Group: CheckboxGroup })

export type { CheckboxCheckedState, CheckboxGroupProps, CheckboxProps }
export { Checkbox, CheckboxGroup }
export default Checkbox
