/*
 * Vendored from the shadcn/ui registry (style "radix-nova", base color
 * "neutral"), pulled with `bunx shadcn@latest add separator` (as a dependency
 * of the login-02 block; shadcn CLI 4.21.0). MIT License © Vercel Inc.
 * — https://ui.shadcn.com
 * Local modifications: `radix-ui` import repointed to the pre-bundled
 */

"use client"

import * as React from "react"
import { cn } from "cn"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
