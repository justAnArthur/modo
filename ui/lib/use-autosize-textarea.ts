/*
 * Local addition (not part of Fluid Functionalism): a textarea that grows
 * with its text (Textarea, the ai kit's composer).
 */

'use client'

import { type DependencyList, type RefObject, useCallback, useEffect } from 'react'
import { useIsoLayoutEffect } from './use-iso-layout-effect'

interface AutosizeRows {
  /** Rows shown when empty; the box never gets shorter. */
  minRows: number
  /** Rows the box grows to before it scrolls. */
  maxRows: number
}

// `field-sizing: content` (WebKit 26, Chromium 123) sizes the box inside the
// browser's own layout: no measure, no observer.
const nativeSizing = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')

function lineHeightOf(el: HTMLElement) {
  const style = getComputedStyle(el)
  // `line-height: normal` computes to the keyword, which parses to NaN.
  return Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2
}

function fit(el: HTMLTextAreaElement, height: number, max: number) {
  const next = `${Math.min(height, max)}px`
  const overflow = height > max ? 'auto' : 'hidden'
  if (el.style.height !== next) el.style.height = next
  if (el.style.overflowY !== overflow) el.style.overflowY = overflow
}

/**
 * Sizes the textarea to its content between `minRows` and `maxRows`, then
 * scrolls. Where the browser supports `field-sizing: content`, the box sizes
 * itself between a `min-height` and `max-height` in line units. Elsewhere it
 * measures before paint whenever `deps` change (pass the value and anything
 * else that changes the text's height, such as the size step), and when the
 * textarea's width changes. Returns the measure, for a caller that changes
 * the content outside React.
 */
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  { minRows, maxRows }: AutosizeRows,
  deps: DependencyList,
) {
  // `grow` reads the text's height off the current box, which only holds
  // while the text is at least as tall as the box.
  const measure = useCallback(
    (grow: boolean) => {
      const el = ref.current
      if (!el || nativeSizing) return
      const line = lineHeightOf(el)
      const floor = line * minRows
      const max = line * Math.max(maxRows, minRows)
      // An empty box is one line at most: the floor holds it unmeasured.
      if (el.value === '' && minRows >= 1) return fit(el, floor, max)
      if (!grow) el.style.height = 'auto'
      fit(el, Math.max(el.scrollHeight, floor), max)
    },
    [ref, minRows, maxRows],
  )
  const resize = useCallback(() => measure(false), [measure])

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el || !nativeSizing) return
    el.style.setProperty('field-sizing', 'content')
    el.style.minHeight = `${minRows}lh`
    el.style.maxHeight = `${Math.max(maxRows, minRows)}lh`
    el.style.overflowY = 'auto'
  }, [ref, minRows, maxRows])

  useIsoLayoutEffect(resize, [resize, ...deps])

  // The first measure can run while an ancestor is still at (near-)zero
  // width, and a pane drag changes the width every frame. Narrower text can
  // only grow, which the box's own scrollHeight shows without a re-layout;
  // wider text may shrink, which needs the full measure, once per frame.
  // Gated on width, so the observer never loops on its own height writes.
  useEffect(() => {
    const el = ref.current
    if (!el || nativeSizing) return
    let width = el.offsetWidth
    let frame = 0
    const observer = new ResizeObserver(() => {
      const next = el.offsetWidth
      const wider = next > width
      if (next === width) return
      width = next
      if (el.value === '') return
      if (!wider) {
        if (el.scrollHeight > el.clientHeight) measure(true)
        return
      }
      frame ||= requestAnimationFrame(() => {
        frame = 0
        resize()
      })
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [ref, measure, resize])

  return resize
}
