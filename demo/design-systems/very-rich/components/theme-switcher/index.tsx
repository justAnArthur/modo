import './theme-switcher.css'
import { useState, type ChangeEvent } from 'react'

type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme'
const ATTR = 'data-theme'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'system' },
  { value: 'light', label: 'light' },
  { value: 'dark', label: 'dark' },
]

function isTheme(v: unknown): v is Theme {
  return v === 'system' || v === 'light' || v === 'dark'
}

function readInitial(): Theme {
  if (typeof document === 'undefined') return 'system'
  const attr = document.documentElement.getAttribute(ATTR)
  if (isTheme(attr)) return attr
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    /* noop */
  }
  return 'system'
}

function applyTheme(value: Theme): void {
  const root = document.documentElement
  if (value === 'system') root.removeAttribute(ATTR)
  else root.setAttribute(ATTR, value)
}

function writeStored(value: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* noop */
  }
}

/**
 * Theme switcher — `<select>` that toggles `data-theme` on `<html>` between
 * 'light' / 'dark' / 'system'. Reads and writes `localStorage.theme`.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <ThemeSwitcher />
 * ```
 */
export default function ThemeSwitcher() {
  // lazy init: reads the attribute the head script already set, so the
  // controlled value matches the DOM (no hydration mismatch, no flash).
  const [theme, setTheme] = useState<Theme>(readInitial)

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Theme
    setTheme(next)
    writeStored(next)
    applyTheme(next)
  }

  return (
    <label className="my-theme-switcher">
      <span className="my-theme-switcher-label">Theme</span>
      <select
        className="my-theme-switcher-select"
        value={theme}
        onChange={onChange}
        suppressHydrationWarning
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
