/*
 * Local addition (not part of Fluid Functionalism): a textarea that grows
 * with its text (Textarea, InputMessage's composer).
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

function lineHeightOf(el: HTMLElement) {
  const style = getComputedStyle(el)
  // `line-height: normal` computes to the keyword, which parses to NaN.
  return Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2
}

/**
 * Sizes the textarea to its content between `minRows` and `maxRows`, then
 * scrolls. It measures before paint whenever `deps` change (pass the value
 * and anything else that changes the text's height, such as the size step),
 * and again when the textarea's width changes. Returns the measure, for a
 * caller that changes the content outside React.
 */
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  { minRows, maxRows }: AutosizeRows,
  deps: DependencyList,
) {
  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const line = lineHeightOf(el)
    const max = line * Math.max(maxRows, minRows)
    el.style.height = `${Math.min(Math.max(el.scrollHeight, line * minRows), max)}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [ref, minRows, maxRows])

  useIsoLayoutEffect(resize, [resize, ...deps])

  // The first measure can run while an ancestor is still at (near-)zero
  // width. Width-gated, so the observer never loops on its own height writes.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let width = el.offsetWidth
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth === width) return
      width = el.offsetWidth
      resize()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, resize])

  return resize
}
