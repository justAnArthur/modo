/*
 * Local addition (not part of Fluid Functionalism): terminal and log output.
 * ANSI SGR colors land on the --syntax-* and --status-* tokens, so a log
 * follows light and dark like Code; the rows are a VirtualList that follows
 * new lines until the reader scrolls up.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useIcon } from '../../lib/icon-context'
import { useReduceMotion } from '../../lib/reduced-motion'
import { spring } from '../../lib/springs'
import { SURFACE_BG } from '../../lib/surface-classes'
import { useLift } from '../../lib/surface-context'
import { cn } from '../../lib/utils'
import VirtualList, { type VirtualListHandle } from '../../primitives/virtual-list'
import Button from '../button'

// Any CSI sequence; only SGR (`m`) is read, the rest (cursor moves, erases) is dropped.
const CSI = new RegExp(`${String.fromCharCode(27)}\\[([0-?]*)[ -/]*([@-~])`, 'g')

// Literal table: UnoCSS only generates the classes it can read whole. The
// eight basic colors and their bright twins, on the syntax and status hues.
const FG: Record<number, string> = {
  30: 'text-syntax-comment',
  31: 'text-status-error',
  32: 'text-status-success',
  33: 'text-status-warning',
  34: 'text-status-info',
  35: 'text-syntax-keyword',
  36: 'text-syntax-property',
  37: 'text-foreground',
  90: 'text-muted-foreground',
  91: 'text-status-error',
  92: 'text-syntax-string',
  93: 'text-syntax-class',
  94: 'text-syntax-entity',
  95: 'text-syntax-keyword',
  96: 'text-syntax-property',
  97: 'text-foreground',
}

interface Style {
  fg?: string
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
}

/** One styled run of a line. */
interface AnsiSegment {
  text: string
  className: string
}

function applySgr(style: Style, params: string): Style {
  let next = { ...style }
  const codes = params === '' ? [0] : params.split(';').map(Number)
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i] ?? 0
    if (code === 0) next = {}
    else if (code === 1) next.bold = true
    else if (code === 2) next.dim = true
    else if (code === 3) next.italic = true
    else if (code === 4) next.underline = true
    else if (code === 22) next.bold = next.dim = false
    else if (code === 23) next.italic = false
    else if (code === 24) next.underline = false
    else if (code === 39) next.fg = undefined
    // 256-color and truecolor have no token: skip their arguments.
    else if (code === 38 || code === 48) i += codes[i + 1] === 5 ? 2 : 4
    else if (FG[code]) next.fg = FG[code]
  }
  return next
}

function segmentClass(style: Style) {
  return cn(
    style.dim ? 'text-muted-foreground' : style.fg,
    style.bold && 'weight-semibold',
    style.italic && 'italic',
    style.underline && 'underline',
  )
}

/** Splits one line into styled runs; SGR state starts fresh on every line. */
function parseAnsi(line: string): AnsiSegment[] {
  const segments: AnsiSegment[] = []
  let style: Style = {}
  let at = 0
  for (const match of line.matchAll(CSI)) {
    const index = match.index ?? 0
    if (index > at) segments.push({ text: line.slice(at, index), className: segmentClass(style) })
    at = index + match[0].length
    if (match[2] === 'm') style = applySgr(style, match[1] ?? '')
  }
  if (at < line.length) segments.push({ text: line.slice(at), className: segmentClass(style) })
  return segments
}

const stripAnsi = (line: string) => line.replace(CSI, '')

interface RowProps {
  line: string
  number?: number
  digits: number
  prompt: string
  wrap: boolean
  gutterBg?: string
}

const Row = memo(({ line, number, digits, prompt, wrap, gutterBg }: RowProps) => {
  const isPrompt = prompt !== '' && stripAnsi(line).startsWith(prompt)
  const segments = useMemo(
    () => parseAnsi(isPrompt ? line.slice(line.indexOf(prompt) + prompt.length) : line),
    [line, isPrompt, prompt],
  )

  return (
    <div className="flex pr-[var(--space-3)]">
      {number !== undefined && (
        <span
          aria-hidden="true"
          className={cn(
            'sticky left-0 box-content shrink-0 select-none px-[var(--space-3)] text-right text-muted-foreground tabular-nums',
            gutterBg,
          )}
          style={{ minWidth: `${digits}ch` }}
        >
          {number}
        </span>
      )}
      <span
        className={cn(
          'text-foreground',
          number === undefined && 'pl-[var(--space-3)]',
          wrap ? 'min-w-0 flex-1 whitespace-pre-wrap break-words' : 'whitespace-pre',
          isPrompt && 'weight-semibold',
        )}
      >
        {isPrompt && <span className="weight-normal text-muted-foreground">{prompt}</span>}
        {segments.length === 0 && !isPrompt
          ? ' '
          : segments.map((s, i) => (
              <span key={i} className={s.className}>
                {s.text}
              </span>
            ))}
      </span>
    </div>
  )
})

