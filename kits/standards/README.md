# @justanarthur/modo-ui-standards

The UI of just-standards on [modo-ui](https://www.npmjs.com/package/@justanarthur/modo-ui): every business
measured against packs of standards, one business's grid of assets × items, and a failing cell handed to an
AI worker. Presentational: every component takes its data and callbacks as props, so it fits any host (the
just-apps desktop app, a web mock-up).

Docs and live examples: https://justanarthur.github.io/modo/standards/

## Install

```sh
npm install @justanarthur/modo-ui-standards @justanarthur/modo-ui react react-dom
```

`@justanarthur/modo-ui`, `react` and `react-dom` are peers: the kit uses your copy of modo-ui, so its
contexts (size, shape, surface) are the ones your app provides.

## Styles

Load modo-ui's stylesheet, then the kit's utilities:

```ts
import '@justanarthur/modo-ui/styles.css'
import '@justanarthur/modo-ui-ai/styles.css' // the run transcripts
import '@justanarthur/modo-ui-standards/styles.css'
```

On UnoCSS or Tailwind, scan the kit's `dist/` with modo-ui's preset instead (see modo-ui's README).

## Usage

```tsx
import { BusinessGrid, CellDetail } from '@justanarthur/modo-ui-standards'

export function BusinessScreen({ business, packs, cells, workers, onFix }) {
  return (
    <BusinessGrid
      business={business}
      packs={packs}
      cells={cells}
      workers={workers}
      onOpenCell={openDrawer}
      onFix={(picked, worker) => onFix(picked, worker)}
    />
  )
}
```

| Export | What it is |
|---|---|
| `StateCell` | One asset × one item: a 24px cell with one look per state (pass, pass on an older version, fail, error, stale, unchecked, waived, a worker on it, a PR open) and a hover card with the evidence. `StateCell.Glyph` is the look alone, for a legend. |
| `CoverageMeter` | A coverage percent beside a short bar, in the error hue below half. |
| `PackCoverageCell` | One business × one pack on the overview: coverage and fail count, or a dashed "not adopted". |
| `WorkerPicker` | Fix with ▾ worker: the fix action and a menu of worker presets with their model, effort and permission mode. |
| `BusinessesOverview` | Businesses × packs, with a summary strip, a total per business and Add business; sticky head and first column. |
| `BusinessGrid` | One business's assets (grouped by kind) × its adopted packs' items (grouped by pack), a legend, coverage per row, a multi-cell fix on one asset, and item and pack heads that open them (`onOpenItem`, `onOpenPack`). |
| `CellDetail` | One cell's drawer: state, evidence, the item's why, the check as YAML, history, Fix with, Re-check, Waive. |
| `ItemDetail` | One item's side pane: label, version, pack, asset kinds, why, the check as YAML, the recipe as Markdown, and each asset's cell across the given businesses. |
| `PackDetail` | One pack's side pane: description, its items with version, since and coverage, the changelog, and who adopted it at which version. |
| `PackList` | The Packs screen: each pack's version, item count, adopters and coverage, rows that open it. |
| `WorkerList` | The Workers screen: each worker preset's runtime, model, effort, permission mode, profile and allowed tools, read-only. |
| `coverageOf`, `itemsOf`, `adoptedVersion`, `shownState`, … | The pure arithmetic of the grids (`@justanarthur/modo-ui-standards/lib/cells`). |
| `Business`, `CellStatus`, `LoadedPack`, `Worker`, … | The just-standards model as the UI reads it (`@justanarthur/modo-ui-standards/lib/types`). |

Each component and block is also a subpath: `@justanarthur/modo-ui-standards/components/status/state-cell`,
`@justanarthur/modo-ui-standards/blocks/business-grid`.

## License

MIT © 2026 justAnArthur
