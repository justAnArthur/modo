/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `framer-motion` → `motion/react`; `@/lib/*` and `@/hooks/*` rewritten to
 *   `../../_fluid/*`; `@/components/ui/fluid-hover-highlight` →
 *   `../../_fluid/ui/fluid-hover-highlight`; `@/registry/radix/{button,tooltip}` →
 *   `../button` / `../tooltip`; `@/registry/default/file-thumbnail` → `./file-thumbnail`
 *   (vendored beside this file).
 * - Uncontrolled twins (Base UI shape, via `_fluid/hooks/use-controllable-state`), so the
 *   composer works with no state in the caller. The controlled API is unchanged — every
 *   `value` / `files` / `queue` / `status` prop still wins and still reports through its
 *   callback:
 *     · `value` / `onValueChange` are now optional and gain `defaultValue`;
 *     · `defaultFiles` seeds an internal file list — attachments are enabled by
 *       `onFilesChange` OR `defaultFiles` (upstream: `onFilesChange` alone);
 *     · `defaultQueue` seeds an internal queue — the queue is enabled by
 *       `onQueueChange` OR `defaultQueue`, still only alongside a status;
 *     · `defaultStatus` seeds an internal status (plus an optional `onStatusChange`);
 *       with the status uncontrolled the Stop control is offered even without
 *       `onStop` and flips the status to `"idle"` itself, which is the edge that
 *       auto-dispatches the head of the queue;
 *     · an uncontrolled draft / file list clears itself after `onSend`, which a
 *       controlled consumer does by hand.
 * - React 18 / `noUncheckedIndexedAccess`: `useRef<HTMLDivElement | null>` where the ref is
 *   assigned, guards on `queue[0]`, `history[i]`, `suggestions[i]` and the swap in
 *   `moveQueued`, and `FilePreviewTile` turned into a `forwardRef` — it renders inside
 *   `<AnimatePresence mode="popLayout">`, which measures the exiting child through a ref
 *   (React 19 passes `ref` as a plain prop; React 18 warns and drops it).
 * - modo item: TSDoc from the FF "InputMessage" docs page (its Playground section is
 *   skipped, and the transcript around the Attachments / Send Handler demos is dropped —
 *   `ChatMessage` is not part of this port).
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; `leading-[18px]` → `leading-4.5`; inline
 *   `fontVariationSettings` → `weight-*`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`; literal colors → color tokens;
 *   `rounded-[Npx]` → radius tokens; `duration-80|120|160` and tier-length JS
 *   durations → `duration-<tier>` / `spring.*`.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion, Reorder, useReducedMotion } from "motion/react";
import { cn } from "../../_fluid/lib/utils";
import { spring } from "../../_fluid/lib/springs";
import { useShape } from "../../_fluid/lib/shape-context";
import { SizeProvider, useSize, type SizeVariant } from "../../_fluid/lib/size-context";
import { useIcon } from "../../_fluid/lib/icon-context";
import { surfaceClasses } from "../../_fluid/lib/surface-classes";
import { SurfaceProvider } from "../../_fluid/lib/surface-context";
import { useFluidHover, useRegisterFluidHoverItem } from "../../_fluid/hooks/use-fluid-hover";
import { useControllableState } from "../../_fluid/hooks/use-controllable-state";
import { FileThumbnail } from "./file-thumbnail";
import { Button } from "../button";
import { Tooltip } from "../tooltip";
import { FluidHoverHighlight } from "../../_fluid/ui/fluid-hover-highlight";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Measured layout height for one of the composer's collapsible regions
 * (attachments, queue, suggestions).
 *
 * These animate to a self-measured PIXEL height rather than `height: "auto"`:
 * motion resolves an "auto" target from the element's *visual* (transformed)
 * size, so under a scaled ancestor the region springs out to scale× its real
 * height and snaps back when "auto" lands, which reads as the region
 * ballooning and then correcting. Same treatment as Accordion's content
 * height.
 *
 * Returns a ref for the region's CONTENT element. The height it reports is the
 * clipping parent's scrollHeight, so inner margins count (the parent's
 * overflow-hidden makes it a block formatting context, so they don't collapse
 * out) and the value stays correct while the animated height is mid-flight.
 * Observing the child rather than the parent keeps the ResizeObserver out of a
 * feedback loop with that animation.
 */
function useRegionHeight() {
  const roRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const sync = () => {
      const next = el.parentElement?.scrollHeight ?? el.offsetHeight;
      if (next > 0) setHeight(next);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    roRef.current = ro;
  }, []);
  return [ref, height] as const;
}

// Touch devices have no hover, so hover-revealed affordances (like a queued
// row's × button) would never appear. `(hover: none)` flags those so they can
// be shown persistently instead. SSR-safe: starts false, resolves on mount.
function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isTouch;
}

const DEFAULT_ACCEPT = "image/png,image/jpeg,application/pdf";

// Stable empty seeds: `useControllableState` reads its default once, but a
// fresh literal on every render would still churn the identity it stores.
const NO_FILES: File[] = [];
const NO_QUEUE: QueuedMessage[] = [];

type InputMessageStatus = "idle" | "streaming";

interface InputMessageSlotContext {
  /** Opens the native file picker via the hidden `<input type="file">`.
   *  Pass `acceptOverride` (e.g. `"image/*"`) to scope the picker to a
   *  subset of the component's accept types just for this invocation. */
  openFilePicker: (acceptOverride?: string) => void;
  /** Currently-attached files. */
  files: File[];
}

type InputMessageSlot =
  | ReactNode
  | ((ctx: InputMessageSlotContext) => ReactNode);

/** A message held in the queue while the assistant is responding. Carries the
 *  trimmed text plus a snapshot of the files attached when it was queued, so
 *  double-click-to-edit can restore both. `id` is a stable key minted on enqueue. */
interface QueuedMessage {
  id: string;
  text: string;
  files: File[];
}

interface InputMessageProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Step on the size ladder (see Sizes). Wins over the surrounding SizeProvider and propagates to the composer's rows, buttons and queued messages. */
  size?: SizeVariant;
  /** Controlled textarea value. Pair with `onValueChange`; omit both for an uncontrolled composer. */
  value?: string;
  /** Initial textarea value for an uncontrolled composer. Defaults to `""`. */
  defaultValue?: string;
  /** Called with the new value on every textarea change. */
  onValueChange?: (value: string) => void;
  /** Fires on Enter (without Shift) or send-button click, and when a queued message auto-dispatches. Receives the trimmed value, the attached files, and — for auto-dispatched queue items — `meta.queuedId`. Skipped when the value is empty and no files are attached. */
  onSend?: (value: string, files: File[], meta?: { queuedId?: string }) => void;
  /** Placeholder shown when the value is empty. While a file is dragged over the component (and attachments are enabled) it swaps to "Drop files here to add to chat". Defaults to `"Ask me anything…"`. */
  placeholder?: string;
  /** Content rendered in the bottom-left action area. May be a render-fn that receives `{ openFilePicker, files }` — `openFilePicker(acceptOverride?)` opens the native file picker. */
  leftSlot?: InputMessageSlot;
  /** Content rendered in the bottom-right action area, before the built-in send button. Same render-fn shape as `leftSlot`. */
  rightSlot?: InputMessageSlot;
  /** Disables the textarea, send button, and drag-and-drop. Defaults to `false`. */
  disabled?: boolean;
  /** Minimum visible rows before the textarea grows. Defaults to 1. */
  minRows?: number;
  /** Maximum visible rows before the textarea starts to scroll. Defaults to 8. */
  maxRows?: number;
  /** When true, clicking anywhere on the surrounding container (outside of buttons / links / inputs) focuses the textarea. Defaults to `true`. */
  clickToFocus?: boolean;
  /** Accessible label for the send button. Defaults to `"Send"`. */
  sendLabel?: string;
  /** Controlled list of attached files. Pair with `onFilesChange` to enable drag-and-drop and the file-picker slot helper. */
  files?: File[];
  /** Initial attachments for an uncontrolled composer. Providing it (even as `[]`) enables attachment behavior on its own. */
  defaultFiles?: File[];
  /** Called when files are added (drag-drop or picker) or removed via the preview tile's × button. Duplicate drops of the same file (same name + size + lastModified) are silently de-duplicated. */
  onFilesChange?: (files: File[]) => void;
  /** Accepted MIME types as a comma-separated string. Used by both the file picker and the drag-and-drop filter. Defaults to `"image/png,image/jpeg,application/pdf"`. */
  accept?: string;
  /** Maximum number of attached files. Extra files beyond this limit are dropped. */
  maxFiles?: number;
  /** Side length (in pixels) of each preview tile. Images use object-cover; PDFs render the first page via pdfjs; other types fall back to a centered icon. Defaults to 80. */
  filePreviewSize?: number;
  /** Extra props forwarded to the underlying textarea (value, onChange, onKeyDown, disabled and placeholder are controlled by the component). */
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onKeyDown" | "disabled" | "placeholder">;
  /** Assistant response state. When `"streaming"`, the send button becomes a Stop control (empty draft) or a Queue action (non-empty draft). On the streaming→idle edge the next queued message auto-dispatches via `onSend`. Leave it and `defaultStatus` undefined for the send-immediately behavior. */
  status?: InputMessageStatus;
  /** Initial status for an uncontrolled composer — the component then owns the streaming flag, and Stop flips it to `"idle"` itself. */
  defaultStatus?: InputMessageStatus;
  /** Called whenever the status changes while it is uncontrolled (currently: the Stop control). */
  onStatusChange?: (status: InputMessageStatus) => void;
  /** Fires when the Stop control is pressed (streaming + empty draft). Halt the current response and set status to `"idle"` — that edge immediately dispatches the next queued message. */
  onStop?: () => void;
  /** Controlled queue of pending messages, rendered as reorderable rows above the textarea. Double-click (or Enter/F2) edits a row back into the composer; the × (or Delete) removes it; drag — or Alt+↑/↓ — reorders. Requires a status. */
  queue?: QueuedMessage[];
  /** Initial queue for an uncontrolled composer. Providing it (even as `[]`) enables the queue on its own, alongside `status` or `defaultStatus`. */
  defaultQueue?: QueuedMessage[];
  /** Called whenever the queue changes — enqueue, edit, delete, reorder, or auto-dispatch. Each QueuedMessage is `{ id, text, files }`. */
  onQueueChange?: (queue: QueuedMessage[]) => void;
  /** Render the built-in reorderable queue rows above the textarea. Set to false to suppress them and render the queue yourself — enqueue and auto-dispatch still run. Defaults to `true`. */
  showQueue?: boolean;
  /** Previously-sent messages, oldest first. With the textarea focused, ArrowUp (caret on the first line) recalls the previous message and walks backward; ArrowDown (caret on the last line) walks forward toward the in-progress draft. Editing or sending exits history mode. Defaults to `[]`. */
  history?: string[];
  /** Suggested prompt rendered as the placeholder (with a Tab keycap) while the draft is empty. Pressing Tab fills it into the composer — it doesn't send. Takes precedence over `placeholder`. */
  placeholderSuggestion?: string;
  /** Suggested prompts listed under the action bar while the draft is empty. ArrowDown moves a highlight into the list (focus stays in the textarea), ArrowUp walks back up and out, Enter or click fills the highlighted prompt. Escape drops the highlight; typing collapses the list. */
  suggestions?: string[];
  /** Extra classes for the composer surface. */
  className?: string;
}

// ─── File preview tile ────────────────────────────────────────────────────
// Composer-row tile: a FileThumbnail wrapped with enter/exit motion and a
// hover-revealed remove (×) button.
interface FilePreviewTileProps {
  file: File;
  onRemove: () => void;
  size: number;
}

// React 18: the tile is rendered inside `<AnimatePresence mode="popLayout">`,
// which measures the exiting child through a ref. Upstream can be a plain
// function component (React 19 passes `ref` as a prop); here it has to be a
// forwardRef, or React logs "Function components cannot be given refs" and the
// pop-out measurement never lands.
const FilePreviewTile = forwardRef<HTMLDivElement, FilePreviewTileProps>(function FilePreviewTile(
  { file, onRemove, size },
  ref
) {
  const XIcon = useIcon("x");

  return (
    <motion.div
      ref={ref}
      // `layout` animates sibling tiles into the gap when one is removed.
      // Enter: spring.fast (0.08s) — the small-state-flip tier.
      // Exit: 0.06s linear — exits should be slightly faster than enter.
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: spring.fast.exit }}
      transition={spring.fast}
      // `cursor-default` opts out of the parent's `cursor-text` so hovering
      // a preview tile doesn't look like it'll land in the textarea.
      className="relative shrink-0 cursor-default group/tile"
    >
      <FileThumbnail file={file} size={size} />
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
          // Force the light-mode palette (dark circle + white X) regardless
          // of theme — the close badge needs to read as a "delete affordance"
          // over arbitrary image/PDF content, so it sits at a fixed contrast
          // instead of flipping with the surrounding surface.
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900 text-white opacity-0 group-hover/tile:opacity-100 transition-opacity duration-fast flex items-center justify-center cursor-pointer outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-focus-ring"
        >
          <XIcon size={12} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </motion.div>
  );
});

// ─── Queued message row ───────────────────────────────────────────────────
// A pending message in the queue: a recessed, draggable row that reads as
// "staged, not live". Double-click (or Enter/F2) edits it back into the
// composer; the hover-revealed × (or Delete) removes it; drag — or Alt+↑/↓ —
// reorders. Top of the list is next to dispatch.
interface QueuedRowProps {
  item: QueuedMessage;
  index: number;
  total: number;
  reduceMotion: boolean;
  isTouch: boolean;
  onEdit: (item: QueuedMessage) => void;
  onRemove: (item: QueuedMessage) => void;
  onMove: (item: QueuedMessage, dir: -1 | 1) => void;
}

function QueuedRow({
  item,
  index,
  total,
  reduceMotion,
  isTouch,
  onEdit,
  onRemove,
  onMove,
}: QueuedRowProps) {
  const XIcon = useIcon("x");
  const ImageIcon = useIcon("image");
  const compactStep = useSize().variant === "compact";
  const fileCount = item.files.length;
  const label =
    item.text || `${fileCount} attachment${fileCount === 1 ? "" : "s"}`;

  return (
    <Reorder.Item
      value={item}
      layout
      // Enter: spring-fast chip category. Exit slightly faster (0.06s linear).
      // Reduced-motion drops the scale.
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.97, transition: spring.fast.exit }
      }
      transition={spring.fast}
      aria-label={`Queued message ${index + 1} of ${total}: ${label}`}
      tabIndex={0}
      onDoubleClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          onEdit(item);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onRemove(item);
        } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          onMove(item, e.key === "ArrowUp" ? -1 : 1);
        }
      }}
      className={cn(
        // Fixed height (was py-1.5 around a 19.5px line box ≈ 31.5px) so the
        // text-box trim on the label doesn't shrink the row.
        "group/qrow flex items-center gap-2 rounded-lg bg-muted",
        compactStep
          ? "h-7 px-2 text-body-compact"
          : "h-8 px-2.5 text-body",
        "text-foreground/85 select-none outline-none",
        "cursor-grab active:cursor-grabbing",
        "focus-visible:ring-1 focus-visible:ring-focus-ring",
        "weight-normal"
      )}
    >
      {fileCount > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
          <ImageIcon size={13} />
          {item.text && <span className="tabular-nums">{fileCount}</span>}
        </span>
      )}
      {/* py-1/-my-1 keeps truncate's overflow-hidden from clipping
          ascenders and descenders outside the trimmed box. */}
      <span className="min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">{label}</span>
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          // Stop the pointer-down from starting a Reorder drag, and the click
          // from bubbling to the row's double-click/edit handler.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item);
          }}
          aria-label={`Remove queued message: ${label}`}
          className={cn(
            "shrink-0 flex h-5 w-5 items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-hover",
            // Hover devices reveal × on row-hover; touch has no hover, so keep
            // it persistently visible there.
            isTouch
              ? "opacity-100"
              : "opacity-0 group-hover/qrow:opacity-100 focus-visible:opacity-100",
            "transition-opacity duration-fast cursor-pointer outline-none",
            "focus-visible:ring-1 focus-visible:ring-focus-ring"
          )}
        >
          <XIcon size={13} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </Reorder.Item>
  );
}

// ─── Suggestion row ───────────────────────────────────────────────────────
// A suggested prompt in the listbox under the action bar. Registers itself
// with the fluid-hover system in an effect (MenuItem's pattern — an
// inline ref callback would re-register every render and keep the hook's
// measurement pass from ever settling). The highlight itself is the parent's
// sliding overlay, so the row only recolors its text when active.
interface SuggestionRowProps {
  text: string;
  index: number;
  active: boolean;
  /** Show a ↓ keycap hint in the icon slot — the first row displays it while
   *  no row is highlighted, signposting that ArrowDown enters the list. */
  keyHint: boolean;
  optionId: string;
  registerItem: (index: number, element: HTMLElement | null) => void;
  onSelect: () => void;
}

function SuggestionRow({
  text,
  index,
  active,
  keyHint,
  optionId,
  registerItem,
  onSelect,
}: SuggestionRowProps) {
  const EnterIcon = useIcon("corner-down-left");
  const ArrowDownIcon = useIcon("arrow-down");
  const compactStep = useSize().variant === "compact";
  const ref = useRef<HTMLDivElement>(null);

  useRegisterFluidHoverItem(registerItem, index, ref);

  return (
    <div
      ref={ref}
      id={optionId}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "relative flex cursor-pointer items-center gap-2",
        // Text size mirrors the composer's textarea/placeholder (the rows
        // read as prompt candidates, not metadata); heights follow the
        // QueuedRow step ladder.
        compactStep ? "h-7 px-2 text-subtitle-compact" : "h-8 px-2.5 text-subtitle",
        "text-muted-foreground transition-colors duration-fast",
        active && "text-foreground",
        "weight-normal"
      )}
    >
      <span className="min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">
        {text}
      </span>
      {/* One icon slot: ↵ on the highlighted row; on the first row a muted ↓
          takes the same slot while nothing is highlighted, signposting the
          keyboard path into the list. */}
      {!active && keyHint ? (
        <ArrowDownIcon
          size={13}
          className="shrink-0 text-muted-foreground/70 transition-opacity duration-fast"
        />
      ) : (
        <EnterIcon
          size={13}
          className={cn(
            "shrink-0 transition-opacity duration-fast",
            active ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}

// ─── InputMessage ─────────────────────────────────────────────────────────

/**
 * Chat-style message composer with an auto-resizing textarea, flexible
 * left/right action slots, and a built-in send button on a Surface-2
 * substrate.
 *
 * The textarea grows from `minRows` to `maxRows` and then scrolls, Enter
 * sends while Shift+Enter breaks the line, and the whole panel is one
 * hairline ring that recolours in place for hover, focus and drag instead of
 * layering a second border. Attachments drop anywhere on the composer (or
 * come from `openFilePicker` in a slot) and preview as tiles — images
 * object-cover, PDFs render their first page. `suggestions` open a listbox
 * under the action bar that ↓/↑ walk without moving focus, and
 * `placeholderSuggestion` writes a ghost prompt with a Tab keycap. With a
 * `status` the send button morphs into Stop (empty draft) or Queue (draft
 * typed while streaming); queued rows reorder by drag or Alt+↑/↓, edit back
 * into the composer on double-click, and the head auto-dispatches on the
 * streaming→idle edge.
 *
 * Every controlled prop has an uncontrolled twin — `defaultValue`,
 * `defaultFiles`, `defaultQueue`, `defaultStatus` — so a composer can hold
 * its own draft, attachments and queue with no state in the caller.
 *
 * @example
 * # Basic
 *
 * No props at all: the composer keeps its own draft, grows as you type and
 * clears itself on Enter.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage />
 * </div>
 * ```
 *
 * @example
 * # Suggestions
 *
 * The ghost placeholder renders with a Tab keycap — Tab fills it into the
 * composer. ArrowDown/ArrowUp walk the list below (focus stays in the
 * textarea) and Enter or click fills the highlighted prompt; the first row
 * shows a ↓ hint until a row is highlighted. Typing collapses the list.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage
 *     placeholderSuggestion="Why is every other input box so stiff?"
 *     suggestions={[
 *       'What is Fluid Functionalism about?',
 *       'How does Micka tune the springs behind these animations?',
 *       'Install the InputMessage component in my project',
 *       'Draft a short thank-you note to Micka for the library',
 *     ]}
 *   />
 * </div>
 * ```
 *
 * @example
 * # Attachments
 *
 * `defaultFiles` seeds the composer and turns attachment behavior on: drop a
 * PNG, JPEG or PDF anywhere on the panel, or use the render-fn slot's
 * `openFilePicker`. Images preview with object-cover, PDFs render their
 * first page, anything else falls back to a document glyph — hover a tile
 * for its × button.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage
 *     defaultFiles={[
 *       new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#6B97FF" /></svg>'], 'swatch.svg', { type: 'image/svg+xml' }),
 *       new File(['Quarterly notes'], 'notes.txt', { type: 'text/plain' }),
 *     ]}
 *     leftSlot={({ openFilePicker }) => (
 *       <Button variant="ghost" size="icon-sm" aria-label="Attach" onClick={() => openFilePicker()}>
 *         <Plus />
 *       </Button>
 *     )}
 *   />
 * </div>
 * ```
 *
 * @example
 * # Queued messages
 *
 * `defaultStatus="streaming"` plus `defaultQueue` runs the composer as if a
 * response were in flight: the send button is a Queue action, so a typed
 * message joins the rows above instead of sending. Drag a row (or Alt+↑/↓)
 * to reorder, double-click to pull it back into the composer, × to drop it.
 * Clear the draft and the button becomes Stop — pressing it ends the
 * response, and that streaming→idle edge dispatches the row at the top.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage
 *     defaultStatus="streaming"
 *     defaultQueue={[
 *       { id: 'q1', text: 'Also add a dark-mode screenshot', files: [] },
 *       { id: 'q2', text: 'And link the changelog entry', files: [] },
 *     ]}
 *   />
 * </div>
 * ```
 *
 * @example
 * # Left Slot Only
 *
 * `leftSlot` takes the bottom-left action area — an attach button, a model
 * switcher, a mode toggle.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage
 *     leftSlot={
 *       <Button variant="ghost" size="icon-sm" aria-label="Attach">
 *         <Plus />
 *       </Button>
 *     }
 *   />
 * </div>
 * ```
 *
 * @example
 * # Right Slot Only
 *
 * `rightSlot` sits in the bottom-right, just before the built-in send
 * button.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage
 *     rightSlot={
 *       <Button variant="ghost" size="sm" trailingIcon={ChevronDown}>
 *         Sonnet 4.6
 *       </Button>
 *     }
 *   />
 * </div>
 * ```
 *
 * @example
 * # Send Handler
 *
 * `onSend` receives the trimmed text and the attached files; an uncontrolled
 * composer clears its own draft afterwards. The handler here is an empty
 * arrow — in an app it is where the message joins the transcript.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage
 *     onSend={() => {}}
 *     placeholder="Press Enter to send. Shift+Enter for newline."
 *   />
 * </div>
 * ```
 *
 * @example
 * # Disabled
 *
 * Dims the panel to 50% and drops pointer events — textarea, send button and
 * drag-and-drop all go inert.
 *
 * ```tsx
 * <div className="w-full max-w-xl">
 *   <InputMessage defaultValue="This composer is disabled" disabled />
 * </div>
 * ```
 */
