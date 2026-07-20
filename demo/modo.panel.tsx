// the right-side panel for the docs site. the lib imports the default
// export from `modo.panel` (resolved via the vite alias) and renders
// it inside <aside data-aui="panel">. swap the body of this file for
// your own panel — the lib ships no theme switcher of its own.
//
// the theme switcher reads/writes `localStorage.theme` and toggles
// `data-theme` on <html>. a blocking script in `modo.head.tsx` applies
// the stored value BEFORE the browser paints, so the page never
// flashes the wrong theme on load. the React state below reads from
// the DOM on first render (lazy init) so it agrees with what the
// head script already set — no hydration mismatch, no flash.

import { useState } from 'react'
import type { ChangeEvent } from 'react'

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
  } catch { /* noop */ }
  return 'system'
}

function applyTheme(value: Theme): void {
  const root = document.documentElement
  if (value === 'system') root.removeAttribute(ATTR)
  else root.setAttribute(ATTR, value)
}

function writeStored(value: Theme): void {
  try { localStorage.setItem(STORAGE_KEY, value) } catch { /* noop */ }
}

export default function Panel() {
  // lazy init: on the server, returns 'system' (matches the SSR
  // <html>). on the client, reads the attribute the head script
  // already set so the select's controlled value matches the DOM.
  const [theme, setTheme] = useState<Theme>(readInitial)

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Theme
    setTheme(next)
    writeStored(next)
    applyTheme(next)
  }

  return (
    <>
      <h2 data-aui="panel-title">make them yours</h2>
      <label data-aui="control" data-control="theme">
        <span data-aui="control-label">Theme</span>
        {/*
          suppressHydrationWarning: the server always renders
          value="system" (no localStorage on the server), the
          client may render value="light"/"dark" if the head script
          applied a stored theme before hydration. the markup is
          the same — only the selected option differs — and we want
          the user's stored choice to win.
        */}
        <select
          data-aui="control-input"
          value={theme}
          onChange={onChange}
          suppressHydrationWarning
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    </>
  )
}
