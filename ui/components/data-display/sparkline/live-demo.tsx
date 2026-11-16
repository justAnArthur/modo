/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Sparkline page's live example. It feeds a point a second into a 30-point
 * window, from empty, so the example stays hook-free and shows a short
 * history stretching across the width.
 */

'use client'

import { useEffect, useState } from 'react'
import Sparkline from './index'

const WINDOW = 30

function next(previous: number): number {
  return Math.min(Math.max(previous + (Math.random() - 0.5) * 30, 2), 98)
}

export default function LiveDemo() {
  const [cpu, setCpu] = useState<number[]>([])

  useEffect(() => {
    const id = setInterval(() => setCpu(prev => [...prev, next(prev.at(-1) ?? 30)].slice(-WINDOW)), 1000)
    return () => clearInterval(id)
  }, [])

  const latest = Math.round(cpu.at(-1) ?? 0)

  return (
    <div className="flex w-64 items-center gap-3 text-body">
      <span className="shrink-0 text-muted-foreground">CPU</span>
      <Sparkline values={cpu} max={100} area label={`CPU, ${latest}%`} className="flex-1" />
      <span className="w-10 shrink-0 text-right tabular-nums">{latest}%</span>
    </div>
  )
}
