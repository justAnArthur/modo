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
import TabsSubtle from '../components/tabs-subtle'

type ThemePreference = 'light' | 'dark' | 'system'

declare global {
  interface Window {
    __uiTheme?: { get: () => ThemePreference; set: (next: ThemePreference) => void }
  }
}

const ORDER: ThemePreference[] = ['light', 'dark', 'system']
const TABS = [
  { icon: Sun, label: 'Light' },
  { icon: Moon, label: 'Dark' },
  { icon: Monitor, label: 'System' },
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

  return (
    <TabsSubtle
      size="compact"
      activeLabel
      aria-label="Color theme"
      selectedIndex={Math.max(0, ORDER.indexOf(preference))}
      onSelect={(index) => window.__uiTheme?.set(ORDER[index] ?? 'system')}
    >
      {TABS.map((tab, index) => (
        <TabsSubtle.Item key={tab.label} index={index} icon={tab.icon} label={tab.label} />
      ))}
    </TabsSubtle>
  )
}
