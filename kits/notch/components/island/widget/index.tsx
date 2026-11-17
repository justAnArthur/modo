/*!
 * Local addition: the open island's widget vocabulary, one frame and the few
 * parts every widget is built from, so Now Playing, Calendar and the rest
 * read as one system.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import type { IconComponent } from '@justanarthur/modo-ui/lib/icon-context'
import { type SizeVariant, useSize } from '@justanarthur/modo-ui/lib/size-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useLift } from '@justanarthur/modo-ui/lib/surface-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { SizeScope } from '@justanarthur/modo-ui/primitives/systems/sizes'
import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

// Literal tables: UnoCSS only generates the classes it can read whole.
const TITLE: Record<SizeVariant, string> = { default: 'text-title', compact: 'text-title-compact' }
const SUBTITLE: Record<SizeVariant, string> = { default: 'text-body', compact: 'text-body-compact' }
const CAPTION: Record<SizeVariant, string> = { default: 'text-caption', compact: 'text-caption-compact' }
const FIGURE: Record<SizeVariant, string> = { default: 'text-display', compact: 'text-display-compact' }
const GAP: Record<SizeVariant, string> = { default: 'gap-5', compact: 'gap-4' }
const ASIDE: Record<SizeVariant, string> = { default: 'pl-5', compact: 'pl-4' }
const META_ICON: Record<SizeVariant, number> = { default: 14, compact: 12 }
const ACTION_GLYPH: Record<SizeVariant, number> = { default: 16, compact: 14 }
const PRIMARY_GLYPH: Record<SizeVariant, number> = { default: 22, compact: 18 }

interface WidgetHeaderProps {
  /** The glyph before the label: the source app, the widget's kind. */
  icon?: IconComponent
  /** The context: where it comes from, which day it is. */
  children: ReactNode
  /** Quiet actions at the end of the line, such as `Widget.Action`s. */
  trailing?: ReactNode
  /** Classes for the row. */
  className?: string
}

/** The context line at the top of a widget: a glyph, where it comes from, and quiet actions at the end. */
function WidgetHeader({ icon: Icon, children, trailing, className }: WidgetHeaderProps) {
  const size = useSize()
  return (
    <div
      className={cn('flex h-6 min-w-0 items-center gap-1.5 text-muted-foreground', CAPTION[size.variant], className)}
    >
      {Icon && <Icon size={META_ICON[size.variant]} strokeWidth={1.5} className="shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing && <span className="-mr-1 flex shrink-0 items-center">{trailing}</span>}
    </div>
  )
}

interface WidgetTitleProps {
  /** The hero's name: a track, an event. */
  children: ReactNode
  /** A mark before it, such as a calendar's color dot. */
  leading?: ReactNode
  /** Classes for the row. */
  className?: string
}

/** The hero's name, on the title role: one line, truncating. */
function WidgetTitle({ children, leading, className }: WidgetTitleProps) {
  const size = useSize()
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {leading}
      <span className={cn('min-w-0 truncate weight-semibold text-foreground', TITLE[size.variant])}>{children}</span>
    </div>
  )
}

/** The line under the title: who, where, what else; muted, one line. */
function WidgetSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  const size = useSize()
  return (
    <span className={cn('block min-w-0 truncate text-muted-foreground', SUBTITLE[size.variant], className)}>
      {children}
    </span>
  )
}

interface WidgetFigureProps {
  /** The number, or the one word that stands for it (`Now`). */
  value: ReactNode
  /** The unit after it, set smaller and muted: `min`, `%`. */
  unit?: ReactNode
  /** A word before it, set like the unit: `in`. */
  prefix?: ReactNode
  /** A data color for the value (a calendar's, an artwork's); without one it is the text color. */
  color?: string
  /** Classes for the row. */
  className?: string
}

/** A widget's hero number on the display role, its unit beside it on the title role, digits tabular. */
function WidgetFigure({ value, unit, prefix, color, className }: WidgetFigureProps) {
  const size = useSize()
  const small = cn('weight-semibold text-muted-foreground', TITLE[size.variant])
  return (
    <span className={cn('flex min-w-0 items-baseline gap-1.5 whitespace-nowrap tabular-nums', className)}>
      {prefix && <span className={small}>{prefix}</span>}
      <span
        className={cn('weight-bold', FIGURE[size.variant], color ? undefined : 'text-foreground')}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {unit && <span className={small}>{unit}</span>}
    </span>
  )
}

interface WidgetMetaItemProps {
  /** The glyph before it: a clock, a pin, a speaker. */
  icon?: IconComponent
  /** The fact. */
  children: ReactNode
}

