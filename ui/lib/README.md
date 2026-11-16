# ui/lib — shared helpers

Reach for these before writing the pattern by hand. One line each: what it is, when to use it.

## Refs, effects, geometry

- `merge-refs.ts` — `mergeRefs(...refs)`: one ref callback for a forwarded ref plus your own. `useMergeRefs(...refs)` is the stable form; use it when a ref holds state (`ref={useMergeRefs(ref, morph.popupRef)}` on a Base UI popup, in place of `useImperativeHandle`).
- `use-iso-layout-effect.ts` — `useIsoLayoutEffect`: a layout effect that server-renders. Never define it locally.
- `rect.ts` — `Rect` (`x y w h r`), `lerpRect`, `clampRect`, `placeRect`, `lerp`: a shape growing from one box into another (the morph engine, the accordion panel, Copy's disc). Rows and highlights keep `ItemRect` from `use-fluid-hover.ts`.

## State and motion

- `use-controllable-state.ts` — `useControllableState(value, defaultValue, onChange)`: every two-way prop. With an optional default the state may be `undefined`, but `onChange` and the setter take `NonNullable<T>`.
- `springs.ts` `springEnter(tier)` — a tier without its `exit`, for a `transition` that must not carry one. Replaces `const { exit: _exit, ...enter } = spring.x`.

## Size and surface

- `size-scale.ts` — `sizeMap`, `typeScale` and their types (`SizeVariant`, `SizeClasses`): the ladder's class tables, pure, so a Server Component can read them. `size-context.tsx` re-exports them beside the hooks (`useSize`, `useSizeVariant`, `useTypeScale`).
- `shape-classes.ts` — `shapeMap` and `ShapeVariant`: the shape's class tables, pure. `shape-context.tsx` re-exports them beside `ShapeProvider` / `useShape`.
- `primitives/systems/sizes` `SizeScope` — `<SizeScope size={size}>`: wraps a component's subtree for its own `size` prop. Replaces `size ? <SizeProvider size={size}>{x}</SizeProvider> : x`.
- `surface-context.tsx` `useLift(offset)` — the level `offset` above the substrate, capped at 8. Replaces `Math.min(useSurface() + N, 8)`; re-provide it with `SurfaceProvider`.
- `row-index.tsx` — `IndexedRows` numbers a group's rows; `useRowIndex(own?)` is a row's index (0 outside a group); `useRowPosition()` is `undefined` outside `IndexedRows` (a table's header row). `isRow(child)` picks which children count, so a label or separator between rows takes no position (Dropdown).

## Rows, focus, labels

- `focus-ring.tsx` — `<FocusRing rect instant? className? />`: the keyboard ring that springs between rows, 2px outside the row. `instant` for a reflow; `className` for another shape's `focusRing`.
- `row-group.tsx` — `useRowFocus(hover, gate?)`: the hover follows focus, `focusRect` is set on keyboard focus (`gate`: a popup's `useKeyboardNavGate` ref). `useRowGroup(hover, { axis, activateOnFocus })`: that plus arrows / Home / End over the rows, skipping `aria-disabled` ones, for a group that navigates itself (Checkbox `axis: 'y'`, Radio `axis: 'xy', activateOnFocus: true`). A disabled row keeps its index. Spread `.handlers` on the container. `focusRowOnPress`: a row's `onMouseDown`, so a press focuses the row, not the hidden control. `rowIndexOf(target)`: the fluid-hover index under an event target.
- `weight-label.tsx` — `<WeightLabel emphasized lit? weight? trim? truncate? className>`: a label that changes weight without reflowing (the invisible heavy copy). Replaces every ghost-span pair. It forwards its ref and HTML props to the wrapper; `truncate` is `'line'` (one line, ellipsis) or `'inherit'` (an ellipsis only under an inherited `nowrap`, a consumer's `truncate`); `weight` is `'medium'` or `'semibold'` (default).
- `text-trim` (utility in `preset.ts`) — the text box from cap height to baseline. Replaces `[text-box:trim-both_cap_alphabetic]`.

## Overlays

- `overlay.tsx` —
  - `useOverlayRoot({ open, defaultOpen, onOpenChange })` → `{ open, setOpen, onOpenChange, state }`: a root's state both ways plus the morph origin. Pass `onOpenChange` to the Base UI root and `state` to `<OverlayContext.Provider>`.
  - `useOverlay('Part.Name')`: the root's `{ open, origin }` in a part; throws outside a root.
  - `AnchorProps` (`side`, `align`, `sideOffset`, `container`): extend it in an anchored content's props.
  - `positionerProps(props, { side, align, sideOffset })`: spread on the `Positioner`; handles opening in place.
  - `PortalContainer` + `usePortalContainer(container)`: scope every overlay's portal (replaces `Tooltip.PortalContainer`'s and ColorPicker's own contexts).
  - A popup may be mounted while closed (Select): reset overlay indices on close, remeasure on open.
- `use-morph.ts` `MorphProps` — `from`, `effect`, `hideSource`, `tier`, documented once: extend it in a content's props. `returnFocus: false` when the owner places focus itself (Base UI's `finalFocus`).
- `popup-surface.tsx` — `<PopupSurface morph lift="popup|panel" radius? className>`: the lift, the re-provided level, the background, the shadow (fixed 3 for popups, the level's for panels) and `MorphSurface`.
- `popup.ts` — `POPUP_SHAPE`: the shape every popup list reads (`shapeMap.rounded`, whatever the global shape: pill corners break the rows' concentric fit). Never `shapeMap.rounded` inline. Also `popupScrollAreaClass` / `popupViewportClass`, `POPUP_NAV_KEYS`, `isDisabledRow`.
- `popup-rows.tsx` — `rowClasses({ size, shape, lit, disabled })`, `rowLabelClass`, `rowLabelBoxClass(label)` (text trims and truncates; a node label keeps its own box) over `isTextLabel(label)`, `<RowIcon icon lit />`, `<CheckMark checked reserve? />` (reduced-motion aware), `PopupLabel`, `PopupSeparator`. A checked row's background is a `<GooIndicator rect className={cn('bg-active', shape.bg)} />`.
- `slot.tsx` — `slotPart<Props>(Primitive.Trigger, 'Name')`: a Base UI trigger or close part that takes `render` / `asChild`. `slotRender`: the same for a part you write by hand. `resolveSlotTemplate` + `slotElement`: `render` / `asChild` on a plain element, merging classes, styles, handlers and refs (Button, Sidebar).

## Text fields and dates

- `field-box.ts` — `useFieldBox({ variant, invalid, disabled, readOnly, required, active, size })`: the box around a text field's control (the ladder in its `variant`, `data-active` / `data-invalid` / `data-disabled` / `data-readonly`, radius, inset), returning the resolved state for the control's attributes; `focusControlOnPress(ref)` for a press in its padding. `FieldStateContext` carries a field's state (Field, InputGroup.Field) to the control inside it, and `useFieldState({ invalid, disabled, readOnly, required })` resolves a control's own props against it (own prop wins) for a root that is not the box (Select, Combobox, the pickers). Its `labelId` names a control Base UI doesn't label.
- `field-classes.ts` — the ladder's class tables, pure: `fieldVariants` (with `data-readonly`: the ring when lit or focused, never the fill), `fieldIconClasses` for a leading icon, `fieldAdornmentClasses` + `FIELD_ADORNMENT_ICON[size]` for content beside the text (a unit, a prefix), `fieldActionClasses` + `FIELD_ACTION[size]` + `FIELD_ACTION_RADIUS[shape]` for an icon button inside the box (4px inside the ring; `FIELD_ACTION_BOX` / `FIELD_ACTION_END` for a side-by-side pair), `fieldTextInset[size]` lines a label or message up with the text inside.
- `spinner-glyph.tsx` — `<SpinnerGlyph className />`: Button's figure-eight loading glyph (Button, Progress.Spinner), on `--duration-loop`, breathing under reduced motion.
- `use-autosize-textarea.ts` — `useAutosizeTextarea(ref, { minRows, maxRows }, deps)`: grows a textarea with its text, then scrolls; returns the measure.
- `date-locale.ts` — `monthRange(today, startMonth?, endMonth?)`: the `{ start, end }` months a picker offers: `startMonth` / `endMonth`, else 100 years back and 50 ahead. Calendar and MonthPicker share it. Also the locale readers (`hourCycleOf`, `parseDateText`, `parseTimeText`, `parseMonthText`, `fieldLabel`).
- `date-mask.ts` — the locale's numeric date mask an editable picker types into: `dateMask(locale, withTime)`, `layoutMask` / `formatMask` / `parseMask` (exact days only), `editMask` (one keystroke: overtype, Backspace, Delete), `localeDigits`, `maskGhost`. Pure; tested in `ui/test`.
