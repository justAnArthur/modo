/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Meter page's countdown example. A ring counts a minute down once a second
 * with `animate={false}`, and `tone` pinned so a full ring isn't read as a spent budget, so the example stays hook-free.
 */

'use client'

import { useEffect, useState } from 'react'
import Meter from './index'

const TOTAL = 60

export default function TimerDemo() {
  const [left, setLeft] = useState(TOTAL)

  useEffect(() => {
    const id = setInterval(() => setLeft(prev => (prev > 0 ? prev - 1 : TOTAL)), 1000)
    return () => clearInterval(id)
  }, [])

  const time = `0:${String(left).padStart(2, '0')}`

  return (
    <Meter
      variant="ring"
      label="Countdown"
      value={left}
      max={TOTAL}
      tone="default"
      animate={false}
      className="size-16 text-caption"
    >
      {time}
    </Meter>
  )
}
