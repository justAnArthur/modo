/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef, type HTMLAttributes, type InputHTMLAttributes } from 'react'
import { fieldVariants } from '../../../lib/field-classes'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'

export type SidebarInsetProps = HTMLAttributes<HTMLElement>

const SidebarInset = forwardRef<HTMLElement, SidebarInsetProps>(({ className, ...props }, ref) => {
  const shape = useShape()
  return (
    <main
      ref={ref}
      data-slot="sidebar-inset"
      className={cn(
        'relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background',
        'peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:peer-data-[side=left]:ml-0 peer-data-[variant=inset]:peer-data-[side=right]:mr-0',
        // Collapsed away, the sidebar side gets its margin back: symmetric insets.
        'peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=left]:ml-2 peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=right]:mr-2',
        'transition-[margin] duration-fast',
        shape.bgRadius >= 20 ? 'peer-data-[variant=inset]:rounded-3xl' : 'peer-data-[variant=inset]:rounded-xl',
        'peer-data-[variant=inset]:bg-surface-2 peer-data-[variant=inset]:shadow-surface-2',
        className,
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = 'SidebarInset'

export type SidebarInputProps = InputHTMLAttributes<HTMLInputElement>

const SidebarInput = forwardRef<HTMLInputElement, SidebarInputProps>(({ className, ...props }, ref) => {
  const shape = useShape()
  const size = useSize()
  return (
    <input
      ref={ref}
      data-sidebar="input"
      className={cn(
        fieldVariants(),
        'w-full px-3 text-foreground placeholder:text-muted-foreground outline-none',
        'focus-visible:ring-focus-ring',
        size.variant === 'compact' ? 'h-7' : 'h-8',
        size.text,
        shape.input,
        className,
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = 'SidebarInput'

export type SidebarSectionProps = HTMLAttributes<HTMLDivElement>

const SidebarHeader = forwardRef<HTMLDivElement, SidebarSectionProps>(({ className, ...props }, ref) => (
  <div ref={ref} data-sidebar="header" className={cn('flex shrink-0 flex-col gap-2 p-2', className)} {...props} />
))
SidebarHeader.displayName = 'SidebarHeader'

const SidebarFooter = forwardRef<HTMLDivElement, SidebarSectionProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="footer"
    className={cn('mt-auto flex shrink-0 flex-col gap-2 p-2', className)}
    {...props}
  />
))
SidebarFooter.displayName = 'SidebarFooter'

const SidebarSeparator = forwardRef<HTMLDivElement, SidebarSectionProps>(({ className, ...props }, ref) => (
  // biome-ignore lint/a11y/useSemanticElements: a div keeps the section props and ref type
  <div
    ref={ref}
    data-sidebar="separator"
    role="separator"
    aria-orientation="horizontal"
    className={cn('mx-2 h-px shrink-0 bg-border', className)}
    {...props}
  />
))
SidebarSeparator.displayName = 'SidebarSeparator'

export { SidebarFooter, SidebarHeader, SidebarInput, SidebarInset, SidebarSeparator }
