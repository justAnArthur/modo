import type { ReactNode } from 'react'
import {
  Card as FluidCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card'

/**
 * Fluid Functionalism Card — the shadcn compositional card (Header / Title /
 * Description / Content) with the @fluid layer on top: an Elevated surface
 * with a stepped shadow ladder, a weight-animated title, and (via CardGroup)
 * magnetic fluid hover. Pulled via `bunx shadcn@latest add @fluid/card`.
 * Doubles as the docs chrome's Panel slot (see modo.config.ts).
 *
 * @example # Basic
 * ```tsx
 * <Card title="Create project">
 *   <p>You can scope deployments per project.</p>
 * </Card>
 * ```
 *
 * @example # With description
 * ```tsx
 * <Card title="Notifications" description="You have 3 unread messages.">
 *   <p>Push, email, and digest settings live here.</p>
 * </Card>
 * ```
 *
 * @example # Compact size
 * The compact ladder step tightens type and padding for dense layouts.
 *
 * ```tsx
 * <Card size="compact" title="Deploy" description="Ship the current branch.">
 *   <p>Builds run on merge.</p>
 * </Card>
 * ```
 *
 * @example # Composed
 * Cards compose with the other registry items, e.g. a call to action.
 *
 * ```tsx
 * <Card title="Deploy" description="Ship the current branch to production.">
 *   <Button>Deploy now</Button>
 * </Card>
 * ```
 */
export default function Card({ title, description, size = 'default', children }: {
  /** Card heading; omit for a content-only card. */
  title?: string
  /** Muted secondary line under the title. */
  description?: string
  /** Size ladder step; compact tightens type and padding. @values default, compact */
  size?: 'default' | 'compact'
  /** Card body. */
  children?: ReactNode
}) {
  return (
    <FluidCard size={size}>
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </FluidCard>
  )
}
