import './popover-morph.css'
import { Elevated } from 'modo-atomic-ui'
import { SPRING, useTween } from '../../hooks/useTween'
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'

type Side = 'top' | 'bottom'
type Align = 'start' | 'end'

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref && typeof ref === 'object')
        (ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

const originFor = (side: Side, align: Align) =>
  `${side === 'bottom' ? 'top' : 'bottom'} ${align === 'end' ? 'right' : 'left'}`

// clip-path that hides everything but the corner nearest the trigger.
function clipHidden(side: Side, align: Align, radius: number) {
  const top = side === 'bottom' ? '0%' : '92%'
  const bottom = side === 'bottom' ? '92%' : '0%'
  const right = align === 'end' ? '0%' : '92%'
  const left = align === 'end' ? '92%' : '0%'
  return `inset(${top} ${right} ${bottom} ${left} round ${radius}px)`
}

const clipShown = (radius: number) => `inset(0% 0% 0% 0% round ${radius}px)`

interface MorphPopoverProps {
  trigger?: ReactNode
  content?: ReactNode
  placement?: Side
  sideOffset?: number
  radius?: number
  triggerElement?: ReactElement
}

function MorphPanel({
  trigger = 'Click me',
  content = 'Popover content here',
  placement = 'bottom',
  sideOffset = 8,
  radius = 16,
  triggerElement,
}: MorphPopoverProps) {
  const contentId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  const [internalOpen, setInternalOpen] = useState(false)
  const open = internalOpen
  const progress = useTween(open ? 1 : 0, 320, SPRING)

  const setOpen = useCallback((next: boolean) => setInternalOpen(next), [])
  const toggle = useCallback(() => setOpen(!open), [setOpen, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open, setOpen])

  const defaultTrigger = (
    <button
      type="button"
      data-aui="popover-morph-trigger"
      style={{
        background: 'var(--accent)',
        color: 'var(--accent-foreground)',
        border: 'none',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '6px 12px',
        font: 'inherit',
        cursor: 'pointer',
      }}
    >
      {trigger}
    </button>
  )

  const triggerWithRef = useMemo(() => {
    const child = triggerElement ?? defaultTrigger
    if (!isValidElement(child)) return child
    const childEl = child as ReactElement<Record<string, unknown>>
    const childProps = childEl.props
    const childRef = (childProps as { ref?: Ref<HTMLElement> }).ref
    return cloneElement(childEl, {
      ref: mergeRefs(childRef),
      onClick: (e: unknown) => {
        ;(childProps as { onClick?: (e: unknown) => void }).onClick?.(e)
        toggle()
      },
      id: `${contentId}-trigger`,
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      'aria-controls': open ? contentId : undefined,
      'data-state': open ? 'open' : 'closed',
      style: { ...(childProps.style as CSSProperties) },
    })
  }, [triggerElement, defaultTrigger, toggle, open, contentId])

  const posStyle: CSSProperties = {
    position: 'absolute',
    zIndex: 30,
    transformOrigin: originFor(placement, 'end'),
  }
  if (placement === 'bottom') posStyle.top = '100%'
  else posStyle.bottom = '100%'
  posStyle.right = 0
  if (placement === 'bottom') posStyle.marginTop = sideOffset
  else posStyle.marginBottom = sideOffset

  const wrapStyle: CSSProperties = {
    ...posStyle,
    opacity: open ? 1 : 0,
    transform: open ? 'scale(1)' : 'scale(0.96)',
    filter: open
      ? 'drop-shadow(0 10px 18px var(--shadow-color, rgba(0, 0, 0, 0.14)))'
      : 'drop-shadow(0 0 0 transparent)',
    pointerEvents: open ? 'auto' : 'none',
    transition:
      'opacity 200ms var(--standard, ease), transform 200ms var(--standard, ease), filter 200ms var(--standard, ease)',
  }

  const clipStyle: CSSProperties = {
    overflow: 'hidden',
    borderRadius: radius,
    clipPath: open ? clipShown(radius) : clipHidden(placement, 'end', radius),
    transition: 'clip-path 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  }

  return (
    <div
      ref={rootRef}
      data-aui="popover-morph"
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {triggerWithRef}
      <div
        data-aui="popover-morph-wrap"
        style={wrapStyle}
        inert={!open}
        aria-hidden={!open}
      >
        <Elevated
          offset={2}
          className="popover-morph-body"
          style={clipStyle}
        >
          <div id={contentId} role="menu" data-aui="popover-morph-panel">
            {content}
          </div>
        </Elevated>
      </div>
    </div>
  )
}

/**
 * A popover whose panel morphs open from the trigger corner: it's laid out at
 * full size but clipped to the corner nearest the trigger, then unclips as
 * one piece. The panel body is wrapped in `<Elevated offset={2}>` and the
 * outer wrapper carries a `drop-shadow` filter so the shadow hugs the
 * clipped shape.
 *
 * @example
 * # Default
 *
 * Click the trigger to see the panel grow from its corner.
 *
 * ```tsx
 * <PopoverMorph trigger="Click me" content="Popover content here" />
 * ```
 *
 * @example
 * # Top placement
 *
 * Panel grows from above the trigger.
 *
 * ```tsx
 * <PopoverMorph trigger="Open up" content="Opens upward" placement="top" />
 * ```
 *
 * @example
 * # Rich content
 *
 * The panel wraps any React node, including forms, lists, or cards.
 *
 * ```tsx
 * <PopoverMorph trigger="Settings" content={<form><input type="checkbox" /> Notify me</form>} />
 * ```
 */
export default function PopoverMorph(props: MorphPopoverProps) {
  return <MorphPanel {...props} />
}
