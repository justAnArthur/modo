/*
 * Vendored from Fluid Functionalism — `registry/default/lib/size-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - The ladder's plain data (`sizeMap`, `typeScale` and their types), split out
 *   of `lib/size-context.tsx` so server code can read it: no JSX, hooks or
 *   contexts here. `size-context.tsx` re-exports all of it.
 * - `sizeMap` text classes read DS tokens (AGENTS.md styling): `text-[13px]` /
 *   `text-[12px]` → `text-body` / `text-body-compact`.
 */

type SizeVariant = 'default' | 'compact'

interface SizeClasses {
  /** The variant these classes belong to — handy for conditionals. */
  variant: SizeVariant
  /** Bounded control height — buttons, inputs, select triggers, subtle tabs —
   *  AND list/menu rows (select options, dropdown, checkbox and radio rows).
   *  One token by design: a popup row lines up with the trigger that opened
   *  it because they share this height. */
  control: string
  /** `control` as a number, for consumers that need raw pixels. */
  controlHeight: number
  /** Tab trigger height inside a padded segmented list. Sized so
   *  `segmentPad` + `segmentItem` adds back up to the control height —
   *  the segmented control's outer box stays on the same ladder. */
  segmentItem: string
  /** Padding of the segmented list around its tabs. */
  segmentPad: string
  /** Body text inside controls. */
  text: string
  /** Horizontal padding of bounded controls (select trigger, inputs). */
  px: string
  /** Horizontal padding of list/menu rows, which sit inside a padded popup
   *  or group and need less inset than a bounded control. */
  itemPx: string
  /** Gap between an icon / control glyph and its label, and between
   *  neighbouring controls in a row (toolbars, filter bars, button
   *  clusters). Density is spacing as much as control height, so the
   *  compact step halves it. */
  gap: string
  /** Glyph size in px: leading/trailing icons inside controls, and the
   *  checkbox square / radio circle. */
  icon: number
}

const sizeMap: Record<SizeVariant, SizeClasses> = {
  // 36px — the default control height. Matches a 13px label with comfortable
  // breathing room and keeps controls a workable pointer target.
  default: {
    variant: 'default',
    control: 'h-9',
    controlHeight: 36,
    segmentItem: 'h-7',
    segmentPad: 'p-1',
    text: 'text-body',
    px: 'px-3',
    itemPx: 'px-2',
    gap: 'gap-2',
    icon: 16,
  },
  // 28px — the compact height for dense surfaces: filter bars, toolbars,
  // table headers, sidebars. One step down in text (12px) and icon (14px)
  // so the whole control shrinks together, not just its box.
  compact: {
    variant: 'compact',
    control: 'h-7',
    controlHeight: 28,
    segmentItem: 'h-6',
    segmentPad: 'p-0.5',
    text: 'text-body-compact',
    px: 'px-2.5',
    itemPx: 'px-1.5',
    gap: 'gap-1',
    icon: 14,
  },
}

/** One role of the type scale: px per ladder step. */
interface TypeScaleStep {
  default: number
  compact: number
}

/**
 * Role-based type scale, per ladder step (px values).
 *
 * The default column is the system as shipped; the compact column steps each
 * role down one notch so dense regions read as a smaller sibling of the same
 * hierarchy, not a squeezed copy. `body`, `caption`, and `subtitle` are what
 * the sized components already render through `SizeClasses.text` and their
 * compact conditionals; `display` and `title` are the page-level roles
 * for consumers composing their own screens.
 */
const typeScale = {
  /** Page titles. */
  display: { default: 28, compact: 24 },
  /** Section headings, dialog titles. */
  title: { default: 16, compact: 15 },
  /** Card titles, chat bubbles, emphasized rows. */
  subtitle: { default: 14, compact: 13 },
  /** Control labels and body copy — `SizeClasses.text`. */
  body: { default: 13, compact: 12 },
  /** Secondary text: descriptions, meta rows, errors, eyebrows and group
   *  labels (the former overline role — an uppercase or muted caption). */
  caption: { default: 12, compact: 11 },
} as const satisfies Record<string, TypeScaleStep>

type TypeScaleRole = keyof typeof typeScale

export type { SizeClasses, SizeVariant, TypeScaleRole, TypeScaleStep }
export { sizeMap, typeScale }
