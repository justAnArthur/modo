# ui/lib — shared helpers

Reach for these before writing the pattern by hand. One line each: what it is, when to use it.

## Refs, effects, geometry

- `merge-refs.ts` — `mergeRefs(...refs)`: one ref callback for a forwarded ref plus your own. `useMergeRefs(...refs)` is the stable form; use it when a ref holds state (`ref={useMergeRefs(ref, morph.popupRef)}` on a Base UI popup, in place of `useImperativeHandle`).
- `use-iso-layout-effect.ts` — `useIsoLayoutEffect`: a layout effect that server-renders. Never define it locally.
- `rect.ts` — `Rect` (`x y w h r`), `lerpRect`, `clampRect`, `placeRect`, `lerp`: a shape growing from one box into another (the morph engine, the accordion panel, Copy's disc). Rows and highlights keep `ItemRect` from `use-fluid-hover.ts`.

## Size and surface

- `primitives/sizes` `SizeScope` — `<SizeScope size={size}>`: wraps a component's subtree for its own `size` prop. Replaces `size ? <SizeProvider size={size}>{x}</SizeProvider> : x`.
- `surface-context.tsx` `useLift(offset)` — the level `offset` above the substrate, capped at 8. Replaces `Math.min(useSurface() + N, 8)`; re-provide it with `SurfaceProvider`.
- `row-index.tsx` — `IndexedRows` numbers a group's rows; `useRowIndex(own?)` is a row's index (0 outside a group); `useRowPosition()` is `undefined` outside `IndexedRows` (a table's header row).

## Rows, focus, labels

- `focus-ring.tsx` — `<FocusRing rect instant? className? />`: the keyboard ring that springs between rows, 2px outside the row. `instant` for a reflow; `className` for another shape's `focusRing`.
- `row-group.tsx` — `useRowFocus(hover, gate?)`: the hover follows focus, `focusRect` is set on keyboard focus (`gate`: a popup's `useKeyboardNavGate` ref). `useRowGroup(hover, { axis, activateOnFocus })`: that plus arrows / Home / End over the rows, for a group that navigates itself (Checkbox `axis: 'y'`, Radio `axis: 'xy', activateOnFocus: true`). Spread `.handlers` on the container. `focusRowOnPress`: a row's `onMouseDown`, so a press focuses the row, not the hidden control. `rowIndexOf(target)`: the fluid-hover index under an event target.
- `weight-label.tsx` — `<WeightLabel emphasized lit? weight? trim? truncate? className>`: a label that changes weight without reflowing (the invisible heavy copy). Replaces every ghost-span pair.
- `text-trim` (utility in `preset.ts`) — the text box from cap height to baseline. Replaces `[text-box:trim-both_cap_alphabetic]`.

## Overlays

- `overlay.tsx` —
  - `useOverlayRoot({ open, defaultOpen, onOpenChange })` → `{ open, setOpen, onOpenChange, state }`: a root's state both ways plus the morph origin. Pass `onOpenChange` to the Base UI root and `state` to `<OverlayContext.Provider>`.
  - `useOverlay('Part.Name')`: the root's `{ open, origin }` in a part; throws outside a root.
  - `AnchorProps` (`side`, `align`, `sideOffset`, `container`): extend it in an anchored content's props.
  - `positionerProps(props, { side, align, sideOffset })`: spread on the `Positioner`; handles opening in place.
  - `PortalContainer` + `usePortalContainer(container)`: scope every overlay's portal (replaces `Tooltip.PortalContainer`'s and ColorPicker's own contexts).
  - A popup may be mounted while closed (Select): reset overlay indices on close, remeasure on open.
- `use-morph.ts` `MorphProps` — `from`, `effect`, `hideSource`, `tier`, documented once: extend it in a content's props.
- `popup-surface.tsx` — `<PopupSurface morph lift="popup|panel" radius? className>`: the lift, the re-provided level, the background, the shadow (fixed 3 for popups, the level's for panels) and `MorphSurface`.
- `popup-rows.tsx` — `rowClasses({ size, shape, lit, disabled })`, `rowLabelClass`, `<RowIcon icon lit />`, `<CheckMark checked reserve? />` (reduced-motion aware), `PopupLabel`, `PopupSeparator`. A checked row's background is a `<GooIndicator rect className={cn('bg-active', shape.bg)} />`.
- `slot.tsx` — `slotPart<Props>(Primitive.Trigger, 'Name')`: a Base UI trigger or close part that takes `render` / `asChild`. `slotRender`: the same for a part you write by hand. `resolveSlotTemplate` + `slotElement`: `render` / `asChild` on a plain element, merging classes, styles, handlers and refs (Button, Sidebar).

## Text fields

- `use-autosize-textarea.ts` — `useAutosizeTextarea(ref, { minRows, maxRows }, deps)`: grows a textarea with its text, then scrolls; returns the measure.
