# example-card centering + hover-reveal toggle

> Small change to lib chrome: center the rendered component inside the card
> and move the "show code" toggle to the top-right of the card, hidden by
> default and revealed on card hover.

---

## TL;DR

Two files touched. No API change. No new dep. Host overrides keep working.

| File | What changes |
|---|---|
| `lib/src/runtime/components/example-renderer.tsx` | Move `<button data-aui="example-toggle">` out of the `example-card-meta` row, into the card root as a sibling of the stage. Drop the now-empty `example-card-actions` wrapper. |
| `lib/src/runtime/styles/base.css` | Make `example-card` positioned; center its stage; absolutely position the toggle in the top-right with `opacity: 0` and reveal on `:hover` / `:focus-within` / touch. |

Total: ~15 lines of TSX, ~10 lines of CSS.

---

## Current state (relevant bits)

`example-renderer.tsx:144-173` — card has two siblings:
- `example-card-stage` — the rendered component (block, flows at the start)
- `example-card-meta` — name, description, **and the toggle** in `example-card-actions`, then the `<pre>` code when toggled

`base.css:106-115` — the card is `display: flex; flex-direction: column; gap: 12px; overflow: visible;` (no `position`).

`base.css:117-124` — the stage is `display: block; min-height: 120px;` — intentionally not a flex-center, comment warns about clipping absolutely-positioned children of the rendered example (popovers, dropdowns).

`base.css:351-372` — the toggle is a static borderless button in the actions row.

---

## What changes

### 1. `example-renderer.tsx`

Move the toggle to be a direct child of the card, sibling of the stage. Drop the empty `example-card-actions` wrapper.

```tsx
return (
  <div data-aui="example-card">
    <div data-aui="example-card-stage">
      {error
        ? <code data-aui="example-error">{error}</code>
        : rendered ?? <span data-aui="example-loading">…</span>}
    </div>
    <button
      type="button"
      data-aui="example-toggle"
      aria-expanded={showCode}
      onClick={() => setShowCode((v) => !v)}
    >
      {showCode ? 'hide code' : 'show code'}
    </button>
    <div data-aui="example-card-meta">
      <span data-aui="example-card-name">{example.name}</span>
      {example.description && (
        <div data-aui="example-card-description">
          <Markdown source={example.description} />
        </div>
      )}
      {showCode && (
        <pre data-aui="example-code"><code>{example.code}</code></pre>
      )}
    </div>
  </div>
)
```

Note: `aria-expanded` stays on the toggle — it's still the disclosure control.

### 2. `base.css`

```css
[data-aui="example-card"] {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;        /* NEW: containing block for the absolute toggle */
  overflow: visible;
}

[data-aui="example-card-stage"] {
  display: flex;             /* CHANGED: was block */
  align-items: center;       /* NEW */
  justify-content: center;   /* NEW */
  min-height: 120px;
  /* a flex center is fine here: the rendered example is the only flex
     child, and its absolute-positioned descendants (popovers etc.)
     resolve to the nearest positioned ancestor outside the stage. */
}

[data-aui="example-toggle"] {
  position: absolute;        /* NEW */
  top: 8px;                  /* NEW */
  right: 8px;                /* NEW */
  z-index: 1;                /* NEW: above stage content */
  opacity: 0;                /* NEW: hidden by default */
  transition: opacity 120ms ease;  /* NEW */
  /* existing visual styles unchanged */
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  padding: 2px 8px;
  color: var(--muted-foreground);
  font-size: 10px;
  font-family: var(--font-mono, monospace);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

[data-aui="example-card"]:hover [data-aui="example-toggle"],
[data-aui="example-card"]:focus-within [data-aui="example-toggle"] {
  opacity: 1;                /* reveal on hover or keyboard focus */
}

/* touch devices have no hover — keep the toggle visible */
@media (hover: none) {
  [data-aui="example-toggle"] { opacity: 1; }
}
```

The `example-card-actions` rule (currently `base.css:351-355`) becomes orphan — delete it.

---

## Why this approach

- **Ponytail rung 4-5.** Native CSS `:hover` and `@media (hover: none)`. No new dep. ~10 lines of CSS.
- **No new JSX abstractions.** Just relocate one element and drop an empty wrapper.
- **Accessibility kept.** `opacity: 0` keeps the button in the layout tree and the a11y tree. `:focus-within` on the card makes it visible on keyboard focus, and the `aria-expanded` state is still announced.
- **Touch devices don't get a broken UX.** `@media (hover: none)` keeps the toggle visible.
- **Host overrides survive.** The demo's `overrides.css` doesn't touch these hooks. The structural changes are additive.
- **No change to public API.** The `data-aui` contract is preserved; existing host styling keeps applying.

## Trade-offs

- The "show code" button becomes discoverable only via hover (or focus). For a code-preview widget this is the standard pattern (ShadCN, Radix Themes, Tailwind UI all use it), but it's still a trade-off — first-time users won't know to look for it.
- The card becomes a positioning context. Any future absolute-positioned chrome from the host must account for that (no breaking change today, just a note).

## Out of scope

- Centering the **card itself** within the `examples` column. The current `examples` container is `flex-direction: column; gap: 24px` — cards stretch full-width, which is the standard docs layout. If the user also wants the card centered in the page, that's a separate change to the `examples` rule (e.g. `align-items: center` on the column, or `max-width` on the card). Flag it if needed.
- Restyling the toggle's visual chrome. Existing pill shape, mono font, uppercase — all kept.
- Animating the `<pre>` reveal. The pre appears/disappears via React conditional render; if we want a slide/fade, that's a follow-up.

---

## Verification

1. `bun --filter modo-atomic-ui dev` (or whatever the local dev command is — check `package.json` scripts).
2. Open any docs page that has an example (e.g. `/components/button`).
3. Visual checks:
   - [ ] The rendered example sits in the visual center of the card stage (both axes, with `min-height: 120px`).
   - [ ] No "show code" / "hide code" button visible at rest.
   - [ ] Hovering the card reveals the toggle in the top-right of the card.
   - [ ] Clicking the toggle reveals the code below the meta row; clicking again hides it.
   - [ ] Tabbing through the page lands focus on the toggle; it becomes visible on focus.
   - [ ] On a touch device (or DevTools touch emulation), the toggle is always visible.
4. Keyboard check: `aria-expanded` toggles correctly on the button.
5. No visual regression in the description / name / pre code sections.

---

## Next step

If this looks right, I'll implement it. Two files, ~25 lines net change, no new deps.
