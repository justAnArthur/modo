/*
 * Authored for the modo showcase following the pattern documented by shadcn/ui
 * (https://ui.shadcn.com/docs/components/link): an anchor styled with the
 * vendored button's `buttonVariants()`. shadcn itself ships no Link component.
 * MIT License © Vercel Inc. for the referenced pattern.
 */

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { buttonVariants } from "../button/button"

function Link({
  className,
  variant,
  ...props
}: React.ComponentProps<"a"> & VariantProps<typeof buttonVariants>) {
  return (
    <a
      data-slot="link"
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Link }
