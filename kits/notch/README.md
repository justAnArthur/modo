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
      flash={<IslandFlash title="Focus done" caption="A short break next" value="5 min" tone="success" />}
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
| `Widget` | The frame every open-island widget is built in (picture, main column, aside past a hairline) and its parts: `.Header`, `.Title`, `.Subtitle`, `.Figure`, `.Meta` / `.MetaItem`, `.Action`, `.Section`, `.Row`, `.Chip`, `.Message`. |
| `Equalizer` | Now-playing level bars on a compositor-only Web Animations loop. |
| `MediaScrubber` | Elapsed / scrubber / remaining on modo-ui's Slider; seeks once on commit; `quiet` is a thin line until hovered. |
| `Countdown` | Time left as `4:05` or `4m`, re-rendering only on the shown unit's edge. |
| `NowPlaying` | The player for the open island (artwork that never blinks, tinted glow, scrubber, transport, source and output, shuffle / repeat / like), with `.Leading` / `.Trailing` (compact wings), `.Minimal` (split bubble), `.Flash` (track change) and `.Artwork`. |
| `Agenda` | The next event as the hero (countdown, Join), the rest of today and tomorrow beside it, access states; `.Leading`, `.Trailing`, `.Minimal`, `.UpNext`, `.Starting` (the countdown to the next event). |
| `Weather` | The temperature now as the hero, the next hours and tomorrow beside it, °C / °F, loading, offline, error and location-access states; `.Leading`, `.Trailing`, `.Minimal`, `.Alert` (rain soon, a warning); `conditionFromCode` reads a WMO code. |
| `Clock` | The time, the date and world clocks, and a Pomodoro cycle that takes the widget over while it runs (pause, skip, +1 min, reset); `.Leading`, `.Trailing`, `.Minimal`, `.PhaseDone` (focus done, break over); `startPomodoro`, `advancePomodoro`, `resumePomodoro`. |
| `SystemStats` | The CPU load (or memory pressure) as the hero with its trend, battery, disk and uptime under it, the busiest processes beside it; `.Leading`, `.Trailing`, `.Minimal`. |
| `ClipboardHistory` | The latest clip as the hero (text, link, image, color, file), the searchable history beside it with pins, pause and ignored apps; `.Leading`, `.Trailing`, `.Copied`. |
| `RecentFiles` | The newest download or screenshot as the hero, ready to open, reveal, copy or drag out, the ones before it beside it, a download under way; `.Leading`, `.Trailing`, `.Minimal`, `.Saved`. |
| `ExpandedIsland` | The open island's layout: tabs in the wings, the tab's title, a fixed-height scrolling view. |
| `SettingsWindow` | The app's settings: General, Plugins, Permissions, About and each plugin's page. |
| `useStableArtwork`, `useArtworkTint` | Artwork held across updates and the tint read from an image (`@justanarthur/modo-ui-notch/lib/artwork`). |
| `useIsland()` | The enclosing Island's state, notch and panel geometry and current outline. |
| `shapeFor`, `islandPath`, `stripLayout`, … | The pure geometry (`@justanarthur/modo-ui-notch/lib/geometry`). |

Each component and block is also a subpath: `@justanarthur/modo-ui-notch/components/island/island`, `@justanarthur/modo-ui-notch/blocks/activities/now-playing`.

## License

MIT © 2026 justAnArthur
