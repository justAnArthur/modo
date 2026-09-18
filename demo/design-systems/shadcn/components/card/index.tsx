/*
 * Vendored from the shadcn/ui registry (style "radix-nova", base color
 * "neutral"), pulled with `bunx shadcn@latest add card` (shadcn CLI 4.21.0).
 * MIT License © Vercel Inc. — https://ui.shadcn.com
 * Local modifications: modo item docs — TSDoc on Card, default export,
 * compound statics (Card.Header, …); component code untouched.
 */

import * as React from "react"
import { cn } from "cn"

/**
 * shadcn/ui Card — grouped content container. Compound: sub-parts hang off
 * Card as attributes.
 * Pulled via `bunx shadcn@latest add card` (radix-nova style, neutral base color).
 *
 * @example # Basic
 * ```tsx
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Create project</Card.Title>
 *     <Card.Description>You can scope deployments per project.</Card.Description>
 *   </Card.Header>
 *   <Card.Content>
 *     <p>Push, email, and digest settings live here.</p>
 *   </Card.Content>
 * </Card>
 * ```
 *
 * @example # Footer and action
 * Cards compose with the other registry items, e.g. a call to action.
 *
 * ```tsx
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Deploy</Card.Title>
 *     <Card.Action><Button size="sm">Ship</Button></Card.Action>
 *     <Card.Description>Ship the current branch to production.</Card.Description>
 *   </Card.Header>
 *   <Card.Content>Build #1284 · vercel/prod</Card.Content>
 *   <Card.Footer>Last deployed 2 minutes ago</Card.Footer>
 * </Card>
 * ```
 */
export default function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/* Declaration merging: the compound members of Card. */
interface Card {
  /** Top region — title, description, action. */
  Header: typeof CardHeader
  /** Card heading. */
  Title: typeof CardTitle
  /** Muted secondary line under the title. */
  Description: typeof CardDescription
  /** Top-right action slot. */
  Action: typeof CardAction
  /** Body region. */
  Content: typeof CardContent
  /** Bottom region. */
  Footer: typeof CardFooter
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Action = CardAction
Card.Content = CardContent
Card.Footer = CardFooter

export {
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
