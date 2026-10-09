/*
 * Local addition (not part of Fluid Functionalism): a scrolling calendar on
 * react-day-picker (daypicker.dev), styled through its `classNames` and
 * custom components with DS utilities (its stylesheet isn't loaded). Props
 * pass through to DayPicker, the way shadcn's Calendar does.
 */

import {
  addDays,
  addYears,
  endOfYear,
  format,
  isSameYear,
  type Locale,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type DayButtonProps, DayPicker, type DayPickerProps, type DayProps, type MonthProps } from 'react-day-picker'
import { defaultLocale, fieldLabel } from '../../../../lib/date-locale'
import { dividedColumns, ScrollColumn } from '../../../../lib/scroll-column'
import { useShape } from '../../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../../lib/size-context'
import { cn } from '../../../../lib/utils'
import { SizeProvider } from '../../../../primitives/sizes'
import { monthKey, useMonthWindow } from './use-month-window'

const WEEKEND = { dayOfWeek: [0, 6] }
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

/** The day picked for the columns' dot and the first scroll: a single date, or a range's start. */
function pickedDate(props: DayPickerProps): Date | undefined {
  if (props.mode === 'single') return props.selected
  if (props.mode === 'range') return props.selected?.from
  return undefined
}

/** Stamps each month with its key, so the window can find and measure it. */
function Month({ calendarMonth, displayIndex: _, ...props }: MonthProps) {
  return <div {...props} data-calendar-month={monthKey(calendarMonth.date)} />
}

/** The day's cell: draws a range's band behind the pills. */
function Day({ day: _, modifiers, className, ...props }: DayProps) {
  const start = modifiers.range_start && !modifiers.range_end
  const end = modifiers.range_end && !modifiers.range_start
  return (
    <td
      {...props}
      className={cn(
        'relative p-0',
        !modifiers.hidden && modifiers.range_middle && 'bg-brand/15',
        !modifiers.hidden && modifiers.preview && !modifiers.selected && 'bg-brand/8',
        (start || end) && 'before:absolute before:inset-y-0 before:bg-brand/15',
        start && 'before:start-1/2 before:end-0',
        end && 'before:start-0 before:end-1/2',
        className,
      )}
    />
  )
}

function DayButton({ day: _, modifiers, className, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  // DayPicker's own DayButton does this: keyboard focus follows `focused`.
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])
  const shape = useShape()
  const sizeClasses = useSize()
  const pill = modifiers.selected && !modifiers.range_middle

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        'relative flex items-center justify-center tabular-nums outline-none cursor-pointer',
        'transition-[color,background-color] duration-fast focus-visible:ring-1 focus-visible:ring-focus-ring',
        'disabled:opacity-50 disabled:cursor-default',
        sizeClasses.variant === 'compact' ? 'size-7' : 'size-9',
        sizeClasses.text,
        shape.item,
        modifiers.weekend && 'text-destructive',
        modifiers.today &&
          'after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-current',
        pill ? 'bg-brand text-brand-foreground weight-semibold hover:bg-brand-hover' : 'enabled:hover:bg-hover',
        className,
      )}
    />
  )
}

/**
 * A calendar that scrolls through the months instead of paging, with month
 * and year columns to jump by.
 *
 * Months run on in one list, each under its name, with the weekday row pinned
 * above them; weekends read red and today carries a dot. The month column
 * marks the month being read and the year column its year, so either works
 * as a scrollbar you can click: a month or a year scrolls the calendar there.
 * The picked day, month and year show a filled pill or a dot. The columns
 * stand after the days by default; `columnsSide="start"` puts them before
 * (and `extraColumnsSide` places any extra ones). When the calendar is too
 * narrow for them, they turn into strips above it. The list renders a window of months and moves it as you scroll, so the
 * range is as long as `startMonth` / `endMonth` allow (100 years back and 50
 * ahead by default).
 *
 * It is react-day-picker's DayPicker underneath: `mode` (`'single'`,
 * `'range'`), `selected` / `onSelect`, `disabled` and `hidden` matchers,
 * `modifiers`, `weekStartsOn`, `dir` and the other DayPicker props pass
 * through. Its navigation props don't apply: the calendar scrolls.
 * DatePicker and DateRangePicker put it in a field.
 *
 * @example {@include ./examples.mdx}
 */
