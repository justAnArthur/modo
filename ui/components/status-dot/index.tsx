/*
 * Local addition (not part of Fluid Functionalism): one glyph per run state.
 * Running is Button's loading glyph (`lib/spinner-glyph.tsx`); the rest are
 * dots in the state's hue. `statusGlyph(status)` hands any state to an icon
 * slot.
 */

'use client'

import type { IconComponent, IconComponentProps } from '../../lib/icon-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { SpinnerGlyph } from '../../lib/spinner-glyph'
import { cn } from '../../lib/utils'

type StatusDotStatus = 'running' | 'waiting' | 'unread' | 'idle' | 'success' | 'error'

const STATUSES: StatusDotStatus[] = ['running', 'waiting', 'unread', 'idle', 'success', 'error']

// Literal table: UnoCSS only generates the classes it can read whole.
const HUE: Record<Exclude<StatusDotStatus, 'running'>, string> = {
  waiting: 'text-status-warning',
  unread: 'text-foreground',
  idle: 'text-muted-foreground',
  success: 'text-status-success',
  error: 'text-status-error',
}

interface GlyphProps extends IconComponentProps {
  status: StatusDotStatus
  label?: string
}

function Glyph({ status, label, size = 16, className }: GlyphProps) {
  const name = { role: label ? 'img' : undefined, 'aria-label': label, 'aria-hidden': label ? undefined : true }

  if (status === 'running') {
    return (
      <span {...name} className={cn('inline-flex shrink-0', className)} style={{ width: size, height: size }}>
        <SpinnerGlyph className="size-full" />
      </span>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0', className)}
    >
      {status === 'idle' ? (
        <circle cx="8" cy="8" r="2.75" fill="none" strokeWidth="1.5" className={cn('stroke-current', HUE.idle)} />
      ) : (
        <circle cx="8" cy="8" r="3.5" className={cn('fill-current', HUE[status])} />
      )}
    </svg>
  )
}

const GLYPHS = Object.fromEntries(
  STATUSES.map(status => [status, (props: IconComponentProps) => <Glyph status={status} {...props} />]),
) as Record<StatusDotStatus, IconComponent>

/** The state's glyph as an icon component, for an `icon` slot such as `Sidebar.MenuButton icon={statusGlyph('waiting')}`. */
function statusGlyph(status: StatusDotStatus): IconComponent {
  return GLYPHS[status]
}

interface StatusDotProps {
  /** The state it shows. */
  status: StatusDotStatus
  /** What screen readers hear. Without one the dot is hidden from them: say the state in text nearby. */
  label?: string
  /** Pins the glyph to one step of the size ladder (16px default, 14px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the glyph. */
  className?: string
}

/**
 * A run state at a glance: running, waiting on you, unread, idle, done or failed.
 *
 * Running is Button's loading glyph, travelling in the text color. Waiting
 * is a dot in the warning hue, unread a filled dot in the text color, idle a
 * ring in the muted color, and success and error dots in their status hues;
 * each keeps its hue wherever it sits. It sizes to the icon step of the size
 * ladder. For an icon slot (a Sidebar row, a tab), pass
 * `statusGlyph(status)` (also `StatusDot.glyph`), which takes the slot's size.
 *
 * @example {@include ./examples.mdx}
 */
function StatusDot({ status, label, size, className }: StatusDotProps) {
  const ladder = useSize(size)
  return <Glyph status={status} label={label} size={ladder.icon} className={className} />
}

StatusDot.glyph = statusGlyph

export type { StatusDotProps, StatusDotStatus }
export { StatusDot, statusGlyph }

export default StatusDot
