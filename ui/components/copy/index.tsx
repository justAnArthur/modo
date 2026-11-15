/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-copy.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { type IconComponent, useIcon } from '../../lib/icon-context'
import { GooFilter } from '../../lib/morph-layers'
import { clampRect, lerpRect, placeRect, type Rect } from '../../lib/rect'
import { useReduceMotion } from '../../lib/reduced-motion'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { spring, springEnter } from '../../lib/springs'
import { GOO_BLUR_RATIO } from '../../lib/use-morph'
import { cn } from '../../lib/utils'
import { Tooltip } from '../overlays/tooltip'

type CopyVariant = 'icon' | 'button'
type CopyAlign = 'right' | 'left'
type CopyStatus = 'idle' | 'copied' | 'error'

// lucide's copy glyph is two sheets on a 24-unit grid; scaled to the 14px
// glyph, they melt through the goo into one disc behind the check. Rects are
// in the goo layer's coordinates: the disc plus room for the blur.
const GLYPH = 14
const DISC = 20
const UNIT = GLYPH / 24
const BLUR = (DISC / 2) * GOO_BLUR_RATIO
const LAYER = { at: (GLYPH - DISC) / 2 - BLUR * 3, size: DISC + BLUR * 6 }
const inLayer = (at: number, size: number, r: number): Rect => ({
  x: at - LAYER.at,
  y: at - LAYER.at,
  w: size,
  h: size,
  r,
})
const BACK = inLayer(2 * UNIT, 14 * UNIT, 2 * UNIT)
const FRONT = inLayer(8 * UNIT, 14 * UNIT, 2 * UNIT)
const DISC_RECT = inLayer((GLYPH - DISC) / 2, DISC, DISC / 2)

// Literal per state so the class extractor sees each one. The disc's tint is
// the layer's opacity, applied after the goo filter, which needs opaque shapes.
const TONE_BG = { copied: 'bg-status-success', error: 'bg-status-error' }
const TONE_TEXT = { copied: 'text-status-success', error: 'text-status-error' }
const CHECK_STROKE: Record<CopyVariant, string> = {
  icon: '[&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast group-hover:[&_svg]:stroke-[2]',
  button: '[&_svg]:stroke-[2]',
}

const enter = springEnter(spring.slow)

/** The goo layer behind the glyph: two sheets on one progress value, idle at 0, copied (or failed) at 1. */
function CopyDisc({ status }: { status: CopyStatus }) {
  const layer = useRef<HTMLSpanElement>(null)
  const back = useRef<HTMLSpanElement>(null)
  const front = useRef<HTMLSpanElement>(null)
  const progress = useMotionValue(0)
  const reduced = useReduceMotion()
  const gooId = `copy-goo-${useId().replace(/:/g, '')}`
  const tone = useRef<'copied' | 'error'>('copied')
  const on = status !== 'idle'
  if (on) tone.current = status

  useLayoutEffect(() => {
    if (!on && progress.get() === 0) return
    const render = (p: number) => {
      if (layer.current) layer.current.style.visibility = p > 0 ? 'visible' : 'hidden'
      // The slow tier overshoots: clamped, a size never goes below zero on the way back.
      placeRect(back.current, clampRect(lerpRect(BACK, DISC_RECT, p)))
      placeRect(front.current, clampRect(lerpRect(FRONT, DISC_RECT, p)))
    }
    const target = on ? 1 : 0
    if (reduced) {
      progress.jump(target)
      return render(target)
    }
    const controls = animate(progress, target, { ...(on ? enter : spring.slow.exit), onUpdate: render })
    return () => controls.stop()
  }, [on, reduced])

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: LAYER.at, top: LAYER.at, width: LAYER.size, height: LAYER.size }}
    >
      <GooFilter id={gooId} blur={BLUR} />
      <span ref={layer} className="invisible absolute inset-0 opacity-16" style={{ filter: `url(#${gooId})` }}>
        <span ref={back} className={cn('absolute', TONE_BG[tone.current])} />
        <span ref={front} className={cn('absolute', TONE_BG[tone.current])} />
      </span>
    </span>
  )
}

const CHECK_PATH = 'M6 12L10 16L18 8'
const ERROR_PATH = 'M9 9L15 15M15 9L9 15'

