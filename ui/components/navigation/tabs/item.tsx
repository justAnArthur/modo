/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/tabs.tsx` + `registry/base/tabs-subtle.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { AnimatePresence, motion } from 'motion/react'
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeClasses, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { useTabs, useTabsList } from './context'

interface TabItemProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> {
  /** The value this tab selects; its `Tabs.Panel` takes the same one. */
  value: string
  /** Icon before the label. Its stroke thickens while the tab is hovered or selected. */
  icon?: IconComponent
  /** The label: text, or a node such as text with a counter or a badge. Collapsed under `activeLabel`, a text label is the tab's accessible name; give a node label's tab an `aria-label`. */
  label: ReactNode
  /** Renders the tab as a link to this URL (link tabs, for route-based navigation): a press follows the link and selects the tab. For a router's link component, pass it as `render` instead. */
  href?: string
}

const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ value, icon: Icon, label, href, render, className, onClick, ...props }, ref) => {
    const own = useRef<HTMLButtonElement>(null)
    const mergedRef = useMergeRefs<HTMLButtonElement>(own, ref)
    const index = useRowIndex()
    const { variant, activeLabel, selectedValue } = useTabs('Tabs.Item')
    const { registerTab, hoveredIndex, setOptimisticIndex } = useTabsList()
    const shape = useShape()
    const size = useSize()

    useEffect(() => {
      registerTab(index, own.current)
      return () => registerTab(index, null)
    }, [index, registerTab])

    const selected = selectedValue === value
    const lit = hoveredIndex === index || selected
    const collapse = activeLabel && !!Icon
    const showLabel = !collapse || selected
    // Base UI keeps the tab's role and keys on an anchor; it just mustn't expect a <button>.
    // biome-ignore lint/a11y/useAnchorContent: Base UI renders the tab's label into the anchor
    const link = render ?? (href === undefined ? undefined : <a href={href} />)
    const text = (
      <WeightLabel emphasized={selected} lit={lit} trim className={cn('whitespace-nowrap', size.text)}>
        {label}
      </WeightLabel>
    )

    return (
      <TabsPrimitive.Tab
        onClick={e => {
          setOptimisticIndex(index)
          onClick?.(e)
        }}
        ref={mergedRef}
        value={value}
        render={link}
        nativeButton={link === undefined}
        data-fluid-hover-index={index}
        aria-label={showLabel || typeof label !== 'string' ? undefined : label}
        className={cn(
          // A fixed height, so the trimmed label doesn't shrink the tab.
          'relative z-10 flex items-center cursor-pointer bg-transparent border-none outline-none',
          variant === 'subtle' ? [size.control, size.px, shape.bg] : [size.segmentItem, 'px-3'],
          !collapse && size.gap,
          className,
        )}
        {...props}
      >
        {Icon && (
          <Icon
            size={size.icon}
            strokeWidth={lit ? 2 : 1.5}
            className={cn(
              'shrink-0 transition-[color,stroke-width] duration-fast',
              lit ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
        )}
        {collapse ? (
          <CollapsingLabel shown={showLabel} size={size}>
            {text}
          </CollapsingLabel>
        ) : (
          text
        )}
      </TabsPrimitive.Tab>
    )
  },
)

TabItem.displayName = 'TabItem'

/**
 * The `activeLabel` label: it opens to a measured width, not `"auto"`. motion
 * resolves an `"auto"` target from the element's visual size, so under a
 * scaled ancestor (the canvas) the spring overshoots, then snaps. CSS sizes
 * the first frame until the measurement lands.
 */
function CollapsingLabel({ shown, size, children }: { shown: boolean; size: SizeClasses; children: ReactNode }) {
  const [width, setWidth] = useState<number | null>(null)
  const observer = useRef<ResizeObserver | null>(null)
  const measure = useCallback((el: HTMLSpanElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!el) return
    const update = () => setWidth(el.offsetWidth)
    update()
    observer.current = new ResizeObserver(update)
    observer.current.observe(el)
  }, [])

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.span
          key="label"
          className="overflow-hidden"
          style={width == null ? { width: 'auto' } : undefined}
          initial={{ width: 0, opacity: 0, marginLeft: 0 }}
          animate={{
            ...(width != null ? { width } : null),
            opacity: 1,
            // The ladder's icon-to-label gap.
            marginLeft: size.variant === 'compact' ? 6 : 8,
          }}
          exit={{ width: 0, opacity: 0, marginLeft: 0 }}
          transition={{ ...spring.fast, opacity: { duration: spring.fast.exit.duration } }}
        >
          <span ref={measure} className="inline-flex">
            {children}
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export type { TabItemProps }
export { TabItem }
