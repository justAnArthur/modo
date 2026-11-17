/*!
 * Local addition: the notch app's settings window.
 */

'use client'

import SettingsWindow from '../../blocks/app/settings-window'
import { ABOUT, MockWindow, PERMISSIONS, PLUGINS } from '../../mock/settings'

interface SettingsProps {
  /** The page open at first. Defaults to `'general'`. */
  page?: string
}

/**
 * The notch app's settings, in a window of its own: General, Plugins,
 * Permissions and About, then a page for each plugin that brings settings.
 *
 * Walk the sidebar: General's launch at login switch and the screens the
 * island shows on; the seven plugins, each with its switch and a chevron to
 * its page; what macOS granted, with Open Settings beside Location, which it
 * didn't, and a spinner on Automation, still being read; the version. Under
 * Plugin settings each plugin's own, as grouped rows of a label, what it
 * does and its control: the track announcement, the calendar's countdown
 * and alerts, the weather's location, unit and rain alert, the clock's
 * format, world clocks and Pomodoro lengths, the System widget's hero and
 * wings, the clipboard's history and the apps it never records from, and
 * the folders Recent files watches. It is the SettingsWindow block in a
 * token-made window frame of the app's real size, scaled down to fit.
 *
 * @example {@include ./examples.mdx}
 */
export default function Settings({ page = 'general' }: SettingsProps) {
  return (
    <MockWindow title="Just Notch Settings">
      <SettingsWindow name="Just Notch" defaultValue={page} plugins={PLUGINS} permissions={PERMISSIONS} about={ABOUT} />
    </MockWindow>
  )
}
