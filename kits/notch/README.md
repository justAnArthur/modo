# @justanarthur/modo-ui-notch

The UI of a macOS notch app on [modo-ui](https://www.npmjs.com/package/@justanarthur/modo-ui): the island
that grows out of the notch (idle, compact, split, expanded, flash), its icon tabs across the wings around
the notch, and the pieces its activities show. Presentational: every component takes its data and
callbacks as props, so it fits any host (a Tauri or Electron panel, a web mock-up).

Docs and live examples: https://justanarthur.github.io/modo/notch/

## Install

```sh
npm install @justanarthur/modo-ui-notch @justanarthur/modo-ui react react-dom
```

`@justanarthur/modo-ui`, `react` and `react-dom` are peers: the kit uses your copy of modo-ui, so its
contexts (size, shape, surface) are the ones your app provides.

## Styles

Load modo-ui's stylesheet, then the kit's utilities:

```ts
import '@justanarthur/modo-ui/styles.css'
import '@justanarthur/modo-ui-notch/styles.css'
```

On UnoCSS or Tailwind, scan the kit's `dist/` with modo-ui's preset instead (see modo-ui's README).

## Usage

```tsx
import { Equalizer, Island, IslandFlash, IslandTabs } from '@justanarthur/modo-ui-notch'

export function NotchPanel({ state, onStateChange }) {
  return (
    <Island
      state={state}
      onStateChange={onStateChange}
      expandOnHover
      leading={<Artwork />}
      trailing={<Equalizer playing />}
      flash={<IslandFlash title="Charging" caption="38 min until full" value="82%" tone="success" />}
      expanded={<Panel />}
    />
  )
}
```

| Export | What it is |
|---|---|
| `Island` | The black outline hanging from the top edge, its five states, the compact wings, the split bubble that melts off through modo-ui's goo, the content swap. `state` / `defaultState` / `onStateChange`; geometry from `notchWidth`, `notchHeight`, `panelWidth`, `panelHeight`. |
| `IslandTabs` | Icon tabs in both wings around the notch, modo-ui's liquid indicator crossing the gap; overflow scrolls behind the notch. `value` / `defaultValue` / `onValueChange`, `onHoverChange` for a title preview. |
| `IslandFlash` | The transient alert's layout: icon, title, caption, value, trailing glyph, action. |
| `Equalizer` | Now-playing level bars on a compositor-only Web Animations loop. |
| `BatteryGlyph` | A battery that fills to its level, with a charging bolt and status tones. |
| `MediaScrubber` | Elapsed / scrubber / remaining on modo-ui's Slider; seeks once on commit. |
| `Countdown` | Time left as `4:05` or `4m`, re-rendering only on the shown unit's edge. |
| `useIsland()` | The enclosing Island's state, notch and panel geometry and current outline. |
| `shapeFor`, `islandPath`, `stripLayout`, … | The pure geometry (`@justanarthur/modo-ui-notch/lib/geometry`). |

Each component is also a subpath: `@justanarthur/modo-ui-notch/components/island`.

## License

MIT © 2026 justAnArthur