function Calendar({
  locale = defaultLocale,
  size,
  columnsSide = 'end',
  extraColumns,
  extraColumnsSide = 'end',
  className,
  ...props
}: DayPickerProps & {
  /** The locale: a react-day-picker / date-fns locale (`import { de } from 'react-day-picker/locale'`). Names months and weekdays, picks the first day of the week. Defaults to `enUS`. */
  locale?: Locale
  /** Pins the calendar to one step of the size ladder (36px days, compact 28px). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Which side of the days the month and year columns stand on; the month column keeps next to the days. Defaults to `'end'`. */
  columnsSide?: 'start' | 'end'
  /** More columns, given the layout's orientation — the date picker's hours and minutes. */
  extraColumns?: (orientation: 'vertical' | 'horizontal') => ReactNode
  /** Which side of the days the extra columns stand on, outside the month and year columns when they share it. Defaults to `'end'`. */
  extraColumnsSide?: 'start' | 'end'
  /** Classes for the calendar's box. */
  className?: string
}) {
  const sizeClasses = useSize(size)
  const picked = pickedDate(props)
  const today = useMemo(() => new Date(), [])
  const start = startOfMonth(props.startMonth ?? startOfYear(addYears(today, -100)))
  const end = startOfMonth(props.endMonth ?? endOfYear(addYears(today, 50)))
  const anchor = picked ?? props.month ?? props.defaultMonth ?? today
  const scroll = useMonthWindow(start, end, anchor)
  const { jumpTo, visible } = scroll

  // Before the first measure, the month the list opens on.
  const currentKey = scroll.current ?? monthKey(anchor)
  const yearInView = Number(currentKey.slice(0, 4))
  const monthInView = Number(currentKey.slice(5, 7)) - 1

  // A pick from outside the calendar (typed into a picker's field) scrolls to it.
  const pickedTime = picked?.getTime()
  const pickedRef = useRef(pickedTime)
  useEffect(() => {
    if (pickedTime === pickedRef.current) return
    pickedRef.current = pickedTime
    if (pickedTime !== undefined && !visible.includes(monthKey(new Date(pickedTime)))) jumpTo(new Date(pickedTime))
  }, [pickedTime, jumpTo, visible])

  // The columns stand beside the grid while they fit, and turn into strips
  // above it when they don't. The width they need is remembered, so the
  // strips only turn back once there is room again.
  const rootRef = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(true)
  const needed = useRef(0)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const check = () => {
      if (wide && root.scrollWidth > root.clientWidth + 1) {
        needed.current = root.scrollWidth
        setWide(false)
      } else if (!wide && root.clientWidth >= needed.current) setWide(true)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(root)
    return () => observer.disconnect()
  }, [wide])

  // Turning changes the grid's height: put the picked day (or today) back in the middle.
  const turned = useRef(wide)
  useLayoutEffect(() => {
    if (turned.current === wide) return
    turned.current = wide
    scroll.centreDay(picked ?? today)
  })

  // Range picking previews the span under the pointer before the second click.
  const [hovered, setHovered] = useState<Date>()
  const from = props.mode === 'range' ? props.selected?.from : undefined
  const previewing = from && props.mode === 'range' && !props.selected?.to && hovered
  const preview = previewing ? (hovered < from ? { from: hovered, to: from } : { from, to: hovered }) : false

  const weekStartsOn = props.weekStartsOn ?? locale.options?.weekStartsOn ?? 0
  const weekdays = useMemo(() => {
    const first = startOfWeek(today, { weekStartsOn })
    return Array.from({ length: 7 }, (_, i) => addDays(first, i))
  }, [today, weekStartsOn])

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => ({
        value: m,
        label: format(new Date(2000, m, 1), 'LLL', { locale }),
        disabled: new Date(yearInView, m, 1) < start || new Date(yearInView, m, 1) > end,
      })),
    [locale, yearInView, start.getTime(), end.getTime()],
  )
  const years = useMemo(
    () =>
      Array.from({ length: end.getFullYear() - start.getFullYear() + 1 }, (_, i) => {
        const year = start.getFullYear() + i
        return { value: year, label: String(year) }
      }),
    [start.getFullYear(), end.getFullYear()],
  )

  const jumpToYear = useCallback((year: number) => jumpTo(new Date(year, monthInView, 1)), [jumpTo, monthInView])
  const orientation = wide ? 'vertical' : 'horizontal'
  const column = wide ? 'w-16 shrink-0' : 'w-full'

  const monthColumn = (
    <ScrollColumn
      key="month"
      label={fieldLabel(locale, 'month')}
      options={months}
      value={picked && isSameYear(picked, new Date(yearInView, 0, 1)) ? picked.getMonth() : null}
      follow={monthInView}
      inView={m => m === monthInView}
      onValueChange={m => jumpTo(new Date(yearInView, m, 1))}
      orientation={orientation}
      className={column}
    />
  )
  const yearColumn = (
    <ScrollColumn
      key="year"
      label={fieldLabel(locale, 'year')}
      options={years}
      value={picked?.getFullYear() ?? null}
      follow={yearInView}
      inView={y => y === yearInView}
      onValueChange={jumpToYear}
      orientation={orientation}
      className={column}
    />
  )
  const extras = extraColumns?.(orientation)
  // Outward from the days: the month column, the year column, then the extras.
  const before = [extraColumnsSide === 'start' && extras, columnsSide === 'start' && [yearColumn, monthColumn]]
  const after = [columnsSide === 'end' && [monthColumn, yearColumn], extraColumnsSide === 'end' && extras]
  const side = (place: 'start' | 'end') =>
    wide
      ? cn(dividedColumns, 'h-full shrink-0 border-border', place === 'start' ? 'border-e' : 'border-s')
      : 'order-first flex w-full flex-col [&>*]:border-b [&>*]:border-border'

  const grid = (
    <div className={cn('flex min-h-0 shrink-0 flex-col', wide ? 'h-full' : 'flex-1 self-center')}>
      <div aria-hidden className="flex border-b border-border px-1 pb-1">
        {weekdays.map(day => (
          <span
            key={day.getDay()}
            className={cn(
              'flex items-center justify-center text-caption',
              sizeClasses.variant === 'compact' ? 'w-7' : 'w-9',
              isWeekend(day) ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {format(day, 'EEEEEE', { locale })}
          </span>
        ))}
      </div>
      <div
        ref={scroll.scrollerRef}
        onScroll={scroll.measure}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 scrollbar-hide scroll-fade [--scroll-fade-size:16px] [overflow-anchor:none]"
      >
        <DayPicker
          {...props}
          locale={locale}
          month={scroll.first}
          numberOfMonths={scroll.count}
          startMonth={start}
          endMonth={end}
          onMonthChange={scroll.recentre}
          hideNavigation
          hideWeekdays
          showOutsideDays={false}
          modifiers={{ weekend: WEEKEND, preview, ...props.modifiers }}
          onDayMouseEnter={(date, modifiers, e) => {
            setHovered(date)
            props.onDayMouseEnter?.(date, modifiers, e)
          }}
          onDayMouseLeave={(date, modifiers, e) => {
            setHovered(undefined)
            props.onDayMouseLeave?.(date, modifiers, e)
          }}
          formatters={{
            // The current year's months go by name alone, the rest with their year.
            formatCaption: month => format(month, isSameYear(month, today) ? 'LLLL' : 'LLLL y', { locale }),
            ...props.formatters,
          }}
          components={{ Month, Day, DayButton, ...props.components }}
          classNames={{
            months: 'flex flex-col',
            month: 'pb-2',
            month_caption: cn(
              'px-2 pt-2 pb-1 text-subtitle weight-semibold',
              sizeClasses.variant === 'compact' && 'text-subtitle-compact',
            ),
            month_grid: 'border-collapse',
            ...props.classNames,
          }}
        />
      </div>
    </div>
  )

  const content = (
    <div
      ref={rootRef}
      dir={props.dir}
      className={cn(
        'flex w-max max-w-full overflow-hidden',
        wide ? 'h-80 flex-row' : 'h-[min(30rem,65dvh)] flex-col',
        className,
      )}
    >
      {/* Strips are reordered by CSS, not in the tree, so turning doesn't remount the grid. */}
      {before.some(Boolean) ? <div className={side('start')}>{before}</div> : null}
      {grid}
      {after.some(Boolean) ? <div className={side('end')}>{after}</div> : null}
    </div>
  )

  return size ? <SizeProvider size={size}>{content}</SizeProvider> : content
}

type CalendarProps = Parameters<typeof Calendar>[0]

export type { CalendarProps }
export { Calendar }

export default Calendar
