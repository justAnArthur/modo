import { ThinkingIndicator as FluidThinkingIndicator } from './thinking-indicator'

/**
 * Fluid Functionalism ThinkingIndicator — the assistant's working state: a
 * morphing circle-to-infinity glyph plus a shimmering label that cycles
 * Thinking, Moonwalking, Planning, Refining with spring word swaps. Pulled
 * via `bunx shadcn@latest add @fluid/thinking-indicator`.
 *
 * @example # Basic
 * ```tsx
 * <ThinkingIndicator />
 * ```
 *
 * @example # Text only
 * Drop the glyph for an inline indicator, e.g. before a streamed reply.
 *
 * ```tsx
 * <ThinkingIndicator showIcon={false} />
 * ```
 *
 * @example # Compact
 * The compact ladder step for dense transcripts.
 *
 * ```tsx
 * <ThinkingIndicator size="compact" />
 * ```
 */
export default function ThinkingIndicator({ showIcon = true, size }: {
  /** Show the morphing circle-infinity glyph before the label. */
  showIcon?: boolean
  /** Size ladder step; omitted follows the surrounding SizeProvider. @values default, compact */
  size?: 'default' | 'compact'
}) {
  return <FluidThinkingIndicator showIcon={showIcon} size={size} />
}
