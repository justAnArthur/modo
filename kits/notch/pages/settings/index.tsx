/*!
 * Local addition: the notch app's settings window.
 */

'use client'

import SettingsWindow from '../../blocks/settings-window'
import { ABOUT, MockWindow, PERMISSIONS, PLUGINS } from '../../mock/settings'

interface SettingsPageProps {
  /** The page open at first. Defaults to `'general'`. */
  page?: string
}

/**
 * The notch app's settings, in a window of its own: General, Plugins,
 * Permissions and About, then a page for each plugin that brings settings.
 *
 * Walk the sidebar: General's launch at login switch and the screens the
 * island shows on; the plugins, each with its switch; what macOS granted,
 * with Open Settings beside Accessibility, which it didn't, and a spinner on
 * Automation, still being read; the version. Under Plugin settings each
 * plugin's own: the track announcement, the power alerts, Pomodoro cycles,
 * the calendar's countdown, the HUD with its Accessibility warning, the CPU
 * load beside the notch. It is the SettingsWindow block in a token-made
 * window frame of the app's real size, scaled down to fit.
 *
 * @example {@include ./examples.mdx}
 */
export default function SettingsPage({ page = 'general' }: SettingsPageProps) {
  return (
    <MockWindow title="Just Notch Settings">
      <SettingsWindow name="Just Notch" defaultValue={page} plugins={PLUGINS} permissions={PERMISSIONS} about={ABOUT} />
    </MockWindow>
  )
}