interface LogViewProps {
  /** The output, one string per line. ANSI SGR codes (colors, bold, dim, italic, underline) are read; other escape codes are dropped. */
  lines?: string[]
  /** The output as one string, split on newlines; used when `lines` is not given. */
  children?: string
  /** Show a line number gutter that stays put while long lines scroll sideways. Defaults to `false`. */
  lineNumbers?: boolean
  /** The prefix that marks a command line: the prefix is muted and the command semibold. An empty string turns it off. Defaults to `'$ '`. */
  prompt?: string
  /** Stay at the bottom while new lines arrive, until the reader scrolls up; a jump button brings them back. Defaults to `true`. */
  follow?: boolean
  /** Wrap long lines instead of scrolling sideways. Defaults to `false`. */
  wrap?: boolean
  /** Caps the height, as a CSS length or pixels; without it the view fills its parent's height. */
  maxHeight?: number | string
  /** The accessible name of the log. Defaults to `'Log'`. */
  label?: string
  /** Classes for the frame. */
  className?: string
}

/**
 * Terminal or log output: a build, a test run, a server's console, a stream
 * that keeps growing.
 *
 * ANSI colors print in the theme's own hues: the eight basic colors and their
 * bright twins take the syntax and status colors, bold turns semibold and dim
 * turns muted, so a log follows light and dark like everything else. Command
 * lines (starting with `prompt`) stand out from their output. While new lines
 * arrive the view stays at the bottom; scroll up to read and it holds still,
 * with a button to jump back to the latest line. The lines are a
 * VirtualList, so ten thousand scroll as smoothly as ten. The frame lifts one
 * surface step above whatever holds it, as Code does, and fills its parent's
 * height unless `maxHeight` caps it.
 *
 * @example {@include ./examples.mdx}
 */
function LogView({
  lines: linesProp,
  children = '',
  lineNumbers = false,
  prompt = '$ ',
  follow = true,
  wrap = false,
  maxHeight,
  label = 'Log',
  className,
}: LogViewProps) {
  const level = useLift(1)
  const reduced = useReduceMotion()
  const ArrowDown = useIcon('arrow-down')
  const lines = useMemo(() => linesProp ?? children.replace(/\n$/, '').split('\n'), [linesProp, children])
  const list = useRef<VirtualListHandle>(null)
  const probe = useRef<HTMLSpanElement>(null)
  const [rowHeight, setRowHeight] = useState(0)
  const [detached, setDetached] = useState(false)

  // One line's height in the log's type: unwrapped rows all share it.
  useLayoutEffect(() => {
    // In the element's own px, which the rows are laid out in, under a scaled preview's CSS `zoom` too.
    const el = probe.current as (HTMLSpanElement & { currentCSSZoom?: number }) | null
    setRowHeight(el ? el.getBoundingClientRect().height / (el.currentCSSZoom ?? 1) : 0)
  }, [])

  const digits = String(lines.length).length
  const widest = useMemo(() => lines.reduce((max, line) => Math.max(max, stripAnsi(line).length), 0), [lines])
  const gutterBg = SURFACE_BG[level]

  return (
    <div
      role="log"
      aria-label={label}
      className={cn('relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl', gutterBg, className)}
      style={{ maxHeight }}
    >
      <span ref={probe} aria-hidden="true" className="invisible absolute font-mono text-caption">
        0
      </span>
      {rowHeight > 0 && (
        <VirtualList
          ref={list}
          count={lines.length}
          itemHeight={wrap ? undefined : rowHeight}
          estimateHeight={rowHeight}
          overscan={20}
          follow={follow}
          onFollowChange={following => setDetached(!following)}
          contentWidth={
            wrap
              ? undefined
              : `calc(${widest + (lineNumbers ? digits : 0)}ch + ${lineNumbers ? 3 : 2} * var(--space-3))`
          }
          className="min-h-0 flex-1 rounded-xl py-[var(--space-2)] font-mono text-caption"
          renderItem={i => (
            <Row
              line={lines[i] ?? ''}
              number={lineNumbers ? i + 1 : undefined}
              digits={digits}
              prompt={prompt}
              wrap={wrap}
              gutterBg={gutterBg}
            />
          )}
        />
      )}

      <AnimatePresence>
        {follow && detached && (
          <motion.div
            className="absolute right-[var(--space-3)] bottom-[var(--space-3)]"
            initial={{ opacity: 0, y: reduced ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 4, transition: spring.fast.exit }}
            transition={spring.fast}
          >
            <Button
              variant="secondary"
              size="compact"
              leadingIcon={ArrowDown}
              onClick={() => list.current?.scrollToEnd()}
            >
              Jump to latest
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { AnsiSegment, LogViewProps }
export { LogView, parseAnsi }

export default LogView
