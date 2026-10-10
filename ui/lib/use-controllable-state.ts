import { useCallback, useRef, useState } from 'react'

/*
 * Local addition (not part of Fluid Functionalism): controlled + uncontrolled
 * state the way Base UI components take it. Several FF wrappers are
 * controlled-only (`checked`, `value`, `selectedIndex`, …); each gains a
 * `default*` counterpart backed by this hook, so a component works with no
 * state of its own in the caller.
 *
 * The component is controlled while `value !== undefined`: it renders
 * `value` and only reports changes through `onChange`. Otherwise it keeps its
 * own state, seeded from `defaultValue` (read once, like `useState`), and
 * still reports every change. The setter is stable, accepts an updater
 * function, and skips no-op updates (`Object.is`).
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [internal, setInternal] = useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? (value as T) : internal

  // Latest render's values, so the stable setter never reads a stale closure
  // and back-to-back updater calls chain off each other.
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
