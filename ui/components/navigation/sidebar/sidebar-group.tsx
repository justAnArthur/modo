/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { motion } from 'motion/react'
import {
  Children,
  type CSSProperties,
  createContext,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react'
import { useIcon } from '../../../lib/icon-context'
import { inertProps } from '../../../lib/inert'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { resolveSlotTemplate, slotElement } from '../../../lib/slot'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { splitLabel } from './row-label'
import type { SidebarSectionProps } from './sidebar-parts'
import { useMeasuredCollapse } from './use-measured-collapse'

interface SidebarGroupContextValue {
  open: boolean
  toggle: () => void
  contentId: string
  /** Header actions overlaying the label's right edge: the label pads past them. */
  actionsCount: number
}

const SidebarGroupContext = createContext<SidebarGroupContextValue | null>(null)

export interface SidebarGroupProps extends SidebarSectionProps {
  /** The group's `SidebarGroupLabel` becomes a toggle that folds everything after it. Defaults to `false`. */
  collapsible?: boolean
  /** Controlled open state of a collapsible group. */
  open?: boolean
  /** Initial open state, for an uncontrolled group. Defaults to `true`. */
  defaultOpen?: boolean
  /** Called when a collapsible group opens or closes. */
  onOpenChange?: (open: boolean) => void
}

const isHeaderAction = (node: ReactNode) =>
  isValidElement(node) && (node.type === SidebarGroupAction || node.type === SidebarGroupActions)

const actionCount = (node: ReactNode) =>
  isValidElement<{ children?: ReactNode }>(node) && node.type === SidebarGroupActions
    ? Children.count(node.props.children)
    : 1

const SidebarGroup = forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, collapsible = false, open: openProp, defaultOpen = true, onOpenChange, children, ...props }, ref) => {
    const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
    const contentId = useId()
    const fold = useMeasuredCollapse<HTMLDivElement>(open, collapsible)
    // A clipped box shaves the focus ring off the first and last rows, so the
    // clip lifts once an open group has settled.
    const [settled, setSettled] = useState(open)
    useEffect(() => {
      if (!open) setSettled(false)
    }, [open])

    // The label and its header actions stay put; the rest rides in the fold.
    let inner: ReactNode = children
    let actionsCount = 0
    const kids = Children.toArray(children)
    const labelIdx = collapsible ? kids.findIndex(k => isValidElement(k) && k.type === SidebarGroupLabel) : -1
    if (labelIdx !== -1) {
      const tail = kids.slice(labelIdx + 1)
      const headerActions = tail.filter(isHeaderAction)
      actionsCount = headerActions.reduce<number>((n, k) => n + actionCount(k), 0)
      inner = (
        <>
          {kids.slice(0, labelIdx)}
          {/* Hovering anywhere on the row, the action cluster included, reveals the chevron. */}
          <div className="group/group-header w-full">
            {kids[labelIdx]}
            {headerActions}
          </div>
          <motion.div
            id={contentId}
            aria-hidden={open ? undefined : true}
            className={cn(open && settled ? 'overflow-visible' : 'overflow-hidden', !fold.measured && !open && 'h-0')}
            {...fold.motion}
            onAnimationComplete={() => {
              fold.settle()
              if (open) setSettled(true)
            }}
          >
            <div ref={fold.contentRef} className="flex w-full min-w-0 flex-col" {...inertProps(!open)}>
              {tail.filter(k => !isHeaderAction(k))}
            </div>
          </motion.div>
        </>
      )
    }

    const ctx = useMemo(
      () => ({ open, toggle: () => setOpen(prev => !prev), contentId, actionsCount }),
      [open, setOpen, contentId, actionsCount],
    )

    return (
      <div
        ref={ref}
        data-sidebar="group"
        data-state={collapsible ? (open ? 'open' : 'closed') : undefined}
        className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
        {...props}
      >
        <SidebarGroupContext.Provider value={collapsible ? ctx : null}>{inner}</SidebarGroupContext.Provider>
      </div>
    )
  },
)
SidebarGroup.displayName = 'SidebarGroup'

export interface SidebarGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** Render this element instead of the label's own. */
  render?: ReactElement
  /** `render` spelled as the single child element. */
  asChild?: boolean
}

