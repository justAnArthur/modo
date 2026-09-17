/*
 * Vendored from the shadcn/ui registry (style "radix-nova", base color
 * "neutral"), pulled with `bunx shadcn@latest add label` (as a dependency of
 * the login-02 block; shadcn CLI 4.21.0). MIT License © Vercel Inc.
 * — https://ui.shadcn.com
 * Local modifications: `radix-ui` import repointed to the pre-bundled
 */

import * as React from "react"
import { cn } from "cn"
import { Label as LabelPrimitive } from "radix-ui"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
