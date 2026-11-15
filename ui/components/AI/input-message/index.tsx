/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { AnimatePresence, motion, Reorder } from 'motion/react'
import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { useIcon } from '../../../lib/icon-context'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { surfaceClasses } from '../../../lib/surface-classes'
import { SurfaceProvider } from '../../../lib/surface-context'
import { useAutosizeTextarea } from '../../../lib/use-autosize-textarea'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { useTouchPrimary } from '../../../lib/use-touch-primary'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import { Button } from '../../button'
import { FilePreviewTile } from './file-preview-tile'
import { QueuedRow } from './queued-row'
import {
  caretToEnd,
  type InputMessageSlot,
  type InputMessageSlotContext,
  type InputMessageStatus,
  type QueuedMessage,
} from './shared'
import { SuggestionRow } from './suggestion-row'
import { useComposerFiles } from './use-composer-files'
import { useHistoryNav } from './use-history-nav'
import { useMessageQueue } from './use-message-queue'
import { useRegionHeight } from './use-region-height'

const DEFAULT_ACCEPT = 'image/png,image/jpeg,application/pdf'
const NO_STRINGS: string[] = []
const REGION_SPRING = { ...spring.moderate, bounce: 0 }

interface InputMessageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Step on the size ladder (see Sizes). Wins over the surrounding SizeProvider and propagates to the composer's rows, buttons and queued messages. */
  size?: SizeVariant
  /** Controlled textarea value. Pair with `onValueChange`; omit both for an uncontrolled composer. */
  value?: string
  /** Initial textarea value for an uncontrolled composer. Defaults to `""`. */
  defaultValue?: string
  /** Called with the new value on every textarea change. */
  onValueChange?: (value: string) => void
  /** Fires on Enter (without Shift) or send-button click, and when a queued message auto-dispatches. Receives the trimmed value, the attached files, and — for auto-dispatched queue items — `meta.queuedId`. Skipped when the value is empty and no files are attached. */
  onSend?: (value: string, files: File[], meta?: { queuedId?: string }) => void
  /** Placeholder shown when the value is empty. While a file is dragged over the component (and attachments are enabled) it swaps to "Drop files here to add to chat". Defaults to `"Ask me anything…"`. */
  placeholder?: string
  /** Content rendered in the bottom-left action area. May be a render-fn that receives `{ openFilePicker, files }` — `openFilePicker(acceptOverride?)` opens the native file picker. */
  leftSlot?: InputMessageSlot
  /** Content rendered in the bottom-right action area, before the built-in send button. Same render-fn shape as `leftSlot`. */
  rightSlot?: InputMessageSlot
  /** Disables the textarea, send button, and drag-and-drop. Defaults to `false`. */
  disabled?: boolean
  /** Minimum visible rows before the textarea grows. Defaults to 1. */
  minRows?: number
  /** Maximum visible rows before the textarea starts to scroll. Defaults to 8. */
  maxRows?: number
  /** When true, clicking anywhere on the surrounding container (outside of buttons / links / inputs) focuses the textarea. Defaults to `true`. */
  clickToFocus?: boolean
  /** Accessible label for the send button. Defaults to `"Send"`. */
  sendLabel?: string
  /** Controlled list of attached files. Pair with `onFilesChange` to enable drag-and-drop and the file-picker slot helper. */
  files?: File[]
  /** Initial attachments for an uncontrolled composer. Providing it (even as `[]`) enables attachment behavior on its own. */
  defaultFiles?: File[]
  /** Called when files are added (drag-drop or picker) or removed via the preview tile's × button. Duplicate drops of the same file (same name + size + lastModified) are silently de-duplicated. */
  onFilesChange?: (files: File[]) => void
  /** Accepted MIME types as a comma-separated string. Used by both the file picker and the drag-and-drop filter. Defaults to `"image/png,image/jpeg,application/pdf"`. */
  accept?: string
  /** Maximum number of attached files. Extra files beyond this limit are dropped. */
  maxFiles?: number
  /** Side length (in pixels) of each preview tile. Images use object-cover; PDFs render the first page via pdfjs (an optional peer: without `pdfjs-dist` they show the file icon); other types fall back to a centered icon. Defaults to 80. */
  filePreviewSize?: number
  /** Extra props forwarded to the underlying textarea (value, onChange, onKeyDown, disabled and placeholder are controlled by the component). */
  textareaProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'onChange' | 'onKeyDown' | 'disabled' | 'placeholder'
  >
  /** Assistant response state. When `"streaming"`, the send button becomes a Stop control (empty draft) or a Queue action (non-empty draft). On the streaming→idle edge the next queued message auto-dispatches via `onSend`. Leave it and `defaultStatus` undefined for the send-immediately behavior. */
  status?: InputMessageStatus
  /** Initial status for an uncontrolled composer — the component then owns the streaming flag, and Stop flips it to `"idle"` itself. */
  defaultStatus?: InputMessageStatus
  /** Called whenever the status changes while it is uncontrolled (currently: the Stop control). */
  onStatusChange?: (status: InputMessageStatus) => void
  /** Fires when the Stop control is pressed (streaming + empty draft). Halt the current response and set status to `"idle"` — that edge immediately dispatches the next queued message. */
  onStop?: () => void
  /** Controlled queue of pending messages, rendered as reorderable rows above the textarea. Double-click (or Enter/F2) edits a row back into the composer; the × (or Delete) removes it; drag — or Alt+↑/↓ — reorders. Requires a status. */
  queue?: QueuedMessage[]
  /** Initial queue for an uncontrolled composer. Providing it (even as `[]`) enables the queue on its own, alongside `status` or `defaultStatus`. */
  defaultQueue?: QueuedMessage[]
  /** Called whenever the queue changes — enqueue, edit, delete, reorder, or auto-dispatch. Each QueuedMessage is `{ id, text, files }`. */
  onQueueChange?: (queue: QueuedMessage[]) => void
  /** Render the built-in reorderable queue rows above the textarea. Set to false to suppress them and render the queue yourself — enqueue and auto-dispatch still run. Defaults to `true`. */
  showQueue?: boolean
  /** Previously-sent messages, oldest first. With the textarea focused, ArrowUp (caret on the first line) recalls the previous message and walks backward; ArrowDown (caret on the last line) walks forward toward the in-progress draft. Editing or sending exits history mode. Defaults to `[]`. */
  history?: string[]
  /** Suggested prompt rendered as the placeholder (with a Tab keycap) while the draft is empty. Pressing Tab fills it into the composer — it doesn't send. Takes precedence over `placeholder`. */
  placeholderSuggestion?: string
  /** Suggested prompts listed under the action bar while the draft is empty. ArrowDown moves a highlight into the list (focus stays in the textarea), ArrowUp walks back up and out, Enter or click fills the highlighted prompt. Escape drops the highlight; typing collapses the list. */
  suggestions?: string[]
  /** Extra classes for the composer surface. */
  className?: string
}

