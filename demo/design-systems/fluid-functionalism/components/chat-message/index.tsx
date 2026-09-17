import type { ReactNode } from 'react'
import { ChatMessage as FluidChatMessage } from './chat-message'

/**
 * Fluid Functionalism ChatMessage — a single transcript entry with baked-in
 * spring entrance and layout motion. User messages get a tinted bubble;
 * assistant replies render flush-left plain text; timestamps and actions sit
 * in a hover-revealed meta row. Pulled via
 * `bunx shadcn@latest add @fluid/chat-message`.
 *
 * @example # Conversation
 * The user bubble and the plain assistant reply.
 *
 * ```tsx
 * <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 380, maxWidth: '100%' }}>
 *   <ChatMessage from="user" time="Wednesday 6:08 PM">Summarize the spring tiers.</ChatMessage>
 *   <ChatMessage from="assistant">Fast 80ms for popups, moderate 160ms for panels, slow 240ms when overshoot reads as intent.</ChatMessage>
 * </div>
 * ```
 *
 * @example # Compact size
 * The compact ladder step tightens bubble type and padding.
 *
 * ```tsx
 * <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 380, maxWidth: '100%' }}>
 *   <ChatMessage from="user" size="compact">Compact bubble</ChatMessage>
 *   <ChatMessage from="assistant" size="compact">A smaller sibling of the same hierarchy, not a squeezed copy.</ChatMessage>
 * </div>
 * ```
 */
export default function ChatMessage({ from, time, size, children }: {
  /** Who sent the message; drives alignment and bubble style. @values user, assistant */
  from: 'user' | 'assistant'
  /** Pre-formatted timestamp shown in the hover-revealed meta row (user messages only). */
  time?: ReactNode
  /** Size ladder step; omitted follows the surrounding SizeProvider. @values default, compact */
  size?: 'default' | 'compact'
  /** Message body. */
  children?: ReactNode
}) {
  return (
    <FluidChatMessage from={from} time={time} size={size}>
      {children}
    </FluidChatMessage>
  )
}
