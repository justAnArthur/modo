/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * LogView page's streaming example. It appends a line on a timer, so the
 * example stays hook-free, with buttons to pause and to toggle wrapping.
 */

'use client'

import { useEffect, useState } from 'react'
import Button from '../../actions/button'
import LogView from './index'

interface StreamDemoProps {
  /** The lines to stream, in order; after the last the log starts over. */
  script: string[]
  /** Milliseconds between lines. */
  interval?: number
}

export default function StreamDemo({ script, interval = 200 }: StreamDemoProps) {
  const [lines, setLines] = useState<string[]>([])
  const [paused, setPaused] = useState(false)
  const [wrap, setWrap] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setLines(prev => (prev.length >= script.length * 4 ? [] : [...prev, script[prev.length % script.length] ?? '']))
    }, interval)
    return () => clearInterval(id)
  }, [paused, script, interval])

  return (
    <div className="flex w-full flex-col gap-[var(--space-2)]">
      <div className="flex gap-[var(--space-2)]">
        <Button variant="tertiary" size="compact" onClick={() => setPaused(!paused)}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="tertiary" size="compact" active={wrap} onClick={() => setWrap(!wrap)}>
          Wrap
        </Button>
      </div>
      <LogView lines={lines} wrap={wrap} lineNumbers maxHeight={240} />
    </div>
  )
}
