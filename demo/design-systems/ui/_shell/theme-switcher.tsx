/*
 * modo panel item — not a documented item.
 *
 * Light / Dark / System control for the docs chrome, wired in
 * `modo.config.ts` under `panel.items`. The actual switching lives in the
 * pre-paint script `vite.ts` injects (`window.__uiTheme`), so the stored
 * preference applies before first paint and this control only reflects and
 * sets it. `ui:themechange` fires on every apply, including when the OS flips
 * underneath the 'system' preference.
 */

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import Select from '../components/select'

type ThemePreference = 'light' | 'dark' | 'system'

declare global {
  interface Window {
    __uiTheme?: { get: () => ThemePreference; set: (next: ThemePreference) => void }
  }
}

const OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

export default function ThemeSwitcher() {
  const [preference, setPreference] = useState<ThemePreference>(
    () => globalThis.window?.__uiTheme?.get() ?? 'system',
  )

  useEffect(() => {
    const sync = () => setPreference(window.__uiTheme?.get() ?? 'system')
    sync()
    window.addEventListener('ui:themechange', sync)
    return () => window.removeEventListener('ui:themechange', sync)
  }, [])

  const active = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[2]!

  return (
    <Select
      value={preference}
      onValueChange={(next) => window.__uiTheme?.set(next as ThemePreference)}
    >
      <Select.Trigger aria-label="Color theme" icon={active.icon} />
      <Select.Content>
        {OPTIONS.map((option, index) => (
          <Select.Item key={option.value} index={index} value={option.value} icon={option.icon}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}
