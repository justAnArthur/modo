// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'
import { clamp01, hsvToRgb } from './variants'

const SQUARE_HEIGHT = 156

interface SaturationSquareProps {
  h: number
  s: number
  v: number
  onChange: (s: number, v: number) => void
}

export function SaturationSquare({ h, s, v, onChange }: SaturationSquareProps) {
  const ref = useRef<HTMLDivElement>(null)
  // State (not a ref): this gates the ghost hover cursor during render, and a
  // ref mutation wouldn't re-render, letting the ghost stick around.
  const [dragging, setDragging] = useState(false)
  const hasMoved = useRef(false)
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const shape = useShape()

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const x = clamp01((clientX - rect.left) / rect.width)
      const y = clamp01((clientY - rect.top) / rect.height)
      onChange(x, 1 - y)
    },
    [onChange],
  )

  const updateCursorPos = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setCursorPos({
      x: clamp01((clientX - rect.left) / rect.width) * 100,
      y: clamp01((clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      setDragging(true)
      hasMoved.current = false
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      updateFromPointer(e.clientX, e.clientY)
    },
    [updateFromPointer],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      updateCursorPos(e.clientX, e.clientY)
      if (!dragging) return
      hasMoved.current = true
      updateFromPointer(e.clientX, e.clientY)
    },
    [dragging, updateFromPointer, updateCursorPos],
  )

  const onPointerUp = useCallback(() => {
    setDragging(false)
    hasMoved.current = false
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.1 : 0.01
      let nextS = s,
        nextV = v,
        handled = true
      if (e.key === 'ArrowLeft') nextS = clamp01(s - step)
      else if (e.key === 'ArrowRight') nextS = clamp01(s + step)
      else if (e.key === 'ArrowUp') nextV = clamp01(v + step)
      else if (e.key === 'ArrowDown') nextV = clamp01(v - step)
      else handled = false
      if (handled) {
        e.preventDefault()
        onChange(nextS, nextV)
      }
    },
    [onChange, s, v],
  )

  const { r, g, b } = hsvToRgb(h, s, v)
  const thumbColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Saturation and brightness"
      tabIndex={0}
      onFocus={e => {
        if (e.currentTarget.matches(':focus-visible')) setFocused(true)
      }}
      onBlur={() => setFocused(false)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        setCursorPos(null)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      className={cn(
        'relative w-full select-none touch-none cursor-none outline-none',
        focused && 'ring-2 ring-focus-ring',
        shape.bg,
      )}
      style={{
        height: SQUARE_HEIGHT,
      }}
    >
      <div
        className={cn('absolute inset-0 overflow-hidden', shape.bg === 'rounded-[20px]' ? 'rounded-2xl' : shape.bg)}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
        }}
      />
      <motion.div
        className="absolute pointer-events-none rounded-full border border-thumb shadow-picker-thumb"
        initial={false}
        animate={{
          left: `${s * 100}%`,
          top: `${(1 - v) * 100}%`,
          width: 18,
          height: 18,
        }}
        transition={{ duration: 0 }}
        style={{
          transform: 'translate(-50%, -50%)',
          backgroundColor: thumbColor,
        }}
      />
      {hovered && !dragging && cursorPos && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-picker-ring shadow-picker-cursor"
          style={{
            left: `${cursorPos.x}%`,
            top: `${cursorPos.y}%`,
            width: 18,
            height: 18,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  )
}