/** One fact of a meta row: a glyph and a few words. Only the last one truncates; the others keep their words whole. */
function WidgetMetaItem({ icon: Icon, children }: WidgetMetaItemProps) {
  const size = useSize()
  return (
    <span className="flex min-w-0 shrink-0 items-center gap-1 last:shrink">
      {Icon && <Icon size={META_ICON[size.variant]} strokeWidth={1.5} className="shrink-0" />}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

/** Supporting facts in a row, each a glyph and a few words, muted; the last one gives way, the others stay whole. */
function WidgetMeta({ children, className }: { children: ReactNode; className?: string }) {
  const size = useSize()
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap text-muted-foreground tabular-nums',
        CAPTION[size.variant],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface WidgetActionProps {
  /** The glyph: a Lucide icon, or any component taking its props. */
  icon: LucideIcon
  /** What it does: the accessible name and the tooltip. */
  label: string
  /** Called on press. */
  onClick?: () => void
  /** A toggle that is on (shuffle, a like): the glyph in the text color, `aria-pressed`. Leave it out for a plain action. */
  pressed?: boolean
  /** `primary` is the widget's main action (play / pause): a larger glyph in the text color. Defaults to `'default'`. */
  emphasis?: 'default' | 'primary'
  /** Fills the glyph, for solid transport glyphs. Defaults to `false`. */
  filled?: boolean
  /** A data color for the glyph while pressed (the artwork's tint). */
  color?: string
  /** No press. Defaults to `false`. */
  disabled?: boolean
}

/** A quiet icon button with a tooltip: muted at rest, the text color on hover and while pressed. */
function WidgetAction({
  icon: Icon,
  label,
  onClick,
  pressed,
  emphasis = 'default',
  filled = false,
  color,
  disabled = false,
}: WidgetActionProps) {
  const size = useSize()
  const primary = emphasis === 'primary'
  const lit = primary || !!pressed
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size={size.variant === 'compact' ? 'icon-compact' : 'icon'}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        className={cn(lit && 'text-foreground')}
        style={pressed && color ? ({ color } as CSSProperties) : undefined}
        onClick={onClick}
      >
        <Icon
          size={primary ? PRIMARY_GLYPH[size.variant] : ACTION_GLYPH[size.variant]}
          strokeWidth={1.5}
          fill={filled ? 'currentColor' : 'none'}
          strokeLinejoin="round"
        />
      </Button>
    </Tooltip>
  )
}

interface WidgetMessageProps {
  /** The glyph in the tile. */
  icon: IconComponent
  /** What's going on, in a few words. */
  title: ReactNode
  /** What to do about it. */
  description?: ReactNode
  /** The way forward: a Button or two. */
  actions?: ReactNode
  /** Classes for the root, which fills the widget. */
  className?: string
}

/** A widget's empty, permission or error state, laid out across the wide, short island: tile, text, then the action. */
function WidgetMessage({ icon: Icon, title, description, actions, className }: WidgetMessageProps) {
  const size = useSize()
  const level = useLift(1)
  return (
    <div className={cn('@container flex size-full items-center justify-center', className)}>
      <div className="flex w-full max-w-120 items-center gap-4">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground',
            SURFACE_BG[level],
          )}
        >
          <Icon size={20} strokeWidth={1.5} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn('weight-semibold text-foreground', SUBTITLE[size.variant])}>{title}</span>
          {description && (
            <span className={cn('text-pretty text-muted-foreground', CAPTION[size.variant])}>{description}</span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 @max-[22rem]:hidden">{actions}</div>}
      </div>
    </div>
  )
}

interface WidgetSectionProps {
  /** The group's name: `Later today`, `Tomorrow`. */
  label: ReactNode
  /** Content at the end of the label's line: chips, a count, a fold toggle. */
  trailing?: ReactNode
  /** The rows. */
  children?: ReactNode
  /** Classes for the section. */
  className?: string
}

/** A group of rows under a muted caption, the way a list's section reads. */
function WidgetSection({ label, trailing, children, className }: WidgetSectionProps) {
  const size = useSize()
  return (
    <section className={cn('flex min-w-0 flex-col', className)}>
      <div className={cn('flex h-6 min-w-0 items-center gap-2 text-muted-foreground', CAPTION[size.variant])}>
        <span className="shrink-0">{label}</span>
        {trailing && <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">{trailing}</span>}
      </div>
      {children}
    </section>
  )
}

interface WidgetRowProps {
  /** The figure at the start, muted and tabular: a time. */
  leading?: ReactNode
  /** A data color for the mark between the figure and the title: a calendar's. */
  color?: string
  /** The row's text. */
  children: ReactNode
  /** Muted content at the end: a glyph, a place. */
  trailing?: ReactNode
  /** Classes for the row. */
  className?: string
}

/** A list row for the island: a muted figure, a color mark, the title, and a muted end; the compact control height. */
function WidgetRow({ leading, color, children, trailing, className }: WidgetRowProps) {
  const size = useSize()
  return (
    <div className={cn('flex h-7 min-w-0 items-center gap-2.5', SUBTITLE[size.variant], className)}>
      {leading !== undefined && (
        <span
          className={cn('w-15 shrink-0 whitespace-nowrap tabular-nums text-muted-foreground', CAPTION[size.variant])}
        >
          {leading}
        </span>
      )}
      {color && <span aria-hidden className="h-3.5 w-0.75 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span className="min-w-0 flex-1 truncate text-foreground">{children}</span>
      {trailing && (
        <span className={cn('flex shrink-0 items-center gap-1 text-muted-foreground', CAPTION[size.variant])}>
          {trailing}
        </span>
      )}
    </div>
  )
}

interface WidgetChipProps {
  /** A data color for its dot. */
  color?: string
  /** The chip's text. */
  children: ReactNode
}

/** A small label on a wash one surface up: an all-day event, a state. */
function WidgetChip({ color, children }: WidgetChipProps) {
  const level = useLift(1)
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-0 items-center gap-1.5 rounded-full px-2 text-micro text-foreground',
        SURFACE_BG[level],
      )}
    >
      {color && <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

type WidgetLayout = 'fit' | 'tall'

interface WidgetSheetProps {
  /** The bands, top to bottom: the hero first, then the lists and details. */
  children: ReactNode
  /** Step on the size ladder for every part inside. Omitted, the widget follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the column. */
  className?: string
}

/**
 * The frame of a widget at the open island's tall snap (a sheet about
 * 692 × 476): bands stacked top to bottom, the hero first, set larger, then
 * the lists and details the short island has no room for. Bands sit apart
 * on space alone; a band of columns splits them with hairlines.
 */
function WidgetSheet({ children, size, className }: WidgetSheetProps) {
  return (
    <SizeScope size={size}>
      <div className={cn('flex w-full min-w-0 flex-col gap-6', className)}>{children}</div>
    </SizeScope>
  )
}

interface WidgetProps {
  /** The hero's picture at the start, as tall as the widget: artwork, a ring. */
  media?: ReactNode
  /** The supporting column at the end, past a hairline: a list, a timeline. It folds away when the widget is narrow. */
  aside?: ReactNode
  /** The main column: header, hero, meta, actions. */
  children: ReactNode
  /** Step on the size ladder for every part inside. Omitted, the widget follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root, which fills the island's content area. */
  className?: string
}

/**
 * The frame every open-island widget is built in: the hero's picture, the
 * main column, and a supporting column past a hairline.
 *
 * One hero per widget, set large: a name on the title role
 * (`Widget.Title`) or a number on the display role (`Widget.Figure`), then
 * one muted line (`Widget.Subtitle`), then the supporting facts as glyph and
 * words (`Widget.Meta`). Context goes on the line above (`Widget.Header`),
 * actions are quiet icon buttons with tooltips (`Widget.Action`), and lists
 * are rows of a muted figure, a color mark and a title (`Widget.Row` under
 * a `Widget.Section`). Color comes from the content (an artwork's tint, a
 * calendar's color, a status hue), never from decoration; depth from one
 * surface step (`Widget.Chip`, `Widget.Message`'s tile), never from boxes.
 * Empty and permission states are a `Widget.Message`, laid out across the
 * wide, short island.
 *
 * At the island's tall snap a widget shows more, not the same layout
 * stretched: each block takes `layout="tall"` and builds a `Widget.Sheet`,
 * bands of fuller lists, larger pictures and the details the short island
 * leaves out.
 *
 * The frame fills the island's content area. The aside folds away under
 * 30rem of width, so a narrower panel keeps the hero.
 *
 * @example {@include ./examples.mdx}
 */
const Widget = Object.assign(
  function Widget({ media, aside, children, size, className }: WidgetProps) {
    const step = useSize(size)
    return (
      <SizeScope size={size}>
        <div className={cn('@container flex w-full min-h-0 flex-col justify-center', className)}>
          <div className={cn('flex w-full min-h-0 items-stretch', GAP[step.variant])}>
            {media && <div className="flex shrink-0 items-center">{media}</div>}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">{children}</div>
            {aside && (
              <div
                className={cn(
                  'flex w-[42%] min-w-0 shrink-0 flex-col justify-center border-l border-border @max-[30rem]:hidden',
                  ASIDE[step.variant],
                )}
              >
                {aside}
              </div>
            )}
          </div>
        </div>
      </SizeScope>
    )
  },
  {
    Header: WidgetHeader,
    Title: WidgetTitle,
    Subtitle: WidgetSubtitle,
    Figure: WidgetFigure,
    Meta: WidgetMeta,
    MetaItem: WidgetMetaItem,
    Action: WidgetAction,
    Message: WidgetMessage,
    Section: WidgetSection,
    Row: WidgetRow,
    Chip: WidgetChip,
    Sheet: WidgetSheet,
  },
)

export default Widget

export type {
  WidgetActionProps,
  WidgetChipProps,
  WidgetFigureProps,
  WidgetHeaderProps,
  WidgetLayout,
  WidgetMessageProps,
  WidgetMetaItemProps,
  WidgetProps,
  WidgetRowProps,
  WidgetSectionProps,
  WidgetSheetProps,
  WidgetTitleProps,
}
export {
  Widget,
  WidgetAction,
  WidgetChip,
  WidgetFigure,
  WidgetHeader,
  WidgetMessage,
  WidgetMeta,
  WidgetMetaItem,
  WidgetRow,
  WidgetSection,
  WidgetSheet,
  WidgetSubtitle,
  WidgetTitle,
}
