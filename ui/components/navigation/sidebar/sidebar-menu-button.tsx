/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'motion/react'
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  type ReactElement,
  useContext,
  useRef,
} from 'react'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { resolveSlotTemplate, slotElement } from '../../../lib/slot'
import { spring } from '../../../lib/springs'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'
import { cn } from '../../../lib/utils'
import { gutterVars, MenuItemContext, SidebarSelection, useRowState } from './menu-scope'
import { MenuRowLabel } from './row-label'

export const sidebarMenuButtonVariants = cva(
  // The trailing gutter is the row's exact reservation (`gutterVars`): one
  // rule per state, not a class per count, badge and reveal. A disabled row
  // passes pointer events through to the row (a browser sends none to a
  // disabled button), so the fluid hover still sees the moves and skips it.
  'peer/menu-button relative z-10 flex w-full cursor-pointer select-none items-center gap-2 pl-2 text-left outline-none disabled:opacity-50 disabled:pointer-events-none transition-[padding] duration-fast pr-[var(--row-gutter)] group-hover/menu-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-item:pr-[var(--row-gutter-hover)] group-hover/menu-sub-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-sub-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-popup-open],[aria-expanded=true])]/menu-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-popup-open],[aria-expanded=true])]/menu-sub-item:pr-[var(--row-gutter-hover)]',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border border-border bg-background',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface SidebarMenuButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  /** Forces the active row. */
  isActive?: boolean
  /** Pins the row to a step of the size ladder (32px default, 28px compact). Omitted, it follows the menu. */
  size?: SizeVariant
  /** Glyph in the leading slot. */
  icon?: IconComponent
  /** A thread's state: the dot (`active` and `unread` filled, `idle` a ring), `data-status`, an "unread" for screen readers, and `"active"` implies `isActive`. */
  status?: 'active' | 'unread' | 'idle'
  /** A dot in the icon column when `status`'s vocabulary doesn't fit; overrides the status dot. Ignored with `icon`. */
  dot?: 'filled' | 'ring'
  /** Selection key: the row is active while the surrounding `Sidebar`'s `value` matches, and pressing it selects it. With a `value`, `status="active"` no longer implies the active row. */
  value?: string
  /** Render this element (a link) as the row. */
  render?: ReactElement
  /** `render` spelled as the single child element. */
  asChild?: boolean
}

const SidebarMenuButton = forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  (
    {
      isActive = false,
      size,
      variant,
      icon: Icon,
      status,
      dot,
      value,
      render,
      asChild,
      className,
      style,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const item = useContext(MenuItemContext)
    const selection = useContext(SidebarSelection)
    const shape = useShape()
    const sizeClasses = useSize(size)
    const buttonRef = useRef<HTMLElement | null>(null)
    const ChevronRightIcon = useIcon('chevron-right')
    const subOpen = item?.subOpen
    const collapsible = subOpen !== undefined

    const effectiveActive = isActive || (value === undefined ? status === 'active' : selection?.value === value)

    const setActive = item?.setActive
    useIsoLayoutEffect(() => {
      setActive?.(effectiveActive)
      return () => setActive?.(false)
    }, [effectiveActive, setActive])

    const setButtonEl = item?.setButtonEl
    useIsoLayoutEffect(() => {
      setButtonEl?.(buttonRef.current)
      return () => setButtonEl?.(null)
    }, [setButtonEl])
    const resolvedDot = dot ?? (status ? (status === 'idle' ? 'ring' : 'filled') : undefined)
    const row = useRowState(item?.rowRef)
    const lit = effectiveActive || row.isHovered
    const tabIdx = effectiveActive || row.isTabStop ? 0 : -1

    const { template, content } = resolveSlotTemplate(render, asChild, children)

    const inner = (
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
        {!Icon && resolvedDot && (
          <span
            className="flex shrink-0 items-center justify-center"
            style={{ width: sizeClasses.icon, height: sizeClasses.icon }}
          >
            <span
              className={cn(
                'size-2 rounded-full transition-colors duration-fast',
                resolvedDot === 'filled'
                  ? lit
                    ? 'bg-foreground/60'
                    : 'bg-muted-foreground/50'
                  : lit
                    ? 'border border-foreground/60'
                    : 'border border-muted-foreground/50',
              )}
            />
          </span>
        )}
        <MenuRowLabel content={content} lit={lit} emphasized={effectiveActive} textClass={sizeClasses.text} />
        {status === 'unread' && <span className="sr-only">, unread</span>}
        {/* At rest the chevron shows only on a closed row, so an open tree isn't a column of arrows. */}
        {collapsible && (
          <span className="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
            <motion.span className="inline-flex" animate={{ rotate: subOpen ? 90 : 0 }} transition={spring.fast}>
              <ChevronRightIcon
                size={sizeClasses.icon}
                strokeWidth={1.5}
                className={cn(
                  'text-muted-foreground transition-opacity duration-fast',
                  subOpen
                    ? 'opacity-0 group-hover/parent-row:opacity-100 group-focus-within/parent-row:opacity-100'
                    : 'opacity-100',
                )}
              />
            </motion.span>
          </span>
        )}
      </>
    )

    return slotElement(
      template,
      'button',
      {
        ref: mergeRefs(buttonRef, ref),
        type: template ? undefined : 'button',
        'data-sidebar': 'menu-button',
        'data-size': sizeClasses.variant,
        'data-active': effectiveActive ? 'true' : undefined,
        'data-status': status,
        'aria-current': effectiveActive ? 'page' : undefined,
        'aria-expanded': subOpen,
        tabIndex: tabIdx,
        className: cn(
          sidebarMenuButtonVariants({ variant }),
          sizeClasses.variant === 'compact' ? 'h-7' : 'h-8',
          shape.item,
          collapsible && 'group/parent-row',
          className,
        ),
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          onClick?.(event)
          if (collapsible) item?.toggleSub()
          else if (value !== undefined) selection?.select(value)
        },
        ...props,
        // The chevron takes the trailing slot: a collapsible row keeps the widened gutter at rest.
        style: {
          ...gutterVars(item),
          ...(collapsible && { '--row-gutter': 'var(--row-gutter-hover)' }),
          ...style,
        } as CSSProperties,
      },
      inner,
    )
  },
)
SidebarMenuButton.displayName = 'SidebarMenuButton'

export { SidebarMenuButton }
