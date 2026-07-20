// the right-side panel for the docs site. the lib imports the default
// export from `modo.panel` (resolved via the vite alias) and renders
// it inside <aside data-aui="panel">. swap the body of this file for
// your own panel — the lib ships no theme switcher of its own.

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'

type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'system' },
  { value: 'light', label: 'light' },
  { value: 'dark', label: 'dark' },
]

function applyTheme(value: Theme): void {
  const root = document.documentElement
  if (value === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', value)
}

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : null
  } catch {
    return null
  }
}

function writeStored(value: Theme): void {
  try { localStorage.setItem(STORAGE_KEY, value) } catch { /* noop */ }
}

export default function Panel() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const initial = readStored() ?? 'system'
    setTheme(initial)
    applyTheme(initial)
  }, [])

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
        <select data-aui="control-input" value={theme} onChange={onChange}>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    </>
  )
}
