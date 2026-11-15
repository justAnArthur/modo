/*
 * Local addition (not part of Fluid Functionalism): controlled + uncontrolled
 * state the way Base UI components take it.
 */

'use client'

import { useCallback, useRef, useState } from 'react'

type SetState<T, Prev = T> = (next: T | ((prev: Prev) => T)) => void

/**
 * Controlled while `value !== undefined`: renders `value` and reports changes
 * through `onChange`. Otherwise keeps its own state, seeded once from
 * `defaultValue`, and still reports. The setter is stable, takes an updater
 * and skips no-op updates (`Object.is`).
 *
 * With an optional `defaultValue` (no selection yet), the state may be
 * `undefined` but every change, and so `onChange`, carries a value.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, SetState<T>]
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T | undefined,
  onChange?: (value: NonNullable<T>) => void,
): [T | undefined, SetState<NonNullable<T>, T | undefined>]
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, SetState<T>] {
  const [internal, setInternal] = useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : internal

  // The latest render's values, so the stable setter never reads a stale
  // closure and back-to-back updaters chain off each other.
  const currentRef = useRef(current)
  currentRef.current = current
  const controlledRef = useRef(controlled)
  controlledRef.current = controlled
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const prev = currentRef.current
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
    if (Object.is(resolved, prev)) return
    currentRef.current = resolved
    if (!controlledRef.current) setInternal(resolved)
    onChangeRef.current?.(resolved)
  }, [])

  return [current, setValue]
}
