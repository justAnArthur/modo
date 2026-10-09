import { addMonths, differenceInCalendarMonths, format, startOfMonth } from 'date-fns'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** Months rendered at once, and how far the window moves when the reader nears its edge. */
const WINDOW = 25
const SHIFT = 12

const monthKey = (date: Date) => format(date, 'yyyy-MM')

/** A rendered month's element in the scroller (the Calendar's `Month` stamps the key). */
const findMonth = (scroller: HTMLElement, key: string) =>
  scroller.querySelector<HTMLElement>(`[data-calendar-month="${key}"]`)

/** What the next layout pass scrolls to: back to where the reader was, a month's top, or a day in the middle. */
interface Pending {
  keep?: { key: string; delta: number }
  month?: string
  day?: Date
}

/**
 * The calendar's scroll: an endless-feeling list of months between `start` and
 * `end` that renders only `WINDOW` of them. Nearing either rendered edge moves
 * the window by `SHIFT` months and puts the reader back on the month they were
 * reading. Also reports the months in view, for the month and year columns.
 */
function useMonthWindow(start: Date, end: Date, anchor: Date) {
  const total = differenceInCalendarMonths(end, start) + 1
  const count = Math.min(WINDOW, total)
  const startTime = start.getTime()

  const clamp = useCallback(
    (first: Date) => {
      const from = new Date(startTime)
      const last = addMonths(from, total - count)
      return first < from ? from : first > last ? last : startOfMonth(first)
    },
    [startTime, total, count],
  )

  const [first, setFirst] = useState(() => clamp(addMonths(startOfMonth(anchor), -Math.floor(WINDOW / 2))))
  const [visible, setVisible] = useState<string[]>([])
  // The month taking up most of the view: the one the columns mark.
  const [current, setCurrent] = useState<string>()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef(first)
  firstRef.current = first
  const pending = useRef<Pending | null>({ day: anchor })
  // Set while a smooth jump runs: moving the window under it would cut it short.
  const settling = useRef(false)

  const topMonth = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined
    const top = scroller.scrollTop
    return [...scroller.querySelectorAll<HTMLElement>('[data-calendar-month]')].find(
      el => el.offsetTop + el.offsetHeight > top,
    )
  }, [])

  const moveWindow = useCallback(
    (nextFirst: Date, target?: string) => {
      const next = clamp(nextFirst)
      if (next.getTime() === firstRef.current.getTime()) return
      const scroller = scrollerRef.current
      const top = topMonth()
      pending.current = {
        month: target,
        keep:
          scroller && top
            ? { key: top.dataset.calendarMonth ?? '', delta: top.offsetTop - scroller.scrollTop }
            : undefined,
      }
      setFirst(next)
    },
    [clamp, topMonth],
  )

  /** Scrolls a rendered day into the middle of the list, at once. */
  const centreDay = useCallback((date: Date) => {
    const scroller = scrollerRef.current
    const day = scroller?.querySelector<HTMLElement>(`[data-day="${format(date, 'yyyy-MM-dd')}"]`)
    if (!scroller || !day) return
    const s = scroller.getBoundingClientRect()
    const d = day.getBoundingClientRect()
    scroller.scrollTop += d.top - s.top - (s.height - d.height) / 2
  }, [])

  const measure = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const top = scroller.scrollTop
    const bottom = top + scroller.clientHeight
    const shown = [...scroller.querySelectorAll<HTMLElement>('[data-calendar-month]')]
      .map(el => ({
        key: el.dataset.calendarMonth ?? '',
        height: Math.min(bottom, el.offsetTop + el.offsetHeight) - Math.max(top, el.offsetTop),
      }))
      .filter(m => m.height > 0)
    const inView = shown.map(m => m.key)
    setVisible(prev => (prev.join() === inView.join() ? prev : inView))
    setCurrent(
      shown.reduce<(typeof shown)[number] | undefined>((a, m) => (a && a.height >= m.height ? a : m), undefined)?.key,
    )
    if (settling.current) return

    const margin = scroller.clientHeight
    if (top < margin) moveWindow(addMonths(firstRef.current, -SHIFT))
    else if (scroller.scrollHeight - bottom < margin) moveWindow(addMonths(firstRef.current, SHIFT))
  }, [moveWindow])

  // Runs after the window moves (and on mount) to restore the reader's place.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const p = pending.current
    pending.current = null
    if (!scroller || !p) return
    const target = p.month && findMonth(scroller, p.month)
    const kept = p.keep && findMonth(scroller, p.keep.key)
    if (target) scroller.scrollTop = target.offsetTop
    else if (kept && p.keep) scroller.scrollTop = kept.offsetTop - p.keep.delta
    else if (p.day) centreDay(p.day)
    measure()
  }, [first])

  /** Scrolls a month to the top: smoothly when it is rendered, else by moving the window to it. */
  const jumpTo = useCallback(
    (month: Date, behavior: ScrollBehavior = 'smooth') => {
      const scroller = scrollerRef.current
      const key = monthKey(month)
      const el = scroller && findMonth(scroller, key)
      if (!scroller || !el) {
        moveWindow(addMonths(startOfMonth(month), -Math.floor(WINDOW / 2)), key)
        return
      }
      if (behavior === 'smooth') {
        settling.current = true
        const done = () => {
          settling.current = false
          scroller.removeEventListener('scrollend', done)
          measure()
        }
        scroller.addEventListener('scrollend', done)
        // Browsers without `scrollend` (and a jump that doesn't move) still settle.
        setTimeout(done, 600)
      }
      scroller.scrollTo({ top: el.offsetTop, behavior })
    },
    [measure, moveWindow],
  )

  /** Keyboard focus left the window: recentre it on that month and keep the reader's place. */
  const recentre = useCallback(
    (month: Date) => moveWindow(addMonths(startOfMonth(month), -Math.floor(WINDOW / 2))),
    [moveWindow],
  )

  return { first, count, visible, current, scrollerRef, measure, jumpTo, recentre, centreDay }
}

export { monthKey, useMonthWindow }