const isPlain = (e: ReactKeyboardEvent) => !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey

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
 * Also exported from this item: `FileThumbnail`, the square preview the
 * attachment tiles use, for showing sent attachments in a transcript.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/input-message.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const InputMessage = forwardRef<HTMLDivElement, InputMessageProps>(
  (
    {
      size,
      value: valueProp,
      defaultValue,
      onValueChange,
      onSend,
      placeholder = 'Ask me anything…',
      leftSlot,
      rightSlot,
      disabled,
      minRows = 1,
      maxRows = 8,
      clickToFocus = true,
      sendLabel = 'Send',
      files,
      defaultFiles,
      onFilesChange,
      accept = DEFAULT_ACCEPT,
      maxFiles,
      filePreviewSize = 80,
      textareaProps,
      status,
      defaultStatus,
      onStatusChange,
      onStop,
      queue,
      defaultQueue,
      onQueueChange,
      showQueue = true,
      history = NO_STRINGS,
      placeholderSuggestion,
      suggestions,
      className,
      ...props
    },
    ref,
  ) => {
    const shape = useShape()
    const compactStep = useSize(size).variant === 'compact'
    const ArrowUpIcon = useIcon('arrow-up')
    const reduceMotion = useReduceMotion()
    const isTouch = useTouchPrimary()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const {
      onBlur: textareaOnBlur,
      'aria-describedby': textareaDescribedBy,
      ...restTextareaProps
    } = textareaProps ?? {}

    const valueControlled = valueProp !== undefined
    const [value, setValue] = useControllableState<string>(valueProp, defaultValue ?? '', onValueChange)
    const attachments = useComposerFiles({ files, defaultFiles, onFilesChange, accept, maxFiles, disabled })
    const messages = useMessageQueue({
      status,
      defaultStatus,
      onStatusChange,
      onStop,
      queue,
      defaultQueue,
      onQueueChange,
      onSend,
    })
    const recall = useHistoryNav(history, value, setValue, textareaRef)

    useAutosizeTextarea(textareaRef, { minRows, maxRows }, [value, compactStep])

    // The list shows while the draft is empty; focus stays in the textarea
    // (aria-activedescendant), and pointer and keyboard drive one fluid-hover highlight.
    const suggestionList = suggestions ?? NO_STRINGS
    const suggestionsOpen = suggestionList.length > 0 && value === ''
    const suggestionListRef = useRef<HTMLDivElement | null>(null)
    const suggestionHover = useFluidHover(suggestionListRef)
    const {
      activeIndex: activeSuggestion,
      setActiveIndex: setActiveSuggestion,
      handlers: suggestionHandlers,
      registerItem: registerSuggestion,
      remeasure,
    } = suggestionHover
    const suggestionListId = useId()
    const ghostHintId = useId()
    const showGhost = !!placeholderSuggestion && value === '' && !attachments.dragging

    const [filesRegionRef, filesRegionHeight] = useRegionHeight()
    const [queueRegionRef, queueRegionHeight] = useRegionHeight()
    const [suggestionsRegionRef, suggestionsRegionHeight] = useRegionHeight()

    // Closed rows keep their registration with stale rects: remeasure on open.
    useEffect(() => {
      if (suggestionsOpen) remeasure()
      else setActiveSuggestion(null)
    }, [suggestionsOpen, remeasure, setActiveSuggestion])

    const acceptSuggestion = useCallback(
      (text: string) => {
        setActiveSuggestion(null)
        recall.exit()
        setValue(text)
        caretToEnd(textareaRef)
      },
      [setValue, setActiveSuggestion, recall.exit],
    )

    const trimmed = value.trim()
    const canSend = !disabled && (trimmed.length > 0 || attachments.files.length > 0)

    const handleSend = () => {
      if (!canSend) return
      recall.exit()
      if (messages.streaming && messages.supported) {
        messages.enqueue(trimmed, attachments.files)
        setValue('')
        attachments.replace([])
        caretToEnd(textareaRef)
        return
      }
      onSend?.(trimmed, attachments.files)
      if (!valueControlled) setValue('')
      if (!attachments.controlled) attachments.replace([])
    }

    const editQueued = (item: QueuedMessage) => {
      recall.exit()
      setValue(item.text)
      attachments.replace(item.files)
      messages.remove(item)
      caretToEnd(textareaRef)
    }

    const buttonMode: 'send' | 'queue' | 'stop' = !messages.streaming
      ? 'send'
      : canSend && messages.supported
        ? 'queue'
        : messages.canStop
          ? 'stop'
          : 'send'
    const buttonLabel = buttonMode === 'stop' ? 'Stop' : buttonMode === 'queue' ? 'Queue message' : sendLabel

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return

      if (suggestionsOpen && isPlain(e)) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveSuggestion(prev => (prev == null ? 0 : Math.min(prev + 1, suggestionList.length - 1)))
          return
        }
        if (activeSuggestion != null) {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveSuggestion(activeSuggestion === 0 ? null : activeSuggestion - 1)
            return
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            const picked = suggestionList[activeSuggestion]
            if (picked !== undefined) acceptSuggestion(picked)
            return
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setActiveSuggestion(null)
            return
          }
        }
      }

      // Shift+Tab, and Tab once there is a draft, still move focus.
      if (e.key === 'Tab' && !e.shiftKey && placeholderSuggestion && value === '') {
        e.preventDefault()
        acceptSuggestion(placeholderSuggestion)
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        recall.onKeyDown(e)
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const handleContainerMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!clickToFocus || disabled) return
      const target = e.target as HTMLElement
      if (target === textareaRef.current) return
      if (target.closest('button, a, input, select, textarea, [contenteditable], [role="button"], [data-im-queue]'))
        return
      e.preventDefault()
      textareaRef.current?.focus()
    }

    const slotCtx = useMemo<InputMessageSlotContext>(
      () => ({ openFilePicker: attachments.openPicker, files: attachments.files }),
      [attachments.openPicker, attachments.files],
    )
    const leftContent = typeof leftSlot === 'function' ? leftSlot(slotCtx) : leftSlot
    const rightContent = typeof rightSlot === 'function' ? rightSlot(slotCtx) : rightSlot
    const textStep = compactStep
      ? 'text-subtitle-compact leading-4.5 px-1.5 py-1.5'
      : 'text-subtitle leading-5 px-2 py-2'

    return (
      <SizeScope size={size}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the textarea is the control; the panel forwards pointer focus and takes drops. */}
        <div
          ref={ref}
          data-input-message=""
          data-click-to-focus={clickToFocus && !disabled ? '' : undefined}
          data-drag-over={attachments.dragging ? '' : undefined}
          onMouseDown={handleContainerMouseDown}
          {...attachments.dropHandlers}
          className={cn(
            'flex flex-col gap-1 p-2 transition-[box-shadow,color] duration-fast',
            surfaceClasses(2, 2),
            shape.container,
            clickToFocus && !disabled && 'cursor-text',
            disabled && 'opacity-50 pointer-events-none',
            className,
          )}
          {...props}
        >
          <SurfaceProvider value={2}>
            {attachments.supported && (
              <input {...attachments.inputProps} className="hidden" aria-hidden="true" tabIndex={-1} />
            )}

            {/* popLayout pulls a leaving tile out of flow so its siblings slide in;
                keys are file identity, so removing one never remounts the rest. */}
            <AnimatePresence initial={false}>
              {attachments.files.length > 0 && (
                <motion.div
                  key="preview-row"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: filesRegionHeight ?? 0, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={REGION_SPRING}
                  className="overflow-hidden"
                >
                  <div ref={filesRegionRef} className="flex flex-wrap gap-2 pb-1">
                    <AnimatePresence initial={false} mode="popLayout">
                      {attachments.files.map((file, i) => (
                        <FilePreviewTile
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          file={file}
                          onRemove={() => attachments.remove(i)}
                          size={filePreviewSize}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.supported && showQueue && (
              <AnimatePresence initial={false}>
                {messages.queue.length > 0 && (
                  <motion.div
                    key="queue-row"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: queueRegionHeight ?? 0, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={REGION_SPRING}
                    className="overflow-hidden"
                  >
                    <Reorder.Group
                      ref={queueRegionRef}
                      axis="y"
                      values={messages.queue}
                      onReorder={messages.setQueue}
                      data-im-queue
                      className="flex flex-col gap-1 pb-1"
                    >
                      <AnimatePresence initial={false}>
                        {messages.queue.map((item, i) => (
                          <QueuedRow
                            key={item.id}
                            item={item}
                            index={i}
                            total={messages.queue.length}
                            reduceMotion={reduceMotion}
                            isTouch={isTouch}
                            onEdit={editQueued}
                            onRemove={messages.remove}
                            onMove={messages.move}
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
                onChange={e => {
                  recall.exit()
                  setActiveSuggestion(null)
                  setValue(e.target.value)
                }}
                onKeyDown={handleKeyDown}
                onBlur={e => {
                  setActiveSuggestion(null)
                  textareaOnBlur?.(e)
                }}
                placeholder={
                  attachments.dragging
                    ? 'Drop files here to add to chat'
                    : placeholderSuggestion
                      ? undefined // the ghost below renders it
                      : placeholder
                }
                disabled={disabled}
                rows={minRows}
                aria-label={textareaProps?.['aria-label'] ?? 'Message'}
                aria-describedby={
                  [showGhost ? ghostHintId : null, textareaDescribedBy].filter(Boolean).join(' ') || undefined
                }
                aria-activedescendant={activeSuggestion != null ? `${suggestionListId}-${activeSuggestion}` : undefined}
                className={cn(
                  'w-full resize-none rounded-none bg-transparent outline-none',
                  'text-foreground placeholder:text-muted-foreground',
                  textStep,
                  'weight-normal',
                )}
                {...restTextareaProps}
              />
              {/* An overlay rather than the native placeholder, so the Tab keycap can sit inline. */}
              {showGhost && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-0 overflow-hidden text-muted-foreground',
                    textStep,
                    'weight-normal',
                  )}
                >
                  <span className="flex max-w-full items-center gap-1.5">
                    <span className="min-w-0 truncate">{placeholderSuggestion}</span>
                    <kbd
                      className={cn(
                        'inline-flex shrink-0 -translate-y-px items-center rounded-box border border-border bg-background px-1 font-sans text-muted-foreground',
                        compactStep ? 'h-4 text-micro-compact' : 'h-[18px] text-micro',
                      )}
                    >
                      Tab
                    </kbd>
                  </span>
                </div>
              )}
              {showGhost && (
                <span id={ghostHintId} className="sr-only">
                  Suggested prompt: {placeholderSuggestion}. Press Tab to fill the composer with it.
                </span>
              )}
            </div>
            <div
              className={cn(
                'flex items-center justify-between',
                // Slot buttons are the consumer's: the compact step scales every one, send included.
                compactStep ? 'gap-1.5 [&_button]:h-6 [&_button.w-7]:w-6 [&_button]:text-caption-compact' : 'gap-2',
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">{leftContent}</div>
              <div className="flex items-center gap-1.5 shrink-0">
                {rightContent}
                <Button
                  type="button"
                  variant="primary"
                  size="icon-compact"
                  onClick={buttonMode === 'stop' ? messages.stop : handleSend}
                  disabled={buttonMode === 'stop' ? disabled : !canSend}
                  aria-label={buttonLabel}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={buttonMode === 'stop' ? 'stop' : 'arrow'}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, transition: spring.fast.exit }}
                      transition={spring.fast}
                      className="flex items-center justify-center leading-none"
                    >
                      {buttonMode === 'stop' ? (
                        <span className="h-3 w-3 rounded-glyph bg-current" />
                      ) : (
                        // A touch larger than icon-compact's 14px svg.
                        <ArrowUpIcon
                          size={compactStep ? 15 : 19}
                          className={cn('block', compactStep ? '!h-[15px] !w-[15px]' : '!h-[19px] !w-[19px]')}
                        />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </Button>
              </div>
            </div>

            {suggestionList.length > 0 && (
              <AnimatePresence initial={false}>
                {suggestionsOpen && (
                  <motion.div
                    key="suggestions"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: suggestionsRegionHeight ?? 0, opacity: 1 }}
                    // Height only: a fade would drop the divider before the space closes.
                    exit={{ height: 0 }}
                    transition={REGION_SPRING}
                    // -mt-1 / mt-2 move the gap inside the collapsing region; -mx-2 runs the divider full width.
                    className="-mx-2 -mt-1 overflow-hidden"
                  >
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: the textarea drives the list by keyboard (aria-activedescendant). */}
                    <div
                      ref={el => {
                        suggestionListRef.current = el
                        suggestionsRegionRef(el)
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
                      <FluidHoverHighlight hover={suggestionHover} className={shape.bg} />
                      {suggestionList.map((s, i) => (
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
            <span className="sr-only" role="status" aria-live="polite">
              {messages.announcement}
            </span>
          </SurfaceProvider>
        </div>
      </SizeScope>
    )
  },
)

InputMessage.displayName = 'InputMessage'

export { FileThumbnail } from './file-thumbnail'
export type { InputMessageProps, InputMessageSlotContext, InputMessageStatus, QueuedMessage }
export { InputMessage }
export default InputMessage
