/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { motion } from 'motion/react'
import {
  type AnchorHTMLAttributes,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  useContext,
  useRef,
} from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { inertProps } from '../../../lib/inert'
import { mergeRefs, useMergeRefs } from '../../../lib/merge-refs'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { resolveSlotTemplate, slotElement } from '../../../lib/slot'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'
import { cn } from '../../../lib/utils'
import { gutterVars, MenuItemContext, MenuScopeContext, SidebarSelection } from './menu-scope'
import { MenuRowLabel } from './row-label'
import { useMeasuredCollapse } from './use-measured-collapse'

export interface SidebarMenuSubProps extends HTMLAttributes<HTMLUListElement> {
  /** Folds the sub-menu. Omitted, it follows its `collapsible` row, or stays open without one. */
  open?: boolean
}

const SidebarMenuSub = forwardRef<HTMLUListElement, SidebarMenuSubProps>(
  ({ className, open: openProp, children, ...props }, ref) => {
    const row = useContext(MenuItemContext)
    const open = openProp ?? row?.subOpen ?? true
    // Not its own highlight scope: the rows register with the surrounding
    // SidebarMenu, so one hover glides from a parent into its children. A
    // toggle flips their visibility in place, so the scope re-reads it.
    const refreshVisibility = useContext(MenuScopeContext)?.refreshVisibility
    useIsoLayoutEffect(() => {
      refreshVisibility?.()
    }, [open, refreshVisibility])

    const fold = useMeasuredCollapse<HTMLUListElement>(open)
    const list = useMergeRefs(fold.contentRef, ref)

    return (
      <motion.div
        data-slot="sidebar-menu-sub-wrapper"
        className={cn('overflow-hidden', !fold.measured && !open && 'h-0')}
        {...fold.motion}
        onAnimationComplete={fold.settle}
      >
        <ul
          ref={list}
          data-sidebar="menu-sub"
          data-state={open ? 'open' : 'closed'}
          aria-hidden={open ? undefined : true}
          {...inertProps(!open)}
          className={cn(
            // A margin, not a translate, so the measured rects include it:
            // 15px + the 1px border + pl-2 + the row's pl-2 lands the label on
            // the parent label's 32px axis.
            'relative ml-[15px] flex min-w-0 flex-col border-l border-border pl-2 select-none',
            className,
          )}
          {...props}
        >
          {children}
        </ul>
      </motion.div>
    )
  },
)
SidebarMenuSub.displayName = 'SidebarMenuSub'

export interface SidebarMenuSubButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Forces the active row. */
  isActive?: boolean
  /** Pins the row to a step of the size ladder (28px default, 24px compact). Omitted, it follows the menu. */
  size?: SizeVariant
  /** Glyph in the leading slot. */
  icon?: IconComponent
  /** Selection key, as on `SidebarMenuButton`. Without an `href` the row renders a button. */
  value?: string
  /** Render this element as the row. */
  render?: ReactElement
  /** `render` spelled as the single child element. */
  asChild?: boolean
}

const SidebarMenuSubButton = forwardRef<HTMLAnchorElement, SidebarMenuSubButtonProps>(
  (
    {
      isActive: isActiveProp = false,
      size,
      icon: Icon,
      value,
      render,
      asChild,
      className,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const item = useContext(MenuItemContext)
    const selection = useContext(SidebarSelection)
    const isActive = isActiveProp || (value !== undefined && selection?.value === value)
    const shape = useShape()
    const sizeClasses = useSize(size)
    const buttonRef = useRef<HTMLElement | null>(null)

    const setActive = item?.setActive
    useIsoLayoutEffect(() => {
      setActive?.(isActive)
      return () => setActive?.(false)
    }, [isActive, setActive])

    const setButtonEl = item?.setButtonEl
    useIsoLayoutEffect(() => {
      setButtonEl?.(buttonRef.current)
      return () => setButtonEl?.(null)
    }, [setButtonEl])

    const lit = isActive || (item?.isHovered ?? false)
    const { template, content } = resolveSlotTemplate(render, asChild, children)
    const asButton = !template && value !== undefined && props.href === undefined

    return slotElement(
      template,
      asButton ? 'button' : 'a',
      {
        type: asButton ? 'button' : undefined,
        ref: mergeRefs(buttonRef, ref),
        'data-sidebar': 'menu-sub-button',
        'data-size': sizeClasses.variant,
        'data-active': isActive ? 'true' : undefined,
        'aria-current': isActive ? 'page' : undefined,
        tabIndex: isActive ? 0 : -1,
        className: cn(
          'relative z-10 flex w-full cursor-pointer select-none items-center gap-2 pl-2 text-left outline-none',
          'transition-[padding] duration-fast pr-[var(--row-gutter)] group-hover/menu-sub-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-sub-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-popup-open],[aria-expanded=true])]/menu-sub-item:pr-[var(--row-gutter-hover)]',
          sizeClasses.variant === 'compact' ? 'h-6' : 'h-7',
          shape.item,
          className,
        ),
        onClick: (event: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event)
          if (value !== undefined) selection?.select(value)
        },
        ...props,
        style: { ...gutterVars(item), ...props.style } as CSSProperties,
      },
      <>
        {Icon && (
          <Icon
            size={sizeClasses.icon}
            strokeWidth={lit ? 2 : 1.5}
            className={cn(
              'shrink-0 transition-[color,stroke-width] duration-fast',
              lit ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
        )}
        {/* Sub-rows keep the parent rows' type: only the row height steps down. */}
        <MenuRowLabel content={content} lit={lit} emphasized={isActive} textClass={sizeClasses.text} />
      </>,
    )
  },
)
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'

export { SidebarMenuSub, SidebarMenuSubButton }