const InputMessage = forwardRef<HTMLDivElement, InputMessageProps>(
  (
    {
      size,
      value: valueProp,
      defaultValue,
      onValueChange,
      onSend,
      placeholder = "Ask me anything…",
      leftSlot,
      rightSlot,
      disabled,
      minRows = 1,
      maxRows = 8,
      clickToFocus = true,
      sendLabel = "Send",
      files: filesProp,
      defaultFiles,
      onFilesChange,
      accept = DEFAULT_ACCEPT,
      maxFiles,
      filePreviewSize = 80,
      textareaProps,
      status: statusProp,
      defaultStatus,
      onStatusChange,
      onStop,
      queue: queueProp,
      defaultQueue,
      onQueueChange,
      showQueue = true,
      history = [],
      placeholderSuggestion,
      suggestions,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const shape = useShape();
    const compactStep = useSize(size).variant === "compact";
    const ArrowUpIcon = useIcon("arrow-up");
    const reduceMotion = useReducedMotion() ?? false;
    const isTouch = useIsTouch();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [focusVisible, setFocusVisible] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [hovered, setHovered] = useState(false);

    // Split out onFocus/onBlur so the rest-spread onto the textarea can't
    // clobber the composed handlers below.
    const {
      onFocus: _textareaOnFocus,
      onBlur: _textareaOnBlur,
      "aria-describedby": textareaDescribedBy,
      ...restTextareaProps
    } = textareaProps ?? {};

    // ── Controlled / uncontrolled state ───────────────────────────────
    // Each pair keeps upstream's controlled contract (the prop wins, the
    // callback still fires) and gains an internal fallback, so the composer
    // runs with no state in the caller.
    const valueControlled = valueProp !== undefined;
    const [value, setValue] = useControllableState<string>(
      valueProp,
      defaultValue ?? "",
      onValueChange
    );

    const filesControlled = filesProp !== undefined;
    const supportsFiles = onFilesChange !== undefined || defaultFiles !== undefined;
    const [filesArr, setFiles] = useControllableState<File[]>(
      filesProp,
      defaultFiles ?? NO_FILES,
      onFilesChange
    );

    // Queue is active only when a status exists (controlled or seeded) and a
    // queue is wired — same opt-in shape as `supportsFiles`.
    const statusEnabled = statusProp !== undefined || defaultStatus !== undefined;
    const [statusValue, setStatus] = useControllableState<InputMessageStatus>(
      statusProp,
      defaultStatus ?? "idle",
      onStatusChange
    );
    const status = statusEnabled ? statusValue : undefined;
    const streaming = status === "streaming";

    const [queueArr, setQueue] = useControllableState<QueuedMessage[]>(
      queueProp,
      defaultQueue ?? NO_QUEUE,
      onQueueChange
    );
    // Always-current view of the queue, so enqueue/edit/remove/move read the
    // latest value even if a handler closure is stale (e.g. two submits land
    // before the controlled `queue` prop round-trips back).
    const queueRef = useRef(queueArr);
    queueRef.current = queueArr;
    const supportsQueue =
      statusEnabled && (onQueueChange !== undefined || defaultQueue !== undefined);
    const [liveMsg, setLiveMsg] = useState("");

    // Sent-message history navigation (readline-style). `historyIndex` is null
    // when not browsing; `draftBeforeHistory` stashes the in-progress text so
    // ArrowDown past the newest entry restores it.
    const [historyIndex, setHistoryIndex] = useState<number | null>(null);
    const draftBeforeHistory = useRef("");

    // Suggested prompts. The list only shows while the draft is empty, and
    // `activeSuggestion` is the highlighted row — focus never leaves the
    // textarea (aria-activedescendant points at the highlighted option).
    // Highlight state lives in the fluid-hover system so pointer and
    // keyboard drive the same sliding bg-hover overlay (Dropdown's pattern):
    // mouse movement resolves the nearest row, ↓/↑ set the index directly.
    const suggestionsArr = useMemo(() => suggestions ?? [], [suggestions]);
    const suggestionsOpen = suggestionsArr.length > 0 && value === "";
    const suggestionListRef = useRef<HTMLDivElement | null>(null);
    // Pixel heights for the three collapsible regions (see useRegionHeight).
    const [filesRegionRef, filesRegionHeight] = useRegionHeight();
    const [queueRegionRef, queueRegionHeight] = useRegionHeight();
    const [suggestionsRegionRef, suggestionsRegionHeight] = useRegionHeight();
    const suggestionHover = useFluidHover(suggestionListRef);
    const {
      activeIndex: activeSuggestion,
      setActiveIndex: setActiveSuggestion,
      handlers: suggestionHandlers,
      registerItem: registerSuggestion,
      remeasure,
    } = suggestionHover;

    // Rows stay registered while the list is closed, so their rects are from
    // a hidden layout: re-measure on open. The highlight waits for it.
    useEffect(() => {
      if (suggestionsOpen) remeasure();
    }, [suggestionsOpen, remeasure]);
    const suggestionListId = useId();
    const ghostHintId = useId();
    const showGhost =
      !!placeholderSuggestion && value === "" && !(dragOver && supportsFiles);

    useEffect(() => {
      if (!suggestionsOpen) setActiveSuggestion(null);
    }, [suggestionsOpen, setActiveSuggestion]);

    // Fill a suggested prompt into the composer (Tab / Enter / click). Fills
    // only — the user still reviews and sends.
    const acceptSuggestion = useCallback(
      (text: string) => {
        setActiveSuggestion(null);
        setHistoryIndex(null);
        setValue(text);
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        });
      },
      [setValue, setActiveSuggestion]
    );

    // Parsed line-height, cached per textarea element — getComputedStyle on
    // every keystroke is needless work when the value only changes with font
    // or zoom changes.
    const lineHeightCache = useRef<{ el: HTMLTextAreaElement; value: number } | null>(null);

    const resizeTextarea = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      let cache = lineHeightCache.current;
      if (!cache || cache.el !== el) {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        cache = { el, value: Number.isNaN(lineHeight) ? 20 : lineHeight };
        lineHeightCache.current = cache;
      }
      const min = cache.value * minRows;
      const max = cache.value * maxRows;
      const next = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    }, [minRows, maxRows]);

    useIsoLayoutEffect(() => {
      resizeTextarea();
    }, [value, resizeTextarea]);

    // Re-measure when the textarea's width changes. The mount-time pass can
    // run while an ancestor is still laid out at (near-)zero width — the
    // wrapped placeholder then reads as many lines and pins the height at
    // maxRows until the next value change. Width-gated so the observer
    // doesn't loop on its own height writes.
    useEffect(() => {
      const el = textareaRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      let lastWidth = el.offsetWidth;
      const ro = new ResizeObserver(() => {
        const width = el.offsetWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        resizeTextarea();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [resizeTextarea]);

    const trimmed = value.trim();
    const canSend = !disabled && (trimmed.length > 0 || filesArr.length > 0);

    // Edge = the box-shadow's 1px ring, recoloured in place per state so the
    // stroke gains contrast without ever appearing to thicken (no second
    // border band layered beside it). The drop (`0 1px 1px`) is kept so the
    // composer holds its lift across states. Applied inline (not via a
    // `shadow-*` utility, which mangles multi-layer arbitrary values) with the
    // precedence drag > focus > hover; when none are active, the className's
    // `shadow-surface-2` supplies the resting edge.
    const EDGE_DROP = "0 1px 1px -0.5px var(--shadow-color)";
    const edgeShadow = dragOver
      ? `0 0 0 1px var(--brand), ${EDGE_DROP}`
      : focusVisible
        ? `0 0 0 1px color-mix(in oklab, var(--foreground) 20%, transparent), ${EDGE_DROP}`
        : hovered && clickToFocus && !disabled
          ? `0 0 0 1px var(--border), ${EDGE_DROP}`
          : undefined;

    const handleSend = useCallback(() => {
      if (!canSend) return;
      setHistoryIndex(null);
      // While the assistant is streaming, a submit enqueues instead of sending:
      // snapshot the draft (text + currently-attached files) into a queue item,
      // then clear the composer and keep focus.
      if (streaming && supportsQueue) {
        const item: QueuedMessage = {
          id: crypto.randomUUID(),
          text: trimmed,
          files: filesArr,
        };
        setQueue([...queueRef.current, item]);
        setValue("");
        if (supportsFiles) setFiles([]);
        requestAnimationFrame(() => textareaRef.current?.focus());
        return;
      }
      onSend?.(trimmed, filesArr);
      // Local addition: an uncontrolled draft / file list clears itself, the
      // way a controlled consumer clears its own state inside `onSend`.
      if (!valueControlled) setValue("");
      if (supportsFiles && !filesControlled) setFiles([]);
    }, [
      canSend,
      streaming,
      supportsQueue,
      onSend,
      trimmed,
      filesArr,
      setQueue,
      setValue,
      supportsFiles,
      setFiles,
      valueControlled,
      filesControlled,
    ]);

    // Stop halts the response. With the status uncontrolled the component owns
    // that flag, so it flips itself to "idle" — the edge the auto-dispatch
    // below watches for.
    const statusControlled = statusProp !== undefined;
    const handleStop = useCallback(() => {
      onStop?.();
      if (!statusControlled) setStatus("idle");
    }, [onStop, statusControlled, setStatus]);

    // Auto-dispatch: on the streaming → idle edge (whether the response
    // finished on its own or the user pressed Stop), fire the head of the
    // queue and drop it. The consumer is expected to set status back to
    // "streaming" inside onSend, which re-arms this for the next item.
    const prevStatusRef = useRef(status);
    useEffect(() => {
      const prev = prevStatusRef.current;
      prevStatusRef.current = status;
      if (!supportsQueue) return;
      if (prev === "streaming" && status === "idle" && queueArr.length > 0) {
        const [next, ...rest] = queueArr;
        if (!next) return;
        setQueue(rest);
        onSend?.(next.text, next.files, { queuedId: next.id });
        setLiveMsg(
          `Message sent.${rest.length ? ` ${rest.length} still queued.` : ""}`
        );
      }
    }, [status, supportsQueue, queueArr, setQueue, onSend]);

    // ── Queue item actions ────────────────────────────────────────────
    const editQueued = useCallback(
      (item: QueuedMessage) => {
        if (!supportsQueue) return;
        // Silent replace: pull the item out of the queue into the composer,
        // overwriting any current draft. Re-sending re-queues it to the end.
        setHistoryIndex(null);
        setValue(item.text);
        if (supportsFiles) {
          setFiles(maxFiles != null ? item.files.slice(0, maxFiles) : item.files);
        }
        setQueue(queueRef.current.filter((q) => q.id !== item.id));
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        });
      },
      [supportsQueue, supportsFiles, setValue, setFiles, maxFiles, setQueue]
    );

    const removeQueued = useCallback(
      (item: QueuedMessage) =>
        setQueue(queueRef.current.filter((q) => q.id !== item.id)),
      [setQueue]
    );

    const moveQueued = useCallback(
      (item: QueuedMessage, dir: -1 | 1) => {
        const cur = queueRef.current;
        const i = cur.findIndex((q) => q.id === item.id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= cur.length) return;
        const next = [...cur];
        const a = next[i];
        const b = next[j];
        if (!a || !b) return;
        next[i] = b;
        next[j] = a;
        setQueue(next);
      },
      [setQueue]
    );

    // Send button morph: Stop (streaming + empty draft) → Queue (streaming +
    // draft) → Send (idle). Send and Queue share the arrow-up glyph; only the
    // Stop⇄arrow swap animates. An uncontrolled status can always stop.
    const canStop = onStop !== undefined || !statusControlled;
    const buttonMode: "send" | "queue" | "stop" = !streaming
      ? "send"
      : canSend && supportsQueue
        ? "queue"
        : canStop
          ? "stop"
          : "send";
    const buttonLabel =
      buttonMode === "stop"
        ? "Stop"
        : buttonMode === "queue"
          ? "Queue message"
          : sendLabel;

    const setCaretEnd = useCallback(() => {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      });
    }, []);

    const handleKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;

        // Suggested prompts: plain ArrowDown moves the highlight into / down
        // the list, ArrowUp walks it back up (then out, returning to plain
        // textarea behavior), Enter fills the highlighted prompt, Escape
        // drops the highlight. With no highlight, ArrowUp still falls through
        // to history recall below.
        if (
          suggestionsOpen &&
          !e.shiftKey &&
          !e.altKey &&
          !e.metaKey &&
          !e.ctrlKey
        ) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveSuggestion((prev) =>
              prev == null ? 0 : Math.min(prev + 1, suggestionsArr.length - 1)
            );
            return;
          }
          if (activeSuggestion != null) {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveSuggestion(
                activeSuggestion === 0 ? null : activeSuggestion - 1
              );
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const picked = suggestionsArr[activeSuggestion];
              if (picked !== undefined) acceptSuggestion(picked);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setActiveSuggestion(null);
              return;
            }
          }
        }

        // Tab fills the suggested placeholder prompt into the empty composer
        // (Shift+Tab still moves focus backward, and once the draft is
        // non-empty Tab resumes normal focus traversal).
        if (
          e.key === "Tab" &&
          !e.shiftKey &&
          placeholderSuggestion &&
          value === ""
        ) {
          e.preventDefault();
          acceptSuggestion(placeholderSuggestion);
          return;
        }

        // Readline-style history. Only plain ArrowUp/ArrowDown navigate (no
        // modifiers), and only when the caret is on the first/last line so
        // multi-line editing still works normally.
        if (
          history.length > 0 &&
          (e.key === "ArrowUp" || e.key === "ArrowDown") &&
          !e.shiftKey &&
          !e.altKey &&
          !e.metaKey &&
          !e.ctrlKey
        ) {
          const el = e.currentTarget;
          const caret = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? caret;
          if (e.key === "ArrowUp" && !value.slice(0, caret).includes("\n")) {
            const start = historyIndex == null ? history.length : historyIndex;
            if (start > 0) {
              e.preventDefault();
              if (historyIndex == null) draftBeforeHistory.current = value;
              const ni = start - 1;
              setHistoryIndex(ni);
              setValue(history[ni] ?? "");
              setCaretEnd();
            }
            return;
          }
          if (
            e.key === "ArrowDown" &&
            historyIndex != null &&
            !value.slice(end).includes("\n")
          ) {
            e.preventDefault();
            const ni = historyIndex + 1;
            if (ni >= history.length) {
              setHistoryIndex(null);
              setValue(draftBeforeHistory.current);
            } else {
              setHistoryIndex(ni);
              setValue(history[ni] ?? "");
            }
            setCaretEnd();
            return;
          }
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      [
        history,
        value,
        historyIndex,
        setValue,
        setCaretEnd,
        handleSend,
        suggestionsOpen,
        suggestionsArr,
        activeSuggestion,
        setActiveSuggestion,
        acceptSuggestion,
        placeholderSuggestion,
      ]
    );

    const handleContainerMouseDown = useCallback(
      (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!clickToFocus || disabled) return;
        const target = e.target as HTMLElement;
        if (target === textareaRef.current) return;
        if (
          target.closest(
            'button, a, input, select, textarea, [contenteditable], [role="button"], [data-im-queue]'
          )
        ) {
          return;
        }
        e.preventDefault();
        textareaRef.current?.focus();
      },
      [clickToFocus, disabled]
    );

    // ── File helpers ──────────────────────────────────────────────────
    const acceptTokens = useMemo(
      () => accept.split(",").map((s) => s.trim()).filter(Boolean),
      [accept]
    );

    const matchesAccept = useCallback(
      (file: File) =>
        acceptTokens.some((token) => {
          if (token.endsWith("/*")) return file.type.startsWith(token.slice(0, -1));
          if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token.toLowerCase());
          return file.type === token;
        }),
      [acceptTokens]
    );

    const addFiles = useCallback(
      (incoming: File[]) => {
        if (!supportsFiles) return;
        // Identity key for dedup: name + size + lastModified is unique enough
        // to catch "user dropped the same file twice" without false positives
        // on legitimately distinct files (different bytes ⇒ different size).
        const fingerprint = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;
        const existing = new Set(filesArr.map(fingerprint));
        const accepted: File[] = [];
        for (const f of incoming) {
          if (!matchesAccept(f)) continue;
          const fp = fingerprint(f);
          if (existing.has(fp)) continue;
          existing.add(fp);
          accepted.push(f);
        }
        if (!accepted.length) return;
        const next = [...filesArr, ...accepted];
        setFiles(maxFiles != null ? next.slice(0, maxFiles) : next);
      },
      [supportsFiles, setFiles, filesArr, matchesAccept, maxFiles]
    );

    const removeFile = useCallback(
      (idx: number) => {
        if (!supportsFiles) return;
        setFiles(filesArr.filter((_, i) => i !== idx));
      },
      [supportsFiles, setFiles, filesArr]
    );

    const openFilePicker = useCallback(
      (overrideAccept?: string) => {
        const el = fileInputRef.current;
        if (!el) return;
        // Temporarily narrow `accept` for this invocation (e.g. "image/*").
        // Reset after the click so subsequent native invocations still honor
        // the component-level accept.
        if (overrideAccept) {
          el.accept = overrideAccept;
          el.click();
          // Restore on next tick — the picker dialog reads `accept` synchronously.
          queueMicrotask(() => {
            if (fileInputRef.current) fileInputRef.current.accept = accept;
          });
          return;
        }
        el.click();
      },
      [accept]
    );

    // ── Slot rendering ────────────────────────────────────────────────
    const slotCtx = useMemo<InputMessageSlotContext>(
      () => ({ openFilePicker, files: filesArr }),
      [openFilePicker, filesArr]
    );
    const leftContent =
      typeof leftSlot === "function" ? leftSlot(slotCtx) : leftSlot;
    const rightContent =
      typeof rightSlot === "function" ? rightSlot(slotCtx) : rightSlot;

    // ── Drag-and-drop ────────────────────────────────────────────────
    const handleDragOver = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        if (!supportsFiles || disabled) return;
        // Only treat as a file drag — text/HTML drags shouldn't trigger.
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      },
      [supportsFiles, disabled]
    );

    const handleDragLeave = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        const wrapper = e.currentTarget;
        const next = e.relatedTarget as Node | null;
        if (next && wrapper.contains(next)) return;
        setDragOver(false);
      },
      []
    );

    const handleDrop = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        if (!supportsFiles || disabled) return;
        addFiles(Array.from(e.dataTransfer.files));
      },
      [supportsFiles, disabled, addFiles]
    );

    const handleFileInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        addFiles(Array.from(e.target.files));
        e.target.value = ""; // Allow re-selecting the same file.
      },
      [addFiles]
    );

    const composer = (
      <div
        ref={ref}
        onMouseDown={handleContainerMouseDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          // The edge is the box-shadow's hairline ring (from surface-2), not a
          // border. State changes recolor that same 1px ring in place rather
          // than layering a second colored border beside it — so hover / focus
          // bump *contrast* without ever appearing to thicken the stroke.
          "flex flex-col gap-1 p-2 transition-[box-shadow,color] duration-fast",
          surfaceClasses(2, 2),
          shape.container,
          clickToFocus && !disabled && "cursor-text",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        style={edgeShadow ? { boxShadow: edgeShadow, ...style } : style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...props}
      >
        <SurfaceProvider value={2}>
          {supportsFiles && (
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={maxFiles == null || maxFiles > 1}
              className="hidden"
              onChange={handleFileInputChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          )}

          {/* Attached files preview row — sits above the textarea.
              The outer motion.div animates the row's height (collapsing the
              whole component height) when files appear / disappear.
              The inner `mode="popLayout"` AnimatePresence pulls a removing
              tile out of layout flow so siblings can slide into the gap
              without fighting its exit anim. Keys are purely file-identity
              (no index) so removing the first file doesn't re-key — and
              remount — every surviving sibling. */}
          <AnimatePresence initial={false}>
            {filesArr.length > 0 && (
              <motion.div
                key="preview-row"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: filesRegionHeight ?? 0, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ ...spring.moderate, bounce: 0 }}
                className="overflow-hidden"
              >
                <div ref={filesRegionRef} className="flex flex-wrap gap-2 pb-1">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filesArr.map((file, i) => (
                      <FilePreviewTile
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        file={file}
                        onRemove={() => removeFile(i)}
                        size={filePreviewSize}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Queued messages — reorderable rows above the textarea. The outer
              motion.div collapses the region height when the queue empties;
              the Reorder.Group handles drag-reorder (top = next to dispatch)
              and AnimatePresence handles per-row enter/exit. */}
          {supportsQueue && showQueue && (
            <AnimatePresence initial={false}>
              {queueArr.length > 0 && (
                <motion.div
                  key="queue-row"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: queueRegionHeight ?? 0, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ ...spring.moderate, bounce: 0 }}
                  className="overflow-hidden"
                >
                  <Reorder.Group
                    ref={queueRegionRef}
                    axis="y"
                    values={queueArr}
                    onReorder={(next: QueuedMessage[]) => setQueue(next)}
                    data-im-queue
                    className="flex flex-col gap-1 pb-1"
                  >
                    <AnimatePresence initial={false}>
                      {queueArr.map((item, i) => (
                        <QueuedRow
                          key={item.id}
                          item={item}
                          index={i}
                          total={queueArr.length}
                          reduceMotion={reduceMotion}
                          isTouch={isTouch}
                          onEdit={editQueued}
                          onRemove={removeQueued}
                          onMove={moveQueued}
                        />
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                // Real typing exits history mode (recall sets the value
                // programmatically, which doesn't fire onChange) and drops
                // any suggestion highlight.
                setHistoryIndex(null);
                setActiveSuggestion(null);
                setValue(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              // Compose the consumer's textareaProps handlers with the internal
              // focus-visible tracking (the spread below would otherwise
              // overwrite these).
              onFocus={(e) => {
                if (e.target.matches(":focus-visible")) setFocusVisible(true);
                textareaProps?.onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocusVisible(false);
                setActiveSuggestion(null);
                textareaProps?.onBlur?.(e);
              }}
              placeholder={
                dragOver && supportsFiles
                  ? "Drop files here to add to chat"
                  : placeholderSuggestion
                    ? undefined // the ghost overlay below renders it
                    : placeholder
              }
              disabled={disabled}
              rows={minRows}
              aria-label={textareaProps?.["aria-label"] ?? "Message"}
              aria-describedby={
                [showGhost ? ghostHintId : null, textareaDescribedBy]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              aria-activedescendant={
                activeSuggestion != null
                  ? `${suggestionListId}-${activeSuggestion}`
                  : undefined
              }
              className={cn(
                "w-full resize-none rounded-none bg-transparent outline-none",
                "text-foreground placeholder:text-muted-foreground",
                compactStep
                  ? "text-subtitle-compact leading-4.5 px-1.5 py-1.5"
                  : "text-subtitle leading-5 px-2 py-2",
                "weight-normal"
              )}
              {...restTextareaProps}
            />
            {/* Ghost placeholder: the suggested prompt with a Tab keycap. A
                real overlay (not the native placeholder) so the keycap can
                render inline after the text; typography mirrors the textarea
                exactly so it sits where typed text will. */}
            {showGhost && (
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 overflow-hidden text-muted-foreground",
                  // Mirror the textarea's step typography exactly so the ghost
                  // sits where typed text will.
                  compactStep
                    ? "text-subtitle-compact leading-4.5 px-1.5 py-1.5"
                    : "text-subtitle leading-5 px-2 py-2",
                  "weight-normal"
                )}
              >
                {/* One flex line: a suggestion longer than the field truncates
                    with an ellipsis instead of wrapping into the clip (the
                    overlay is inset-0 over a possibly single-row textarea),
                    and the Tab chip never gets cut. */}
                <span className="flex max-w-full items-center gap-1.5">
                  <span className="min-w-0 truncate">{placeholderSuggestion}</span>
                  <kbd
                    className={cn(
                      "inline-flex shrink-0 -translate-y-px items-center rounded-box border border-border bg-background px-1 font-sans text-muted-foreground",
                      compactStep ? "h-4 text-micro-compact" : "h-[18px] text-micro"
                    )}
                  >
                    Tab
                  </kbd>
                </span>
              </div>
            )}
            {showGhost && (
              <span id={ghostHintId} className="sr-only">
                Suggested prompt: {placeholderSuggestion}. Press Tab to fill
                the composer with it.
              </span>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-between",
              // The footer's controls sit one notch below the composer's step:
              // slot content is consumer-authored (usually sm/icon-sm pinned
              // Buttons), so the compact step scales any button in the row —
              // send button included — down to 24px via a scoped override.
              compactStep
                ? "gap-1.5 [&_button]:h-6 [&_button.w-7]:w-6 [&_button]:text-caption-compact"
                : "gap-2"
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">{leftContent}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              {rightContent}
              <Button
                type="button"
                variant="primary"
                size="icon-sm"
                onClick={buttonMode === "stop" ? handleStop : handleSend}
                disabled={buttonMode === "stop" ? disabled : !canSend}
                aria-label={buttonLabel}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={buttonMode === "stop" ? "stop" : "arrow"}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.6 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.6, transition: spring.fast.exit }
                    }
                    transition={spring.fast}
                    className="flex items-center justify-center leading-none"
                  >
                    {buttonMode === "stop" ? (
                      <span className="h-3 w-3 rounded-glyph bg-current" />
                    ) : (
                      // Override icon-sm's small 14px svg — the send glyph reads
                      // better a touch larger. `size` matches the attribute to
                      // the CSS so the svg box stays centered.
                      <ArrowUpIcon
                        size={compactStep ? 15 : 19}
                        className={cn(
                          "block",
                          compactStep
                            ? "!h-[15px] !w-[15px]"
                            : "!h-[19px] !w-[19px]"
                        )}
                      />
                    )}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </div>
          </div>

          {/* Suggested prompts — a listbox under the action bar, shown while
              the draft is empty. ↓/↑ move the highlight without moving focus
              (the textarea's aria-activedescendant tracks it); Enter or click
              fills the composer. The outer motion.div collapses the region's
              height once typing hides the list; -mx-2 cancels the container
              padding so the divider runs the composer's full width. Pointer
              and keyboard share one bg-hover overlay that springs between
              row rects (fluid-hover, same as Dropdown). */}
          {suggestionsArr.length > 0 && (
            <AnimatePresence initial={false}>
              {suggestionsOpen && (
                <motion.div
                  key="suggestions"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: suggestionsRegionHeight ?? 0, opacity: 1 }}
                  // Height-only exit: the region clips shut bottom-up under
                  // overflow-hidden, so the divider holds its place until the
                  // space actually closes (a simultaneous opacity fade made it
                  // vanish mid-collapse, which read as a height glitch).
                  exit={{ height: 0 }}
                  transition={{ ...spring.moderate, bounce: 0 }}
                  // -mt-1 cancels the container's gap-1 above this region and
                  // the listbox's mt-2 restores it INSIDE the collapsible
                  // area — otherwise that 4px gap sits outside the height
                  // animation and snaps away only at unmount.
                  className="-mx-2 -mt-1 overflow-hidden"
                >
                  <div
                    ref={(el) => {
                      suggestionListRef.current = el;
                      suggestionsRegionRef(el);
                    }}
                    role="listbox"
                    id={suggestionListId}
                    aria-label="Suggested prompts"
                    onMouseEnter={suggestionHandlers.onMouseEnter}
                    onMouseMove={suggestionHandlers.onMouseMove}
                    onMouseLeave={suggestionHandlers.onMouseLeave}
                    onClick={suggestionHandlers.onClick}
                    className="relative mt-2 flex flex-col border-t border-border/60 px-1.5 pt-1.5"
                  >
                    {/* Hover / keyboard highlight: one overlay sliding
                        between rows instead of per-row backgrounds. */}
                    <FluidHoverHighlight
                      hover={suggestionHover}
                      className={shape.bg}
                    />
                    {suggestionsArr.map((s, i) => (
                      <SuggestionRow
                        key={`${s}-${i}`}
                        text={s}
                        index={i}
                        active={i === activeSuggestion}
                        keyHint={i === 0 && activeSuggestion == null}
                        optionId={`${suggestionListId}-${i}`}
                        registerItem={registerSuggestion}
                        onSelect={() => acceptSuggestion(s)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          {/* Politely announces auto-dispatch of queued messages. */}
          <span className="sr-only" role="status" aria-live="polite">
            {liveMsg}
          </span>
        </SurfaceProvider>
      </div>
    );

    // A size prop pins the whole composer — inner buttons, rows and queued
    // messages included — to one ladder step (matches InputGroup).
    return size ? <SizeProvider size={size}>{composer}</SizeProvider> : composer;
  }
);

InputMessage.displayName = "InputMessage";

export { InputMessage };
export { FileThumbnail } from "./file-thumbnail";
export type { InputMessageProps, InputMessageSlotContext, InputMessageStatus, QueuedMessage };
export default InputMessage;
