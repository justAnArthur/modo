/*!
 * A borderless button field with a trailing chevron, on modo-ui's field box:
 * a row of pickers (profile, project, branch, model) reads as one strip of
 * Select triggers. Forwards a popover or menu trigger's props.
 */

'use client'

import { useFieldBox } from '@justanarthur/modo-ui/lib/field-box'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { useIcon } from './icons'

export const RowTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, className, disabled, ...props }, ref) => {
    const field = useFieldBox({ variant: 'borderless', disabled })
    const Chevron = useIcon('chevron-down')
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        {...field.props}
        className={cn(
          field.props.className,
          'flex cursor-pointer items-center outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
          field.size.control,
          field.size.text,
          field.size.gap,
          className,
        )}
        {...props}
      >
        {children}
        <Chevron
          size={field.size.icon}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground transition-[color] duration-fast group-hover/field:text-foreground"
        />
      </button>
    )
  },
)
RowTrigger.displayName = 'RowTrigger'