/** The action's glyph slot: the copy icon, or the check / ✕ drawing itself over its disc. */
function CopyGlyph({
  status,
  copyCount,
  variant,
  CopyIcon,
}: {
  status: CopyStatus
  copyCount: number
  variant: CopyVariant
  CopyIcon: IconComponent
}) {
  return (
    <span className="relative flex size-3.5 shrink-0 items-center justify-center">
      <CopyDisc status={status} />
      <AnimatePresence initial={false}>
        {status === 'idle' ? (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: spring.fast.exit }}
            transition={spring.fast}
            className="absolute inset-0 flex items-center justify-center"
          >
            <CopyIcon
              size={14}
              strokeWidth={1.5}
              className="transition-[stroke-width] duration-fast group-hover:stroke-[2]"
            />
          </motion.span>
        ) : (
          <motion.span
            key={`${status}-${copyCount}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: spring.fast.exit }}
            transition={spring.fast}
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              TONE_TEXT[status],
              CHECK_STROKE[variant],
            )}
          >
            <svg
              aria-hidden
              width={14}
              height={14}
              viewBox="2 4 20 16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d={status === 'error' ? ERROR_PATH : CHECK_PATH}
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: spring.fast.duration, ease: 'easeOut' },
                }}
              />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

interface CopyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The text value to display and copy to clipboard. */
  value: string
  /** Optional label displayed above the input. */
  label?: string
  /** Callback fired after the value is successfully copied. */
  onCopy?: () => void
  /** Disables the input and copy button. Defaults to `false`. */
  disabled?: boolean
  /** Icon-only with tooltip, or button with visible label. Defaults to `"icon"`. */
  variant?: CopyVariant
  /** Position of the copy action relative to the value. Defaults to `"right"`. */
  align?: CopyAlign
  /** Pins the field to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Extra classes for the wrapper around the label and the field. */
  className?: string
}

/**
 * Read-only input with a copy-to-clipboard button and animated check
 * feedback.
 *
 * The whole row is the button: click anywhere on it and the value goes to
 * the clipboard, the copy glyph's two sheets melt into a tinted disc (the
 * goo of Morph) behind a check that draws itself, and the tooltip flips to
 * "Copied" for 2 seconds; then the disc splits back into the glyph. The value is monospaced and
 * highlights on hover so it reads as one selectable token rather than a
 * text field, and the async Clipboard API falls back to an off-screen
 * textarea + `execCommand` where it is unavailable (insecure context,
 * permissions policy) — a failure animates a ✕ and says so. `variant`
 * switches between the icon-only affordance (with a tooltip) and a labelled
 * Copy button, `align` moves that action to the leading edge, and the field
 * follows the surrounding SizeProvider unless `size` pins it.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/input-copy.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Copy = forwardRef<HTMLDivElement, CopyProps>(
  ({ value, label, onCopy, disabled, variant = 'icon', align = 'right', size, className, ...props }, ref) => {
    const CopyIcon = useIcon('copy')
    const [status, setStatus] = useState<CopyStatus>('idle')
    const [copyCount, setCopyCount] = useState(0)
    // `copied` forces the tooltip open, `suppressed` closed.
    const [tooltipState, setTooltipState] = useState<'idle' | 'copied' | 'suppressed'>('idle')
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const tooltipVisibleRef = useRef(false)
    const tooltipWasVisibleRef = useRef(false)
    const shape = useShape()
    const sizeClasses = useSize(size)
    // The padded children set the row height: py-2 → 36px, py-1 → 28px.
    const rowPy = sizeClasses.variant === 'compact' ? 'py-1' : 'py-2'

    // The button's accessible name reads "Copy <label>".
    const generatedId = useId()
    const labelId = label ? `${generatedId}-label` : undefined
    const buttonId = `${generatedId}-button`

    const handlePointerDown = useCallback(() => {
      // Base UI closes the tooltip on pointer down; read it first.
      tooltipWasVisibleRef.current = tooltipVisibleRef.current
    }, [])

    // For an insecure context or a permissions policy that denies the Clipboard API.
    const copyViaExecCommand = useCallback(() => {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      document.body.removeChild(textarea)
      return ok
    }, [value])

    const handleCopy = useCallback(async () => {
      if (disabled) return
      let ok = true
      try {
        await navigator.clipboard.writeText(value)
      } catch {
        ok = copyViaExecCommand()
      }
      setStatus(ok ? 'copied' : 'error')
      setCopyCount(c => c + 1)
      setTooltipState(tooltipWasVisibleRef.current ? 'copied' : 'suppressed')
      if (ok) onCopy?.()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setStatus('idle')
        setTooltipState('suppressed')
      }, 2000)
    }, [value, disabled, onCopy, copyViaExecCommand])

    const handleTooltipOpenChange = useCallback((open: boolean) => {
      tooltipVisibleRef.current = open
    }, [])

    useEffect(() => () => clearTimeout(timeoutRef.current ?? undefined), [])

    const handleMouseEnter = useCallback(() => {
      setTooltipState(prev => (prev === 'suppressed' ? 'idle' : prev))
    }, [])

    const handleMouseLeave = useCallback(() => {
      setTooltipState(prev => (prev === 'copied' ? 'suppressed' : prev))
    }, [])

    const actionElement =
      variant === 'button' ? (
        <span
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-1.5 transition-colors duration-fast',
            rowPy,
            sizeClasses.text,
            'text-muted-foreground group-hover:text-foreground',
            'weight-normal',
          )}
        >
          <CopyGlyph status={status} copyCount={copyCount} variant="button" CopyIcon={CopyIcon} />
          <span className="select-none inline-grid text-left">
            <span className="col-start-1 row-start-1 invisible" aria-hidden="true">
              Copied
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status}
                className={cn('col-start-1 row-start-1', status === 'error' && 'text-destructive')}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: spring.fast.exit }}
                transition={spring.fast}
              >
                {status === 'copied' ? 'Copied' : status === 'error' ? 'Failed' : 'Copy'}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      ) : (
        <span
          className={cn(
            'shrink-0 flex px-1.5 transition-colors duration-fast',
            rowPy,
            'text-muted-foreground group-hover:text-foreground',
          )}
        >
          <CopyGlyph status={status} copyCount={copyCount} variant="icon" CopyIcon={CopyIcon} />
        </span>
      )

    const valueElement = (
      <span
        className={cn(
          'flex-1 min-w-0 text-left text-foreground font-mono select-none truncate',
          sizeClasses.text,
          rowPy,
          align === 'left' ? 'pl-1' : 'pl-0',
          'weight-normal',
        )}
      >
        <mark className="bg-transparent text-foreground transition-colors duration-fast group-hover:bg-brand/20 group-hover:text-foreground">
          {value}
        </mark>
      </span>
    )

    const buttonContent =
      align === 'left' ? (
        <>
          {actionElement}
          {valueElement}
        </>
      ) : (
        <>
          {valueElement}
          {actionElement}
        </>
      )

    const button = (
      <button
        id={buttonId}
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleCopy}
        disabled={disabled}
        aria-label={
          status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : label ? 'Copy' : 'Copy to clipboard'
        }
        aria-labelledby={label ? `${buttonId} ${labelId}` : undefined}
        className={cn(
          'group flex items-center w-full cursor-pointer outline-none transition-all duration-fast',
          'focus-visible:ring-1 focus-visible:ring-focus-ring',
          shape.input,
        )}
      >
        {buttonContent}
      </button>
    )

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: hover only re-arms the tooltip; the button inside is the control
      <div
        ref={ref}
        className={cn('flex flex-col gap-0.5', disabled && 'opacity-50 pointer-events-none', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {label && (
          <span
            id={labelId}
            className={cn(
              'text-muted-foreground',
              sizeClasses.text,
              align === 'left' ? 'pl-1' : 'pl-0',
              'weight-normal',
            )}
          >
            {label}
          </span>
        )}
        {variant === 'icon' ? (
          <Tooltip
            content={tooltipState === 'idle' ? 'Copy to clipboard' : status === 'error' ? 'Copy failed' : 'Copied'}
            delayDuration={500}
            sideOffset={2}
            forceOpen={tooltipState === 'copied' ? true : tooltipState === 'suppressed' ? false : undefined}
            onOpenChange={handleTooltipOpenChange}
          >
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </div>
    )
  },
)

Copy.displayName = 'Copy'

export type { CopyAlign, CopyProps, CopyVariant }
export { Copy }
export default Copy
