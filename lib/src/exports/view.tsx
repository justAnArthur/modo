// public hooks for the lib's view controls (theme / density / radius).
// each hook is reactive: returns { current, options, set }. reads
// localStorage on mount, syncs the html attribute, persists on change.
// SSR-safe: returns the fallback on the server, hydrates from
// localStorage on the client.
//
// usage:
//   const theme = useTheme({ fallback: 'light' })
//   return <button onClick={() => theme.set('dark')}>{theme.current}</button>
//
// `fallback` is the project default — typically read from the user's
// `modo.config.ts: theme.defaultTheme` (etc). when unset, the lib
// applies the control's "neutral" rule (e.g. 'system' removes the
// data-theme attribute so the OS default applies).

import { useCallback, useEffect, useState } from 'react'

export interface ViewOption { value: string; label: string }

export interface ViewControlState {
  current: string
  options: ViewOption[]
  set: (value: string) => void
}

export type ViewControl = 'theme' | 'density' | 'radius'

interface UseOptions {
  /** value used when localStorage has nothing. */
  fallback?: string
}

const OPTIONS: Record<ViewControl, ViewOption[]> = {
  theme: [
    { value: 'system', label: 'system' },
    { value: 'light', label: 'light' },
    { value: 'dark', label: 'dark' },
  ],
  density: [
    { value: 'compact', label: 'compact' },
    { value: 'comfortable', label: 'comfortable' },
    { value: 'spacious', label: 'spacious' },
  ],
  radius: [
    { value: 'rounded', label: 'rounded' },
    { value: 'pill', label: 'pill' },
  ],
}

const STORAGE_KEY: Record<ViewControl, string> = {
  theme: 'modo-theme',
  density: 'modo-density',
  radius: 'modo-radius',
}

const ATTR: Record<ViewControl, `data-${ViewControl}`> = {
  theme: 'data-theme',
  density: 'data-density',
  radius: 'data-radius',
}

// the control's "neutral" value (e.g. 'system' for theme) means
// "no override" — the lib removes the html attribute so the OS /
// project default applies.
const NEUTRAL: Record<ViewControl, string> = {
  theme: 'system',
  density: '',
  radius: 'rounded',
}

function readPref(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function writePref(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

function applyAttr(attr: string, value: string, neutral: string): void {
  if (!value || value === neutral) document.documentElement.removeAttribute(attr)
  else document.documentElement.setAttribute(attr, value)
}

function useViewControl(control: ViewControl, { fallback = '' }: UseOptions = {}): ViewControlState {
  const [current, setCurrent] = useState(fallback)

  // on mount, hydrate from localStorage. if found, it wins over the
  // fallback. otherwise the fallback applies. either way, sync the
  // html attribute so the page reflects the resolved value.
  useEffect(() => {
    const stored = readPref(STORAGE_KEY[control])
    const value = stored ?? fallback
    setCurrent(value)
    applyAttr(ATTR[control], value, NEUTRAL[control])
    // re-run when fallback changes (e.g. siteConfig loaded late).
    // stored is read fresh each time; the hook doesn't subscribe to
    // localStorage changes from other tabs — intentional for v1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [control, fallback])

  const set = useCallback((value: string) => {
    setCurrent(value)
    applyAttr(ATTR[control], value, NEUTRAL[control])
    writePref(STORAGE_KEY[control], value)
  }, [control])

  return { current, options: OPTIONS[control], set }
}

// public hooks — one per control. keep the API focused: the lib user
// picks the one they need, instead of getting all three at once.
export function useTheme(options?: UseOptions): ViewControlState {
  return useViewControl('theme', options)
}

export function useDensity(options?: UseOptions): ViewControlState {
  return useViewControl('density', options)
}

export function useRadius(options?: UseOptions): ViewControlState {
  return useViewControl('radius', options)
}
