/*
 * Vendored from Fluid Functionalism — `registry/default/lib/popup.ts` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - `popupMotionClass` (the side-aware transform origin and slide offset of
 *   the old `scaleY` enter/exit) dropped: the dropdown, select and combobox
 *   popups now morph out of their trigger through `lib/use-morph.ts`.
 */

// ---------------------------------------------------------------------------
// Shared popup chrome for the dropdown, select, and combobox popups: the
// ScrollArea sizing the list scrolls inside. One definition, so the three
// popups never drift apart.
// ---------------------------------------------------------------------------

/**
 * Popup lists scroll inside ScrollArea: the hover-revealed thumb instead of
 * the platform scrollbar, and a scroll-aware fade on the viewport. The popup
 * is only max-height constrained, so the viewport's percentage height can't
 * resolve — it inherits the max-height instead (the ScrollArea root inherits
 * it from the popup) and sizes to its rows up to that. The scroll primitive's
 * inline-styled sizer is forced back to a plain block so rows can shrink and
 * truncate; the `[style]` qualifier keeps that off the rows' own wrapper on
 * touch devices, where ScrollArea renders no sizer.
 */
export const popupScrollAreaClass = 'min-h-0 flex-1 max-h-[inherit]'
export const popupViewportClass =
  '!h-auto max-h-[inherit] [&>div[style]]:!block [&>div[style]]:!min-w-0 [--scroll-fade-size:32px]'

/** Keys that count as keyboard navigation inside a popup (earn the ring). */
export const POPUP_NAV_KEYS = [
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Tab',
]

/**
 * Rows the fluid hover must skip: a disabled row is neither a target
 * nor a hover stop, whichever attribute the primitive marks it with.
 */
export function isDisabledRow(el: HTMLElement): boolean {
  return el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('data-disabled')
}