const SidebarGroupLabel = forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
  ({ className, render, asChild, children, ...props }, ref) => {
    const size = useSize()
    const group = useContext(SidebarGroupContext)
    const shape = useShape()
    const ChevronRightIcon = useIcon('chevron-right')
    const { template, content } = resolveSlotTemplate(render, asChild, children)

    // Only the leading text truncates; element children keep the row's gap.
    const [text, rest] = splitLabel(content)
    const label = text ? (
      <>
        <span className="min-w-0 truncate">{text}</span>
        {rest}
      </>
    ) : (
      content
    )
    const textClass = size.variant === 'compact' ? 'text-caption-compact' : 'text-caption'

    if (!group) {
      return slotElement(
        template,
        'div',
        {
          ref: ref as Ref<HTMLElement>,
          'data-sidebar': 'group-label',
          className: cn(
            'flex h-8 shrink-0 items-center gap-2 px-2 text-muted-foreground/70 outline-none',
            textClass,
            className,
          ),
          ...props,
        },
        label,
      )
    }

    // In a collapsible group the label is the toggle: hover raises its
    // contrast and reveals the chevron, kept while collapsed as the reopen cue.
    return slotElement(
      template,
      'button',
      {
        ref: ref as Ref<HTMLElement>,
        type: template ? undefined : 'button',
        'data-sidebar': 'group-label',
        'aria-expanded': group.open,
        'aria-controls': group.contentId,
        onClick: group.toggle,
        // The action cluster overlays the right edge (24px per action, 4px
        // between): the label pads past it plus one gap, less the group's
        // own 8px: 28n + 6.
        style:
          group.actionsCount > 0
            ? ({ '--group-actions-pad': `${group.actionsCount * 28 + 6}px` } as CSSProperties)
            : undefined,
        className: cn(
          'flex h-8 w-full shrink-0 cursor-pointer select-none items-center gap-2 px-2 text-left text-muted-foreground/70 outline-none',
          'transition-colors duration-fast hover:text-muted-foreground',
          group.actionsCount > 0 && 'pr-[var(--group-actions-pad)]',
          'focus-visible:ring-1 focus-visible:ring-focus-ring',
          shape.item,
          textClass,
          className,
        ),
        ...props,
      },
      <>
        {label}
        {/* An action-sized box, so the chevron reads as one more icon in the
            row. While open it takes no width at rest, so the label keeps the
            row; no width transition, or the glyph would slide in. */}
        <span
          className={cn(
            'ml-auto flex h-6 shrink-0 items-center justify-center overflow-hidden',
            group.open
              ? 'w-0 opacity-0 group-hover/group-header:w-6 group-hover/group-header:opacity-100 group-focus-within/group-header:w-6 group-focus-within/group-header:opacity-100 group-has-[[data-sidebar=group-action]:is([data-popup-open],[aria-expanded=true])]/group-header:w-6 group-has-[[data-sidebar=group-action]:is([data-popup-open],[aria-expanded=true])]/group-header:opacity-100 pointer-coarse:w-6 pointer-coarse:opacity-100'
              : 'w-6 opacity-100',
          )}
        >
          {/* The motion span turns it: `rotate-*` sets CSS `rotate`, which transition-transform misses. */}
          <motion.span className="inline-flex" animate={{ rotate: group.open ? 90 : 0 }} transition={spring.fast}>
            <ChevronRightIcon size={size.icon} strokeWidth={1.5} className="shrink-0" />
          </motion.span>
        </span>
      </>,
    )
  },
)
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

export interface SidebarGroupActionProps extends HTMLAttributes<HTMLButtonElement> {
  /** Render this element instead of a `<button>`. */
  render?: ReactElement
  /** `render` spelled as the single child element. */
  asChild?: boolean
}

/** True inside a SidebarGroupActions cluster, where each action flows in the row instead of positioning itself. */
const GroupActionsContext = createContext(false)

const SidebarGroupAction = forwardRef<HTMLButtonElement, SidebarGroupActionProps>(
  ({ className, render, asChild, children, style, ...props }, ref) => {
    const shape = useShape()
    const size = useSize()
    const inCluster = useContext(GroupActionsContext)
    const { template, content } = resolveSlotTemplate(render, asChild, children)
    return slotElement(
      template,
      'button',
      {
        ref: ref as Ref<HTMLElement>,
        type: template ? undefined : 'button',
        'data-sidebar': 'group-action',
        className: cn(
          // right-3.5 centres the 24px box 26px from the inner edge: the rows' badge and action axis.
          inCluster ? 'relative' : 'absolute right-3.5 top-3',
          'flex size-6 items-center justify-center text-muted-foreground outline-none',
          'hover:bg-hover hover:text-foreground transition-colors duration-fast',
          'focus-visible:ring-1 focus-visible:ring-focus-ring',
          // Bare icons at a 1.5 stroke, 2 on hover: Button's icon-only treatment.
          '[&_svg]:size-[var(--icon-size)] [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast hover:[&_svg]:stroke-[2]',
          shape.item,
          className,
        ),
        ...props,
        style: { '--icon-size': `${size.icon}px`, ...style } as CSSProperties,
      },
      content,
    )
  },
)
SidebarGroupAction.displayName = 'SidebarGroupAction'

/** Header action cluster: 1–3 `SidebarGroupAction`s in a row over the label's right edge. */
export type SidebarGroupActionsProps = HTMLAttributes<HTMLDivElement>

const SidebarGroupActions = forwardRef<HTMLDivElement, SidebarGroupActionsProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="group-actions"
      // right-3.5: the last action lands on the rows' badge and action axis.
      className={cn('absolute right-3.5 top-2 z-10 flex h-8 items-center gap-1', className)}
      {...props}
    >
      <GroupActionsContext.Provider value={true}>{children}</GroupActionsContext.Provider>
    </div>
  ),
)
SidebarGroupActions.displayName = 'SidebarGroupActions'

const SidebarGroupContent = forwardRef<HTMLDivElement, SidebarSectionProps>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="group-content" className={cn('w-full', className)} {...props} />
))
SidebarGroupContent.displayName = 'SidebarGroupContent'

export { SidebarGroup, SidebarGroupAction, SidebarGroupActions, SidebarGroupContent, SidebarGroupLabel }
