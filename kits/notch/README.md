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
| `Widget` | The frame every open-island widget is built in (picture, main column, aside past a hairline) and its parts: `.Header`, `.Title`, `.Subtitle`, `.Figure`, `.Meta` / `.MetaItem`, `.Action`, `.Section`, `.Row`, `.Chip`, `.Message`, `.Sheet`; `align="start"` tops the columns for a widget whose columns differ in height. One primary button per view (the hero's action); the rest `secondary` or a `.Action`. |
| `Widget.Message` | The empty, connect, permission and error state, starting on the 20 px content inset: `icon`, `title`, `description`; `onAction` / `actionLabel` for its one primary button (`'Open settings'`), `actions` for secondary ones; `layout="tall"` sets it at the top of the tall snap. |
| `Level` | The volume / brightness / keyboard HUD: `icon`, a horizontal level bar (`value` 0–1, `label`), `showValue` (`true` for the percent, or a node such as `Muted`), `size`. |
| `PermissionList` | Permissions in four states, `allowed` (Allowed), `notAsked` (Not asked: Allow…), `off` (Off: Open System Settings) and `stale` (Needs reset: Fix), unset while read. `permissions: { id, label, description, state?, note?, action? }[]` (`action` is the Fix slot), `onFix(id, state)`, `title`, `aside`; `permissionsNeedingAttention(permissions)` counts the off and stale ones. |
| `Equalizer` | Now-playing level bars on a compositor-only Web Animations loop. |
| `MediaScrubber` | Elapsed / scrubber / remaining on modo-ui's Slider; seeks once on commit; `quiet` is a thin line until hovered. |
| `Countdown` | Time left as `4:05` or `4m`, re-rendering only on the shown unit's edge. |
| `NowPlaying` | The player for the open island (artwork that never blinks, tinted glow, one thin scrubber at both snaps, transport, the source once and the output as a chip, `outputShort` for its short name, shuffle / repeat / like), with `.Leading` / `.Trailing` (compact wings), `.Minimal` (split bubble), `.Flash` (track change) and `.Artwork`. |
| `Agenda` | The next event as the hero (countdown, Join), the rest of today and tomorrow beside it, access states; `.Leading`, `.Trailing`, `.Minimal`, `.UpNext`, `.Starting` (the countdown to the next event). |
| `Weather` | The temperature now as the hero (`7°`, the unit in settings), a temperature curve with each hour's value at the tall snap, one figure for today's rain, no refresh button (the age shows once over 30 min), the next hours and tomorrow beside it, °C / °F, loading, offline, error and location-access states; `.Leading`, `.Trailing`, `.Minimal`, `.Alert` (rain soon, a warning); `conditionFromCode` reads a WMO code. |
| `Clock` | The time, the date and world clocks, and a Pomodoro cycle (focus amber, short break green, long break blue, open rounds a neutral) that takes the widget over while it runs (pause, skip, +1 min, reset); `.Leading`, `.Trailing`, `.Minimal`, `.PhaseDone` (focus done, break over); `startPomodoro`, `advancePomodoro`, `resumePomodoro`. |
| `SystemStats` | The CPU load as the hero with its trend (a 20 % floor, no fill under a flat line), or memory pressure as one meter, battery, disk and uptime under it, the busiest processes beside it; `.Leading`, `.Trailing`, `.Minimal`. |
| `ClipboardHistory` | The latest clip as the hero (text, link, image, color, file), the searchable history beside it (both top-aligned, the search on a visible field) with pins, Pause / Resume recording (eye-slash, a Not recording chip) and ignored apps; `.Leading`, `.Trailing`, `.Copied`. |
| `RecentFiles` | The newest download, screenshot or kept file (`source: 'shelf'`, the notch's shelf, labelled Kept; `shelf` for its room) as the hero, ready to open, reveal, AirDrop (`onAirDrop`), copy or drag out, the ones before it beside it as name · size · age, a download under way, Clear in two presses; `.Leading`, `.Trailing`, `.Minimal`, `.Saved`. |
| `ExpandedIsland` | The open island's layout: tabs in the wings, the tab's title, a fixed-height scrolling view. |
| `SettingsWindow` | The app's settings: General, Plugins, Permissions, About and the host's own `pages` (placed `after` a built-in one) in one unlabelled sidebar group; a plugin's page opens only from its row in Plugins (a Plugins button leads back); a plugin row takes a `badge` and `actions`. Permissions is a `PermissionList` (`permissions[].state`, `onFixPermission(id, state)`), and its sidebar row counts the ones off or stale. About takes `aboutHeader` (`{ icon?, name, version?, copyright? }`) over its `about` rows. |
| `LibraryListing` | A plugin library for a settings page: each plugin's state (install, update, incompatible, installing, failed), permission and host chips, loading, offline and empty states; `.Detail`, one plugin's page with screenshots and its permissions explained. |
| `useStableArtwork`, `useArtworkTint` | Artwork held across updates and the tint read from an image (`@justanarthur/modo-ui-notch/lib/artwork`). |
| `useIsland()` | The enclosing Island's state, notch and panel geometry and current outline. |
| `shapeFor`, `islandPath`, `stripLayout`, … | The pure geometry (`@justanarthur/modo-ui-notch/lib/geometry`). |
| `RADIUS`, `innerRadius`, `INSET` | The island's radii, 32 open / 22 flash / 13 compact / 10 idle, and the concentric radius for a tile inside one (`innerRadius(32)` is 12 at the 20 px `INSET`). |
| `motionScale`, `settle`, `tierMs`, `hoverDelay`, … | The one motion scale (`@justanarthur/modo-ui-notch/lib/motion`), below. |

## Motion

One scale of four springs, in `visualDuration` + `bounce` so a move reads the same at any distance. The kit
writes no other duration; a host (the runtime, the launcher, plugins) imports the same tiers.

| Tier | visualDuration | bounce | Use |
|---|---|---|---|
| `micro` | 0.12 s | 0 | hover pills, tab highlights, toggles, icon swaps |
| `small` | 0.22 s | 0 | idle ↔ compact, wing content, popovers, launcher results |
| `medium` | 0.32 s | 0.12 | compact → flash, the split bubble's goo, the launcher pill's drop |
| `large` | 0.40 s | 0.15 | the open island and its snaps |

```ts
import { contentEnter, hoverDelay, motionScale, settle, shapeTransition } from '@justanarthur/modo-ui-notch/lib/motion'

animate(width, 648, motionScale.large) // grow on the target's tier
animate(width, 260, settle('large')) // shrink: the same tier, bounce 0, 80 % as long
```

- Bounce stays at 0.15 or under on anything bigger than a button.
- `shapeTransition(from, to)` grows the island on the target state's tier and shrinks it on the source's, settled.
- Content enters with the shape, no delay (`contentHidden` → `contentShown` over `contentEnter`, about 200 ms:
  opacity, scale 0.96 → 1, blur 4 → 0) and leaves in 0.1 s without the scale (`contentGone`, `contentLeave`);
  with reduced motion it crossfades on `micro` (`contentFade`).
- `hoverDelay`: 100 ms before a hover opens the island, 250 ms before leaving closes it. `tierMs(tier)` is a
  tier in ms, for a timer or a Web Animation.

Each component and block is also a subpath: `@justanarthur/modo-ui-notch/components/island/island`, `@justanarthur/modo-ui-notch/blocks/activities/now-playing`.

## License

MIT © 2026 justAnArthur
