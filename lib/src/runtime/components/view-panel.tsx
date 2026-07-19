// the docs site's right-side view panel. renders the theme / density /
// radius controls. by default each is a native <select> wrapped in
// SelectSlot (or the user's `Select` if provided).
//
// users can replace any individual control by setting the
// corresponding slot in modo.config.ts: `components.Theme`,
// `components.Density`, `components.Radius`. the user's component
// receives { current, options, set } as props (the same shape the
// useTheme / useDensity / useRadius hooks return), so they can use
// either the props or the hook — whichever fits the component.
//
// users can also use useTheme / useDensity / useRadius anywhere in
// their own app to build their own view controls.

import { useTheme, useDensity, useRadius, type ViewControl, type ViewControlState } from '../../exports/view'
import { Theme as UserTheme, Density as UserDensity, Radius as UserRadius } from 'virtual:modo-components'
import { SelectSlot } from './slot'
import { config as siteConfig } from 'virtual:modo-config'

// project defaults from modo.config.ts: theme.{defaultTheme, defaultDensity}.
// radius has no project default — 'rounded' is always the neutral.
const theme = (siteConfig as { theme?: { defaultTheme?: string; defaultDensity?: string } }).theme
const FALLBACKS = {
  theme: theme?.defaultTheme ?? 'system',
  density: theme?.defaultDensity ?? 'comfortable',
  radius: 'rounded',
}

export function ViewPanel() {
  const theme = useTheme({ fallback: FALLBACKS.theme })
  const density = useDensity({ fallback: FALLBACKS.density })
  const radius = useRadius({ fallback: FALLBACKS.radius })

  return (
    <>
      <h2 data-aui="panel-title">make them yours</h2>
      <p data-aui="panel-hint">
        override <code>data-aui</code> styles in your <code>global.css</code>.
      </p>
      {UserTheme
        ? <UserTheme {...theme} />
        : <DefaultControl control="theme" label="Theme" state={theme} />}
      {UserDensity
        ? <UserDensity {...density} />
        : <DefaultControl control="density" label="Density" state={density} />}
      {UserRadius
        ? <UserRadius {...radius} />
        : <DefaultControl control="radius" label="Radius" state={radius} />}
    </>
  )
}

function DefaultControl({ control, label, state }: { control: ViewControl; label: string; state: ViewControlState }) {
  return (
    <label data-aui="control" data-control={control}>
      <span data-aui="control-label">{label}</span>
      <SelectSlot
        value={state.current}
        onChange={state.set}
        options={state.options}
      />
    </label>
  )
}
