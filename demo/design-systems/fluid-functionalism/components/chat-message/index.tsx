/*
 * Vendored from the Fluid Functionalism registry (@fluid namespace,
 * fluidfunctionalism.com — MIT License © 2026 Micka Touillaud), pulled with
 * `bunx shadcn@latest add @fluid/chat-message` (shadcn CLI 4.21.0) into a scratch
 * scaffold. Local modifications: `@/…` imports rewritten to relative paths for the modo layout; `framer-motion` imports rewritten to `motion/react`; `"use client"` directives dropped (non-RSC). modo item docs: TSDoc on the component, compound static (ChatMessage.FileThumbnail); file renamed to index.tsx (the former adapter is gone).
 */

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "../../_fluid/utils";
import { spring } from "../../_fluid/springs";
import { useShape } from "../../_fluid/shape-context";
import { useSize, type SizeVariant } from "../../_fluid/size-context";
import { useTouchPrimary } from "../../_fluid/use-touch-primary";
import { FileThumbnail } from "./file-thumbnail";

interface ChatMessageProps
  extends Omit<HTMLMotionProps<"div">, "children"> {
  /** Who sent the message. Drives alignment and bubble colour:
   *  `user` → right-aligned accent bubble, `assistant` → left-aligned plain text. */
  from: "user" | "assistant";
  /** Optional attachments rendered as square thumbnails above the bubble. */
  files?: File[];
  /** Side length of each attachment thumbnail in pixels. Defaults to 64. */
  thumbnailSize?: number;
  /** Timestamp shown in the hover-revealed meta row, before the actions.
   *  User-message only — ignored on assistant replies. Caller pre-formats it
   *  (e.g. `"Wednesday 6:08 PM"`). */
  time?: ReactNode;
  /** Icon-only action buttons shown in the hover-revealed meta row (e.g. copy,
   *  edit, regenerate). Rendered next to the timestamp. */
  actions?: ReactNode;
  /** Message body. When omitted the text bubble is dropped (attachment-only message). */
  children?: ReactNode;
  /** Pins the message to one step of the size ladder (see /docs/sizes) —
   *  compact tightens bubble type and padding. Omitted, it follows the
   *  surrounding SizeProvider. */
  size?: SizeVariant;
}

// ─── ChatMessage ──────────────────────────────────────────────────────────
// A single transcript entry with baked-in entrance + layout motion. Pairs with
// InputMessage's onSend: render one per sent/received message. `layout="position"`
// lets earlier messages slide up smoothly when a new one is appended.

/**
 * Fluid Functionalism ChatMessage — a single transcript entry with baked-in
 * spring entrance and layout motion. User messages get a tinted bubble;
 * assistant replies render flush-left plain text; timestamps and actions sit
 * in a hover-revealed meta row. Compound: the attachment renderer hangs off
 * ChatMessage as `ChatMessage.FileThumbnail`.
 * Pulled via `bunx shadcn@latest add @fluid/chat-message`.
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
const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  (
    { from, files, thumbnailSize = 64, time, actions, children, size, className, ...props },
    ref
  ) => {
    const shape = useShape();
    const compact = useSize(size).variant === "compact";
    const isUser = from === "user";
    // Hover-reveal is unreachable on touch — keep the meta row visible there.
    const isTouch = useTouchPrimary();
    // Timestamps are a user-message affordance; assistant replies show actions only.
    const showTime = isUser && time != null;

    return (
      <motion.div
        ref={ref}
        layout="position"
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.moderate}
        style={{ transformOrigin: isUser ? "bottom right" : "bottom left" }}
        className={cn(
          "group flex max-w-[80%] flex-col gap-1.5",
          isUser ? "items-end self-end" : "items-start self-start",
          className
        )}
        {...props}
      >
        {files && files.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-1.5",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {files.map((file, i) => (
              <FileThumbnail
                key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                file={file}
                size={thumbnailSize}
              />
            ))}
          </div>
        )}
        {children != null && children !== "" && (
          <div
            className={cn(
              "whitespace-pre-wrap break-words",
              compact ? "py-1.5 text-[13px]" : "py-2 text-[14px]",
              // User keeps the bubble chrome (rounded fill + horizontal padding);
              // the assistant reply is flush-left plain text with no background.
              isUser
                ? cn(
                    shape.bg,
                    compact ? "px-3" : "px-3.5",
                    // `text-pretty` is reserved for settled user bubbles. On the
                    // assistant reply it's left off on purpose: `text-wrap: pretty`
                    // re-balances the last lines on every content change, so a
                    // word-by-word stream visibly reflows earlier words to new
                    // lines. Default (normal) wrapping appends left-to-right and
                    // stays put as the text grows.
                    "text-pretty bg-[color-mix(in_oklab,var(--accent),var(--background)_45%)] text-accent-foreground"
                  )
                : "text-foreground"
            )}
          >
            {children}
          </div>
        )}
        {(showTime || actions != null) && (
          // Meta row: timestamp + icon-only actions. Always rendered (so it
          // reserves its height and the gap between bubbles never shifts) but
          // hidden until the message is hovered or an action is focused.
          // The timestamp is a user-message affordance only — assistant replies
          // show their actions alone. User rows read date → icons left-to-right.
          <div
            className={cn(
              "flex items-center gap-2 px-1 leading-none text-muted-foreground select-none",
              compact ? "text-[11px]" : "text-[12px]",
              !isTouch && [
                "opacity-0 pointer-events-none transition-opacity duration-150",
                "group-hover:opacity-100 group-hover:pointer-events-auto",
                "group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
              ]
            )}
          >
            {showTime && <span className="tabular-nums">{time}</span>}
            {actions != null && (
              <span className="flex items-center gap-0.5">{actions}</span>
            )}
          </div>
        )}
      </motion.div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";

/* Compound member: the attachment renderer (forwardRef consts can't take
   expando assignments, so Object.assign carries the type). */
Object.assign(ChatMessage, { FileThumbnail });

export { ChatMessage };
export type { ChatMessageProps };
export default ChatMessage;
