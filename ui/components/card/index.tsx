/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/card.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  Children,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { useIcon } from '../../lib/icon-context'
import { mergeRefs } from '../../lib/merge-refs'
import { useRowPosition } from '../../lib/row-index'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { useRegisterFluidHoverItem } from '../../lib/use-fluid-hover'
import { useIsoLayoutEffect } from '../../lib/use-iso-layout-effect'
import { cn } from '../../lib/utils'
import { SizeScope } from '../../primitives/sizes'
import { CardContext, type CardContextValue, CardGroup, CardGroupContext } from './card-group'
import { CardButton, CardFeature, CardImage, CardMedia } from './card-media'
import { CardAction, CardContent, CardDescription, CardEyebrow, CardFooter, CardHeader, CardTitle } from './card-parts'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Compositional parts: Card.Image, Card.Media, Card.Header, Card.Content, Card.Footer. */
  children?: ReactNode
  /** Makes the whole card a clickable target (stretched button); fluid hover previews it. */
  onClick?: () => void
  /** Makes the whole card a link (stretched anchor). */
  href?: string
  /** Opens href in a new tab. Defaults to `false`. */
  external?: boolean
  /** Accessible name for the stretched link or button when the whole card is clickable (the visible title isn't wired up automatically). */
  label?: string
  /** In a Card.Group: the value the group selects when this card is clicked, which makes the card clickable. */
  value?: string
  /** Persistent selected fill + title emphasis, on top of fluid hover; overrides the group's `value`. The group drops the hairlines around a selected card. Defaults to the group's selection, else `false`. */
  selected?: boolean
  /** Dims and disables the card. Defaults to `false`. */
  disabled?: boolean
  /** Shows a dismiss (✕) button, revealed on hover or focus by default. Defaults to `false`. */
  dismissible?: boolean
  /** Keeps the dismiss control hidden until the card is hovered or holds focus. Pass false for an always-visible ✕. Defaults to `true`. */
  dismissOnHover?: boolean
  /** Called when the dismiss button is pressed. */
  onDismiss?: () => void
  /** Pins the card to one step of the size ladder — compact tightens type and padding. Omitted, it follows the surrounding SizeProvider. */
  size?: SizeVariant
  /** Position in its Card.Group. Defaults to the card's place among the group's children. */
  index?: number
}

type CardComponent = ForwardRefExoticComponent<CardProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof CardGroup
  Header: typeof CardHeader
  Title: typeof CardTitle
  Description: typeof CardDescription
  Action: typeof CardAction
  Content: typeof CardContent
  Footer: typeof CardFooter
  Media: typeof CardMedia
  Image: typeof CardImage
  Eyebrow: typeof CardEyebrow
  Feature: typeof CardFeature
  Button: typeof CardButton
}

const isCardImage = (child: ReactNode) =>
  isValidElement(child) &&
  (child.type === CardImage || (child.type as { displayName?: string }).displayName === 'CardImage')

/**
 * shadcn's compositional card, dressed in Fluid Functionalism. Stacked,
 * inline, or grid — borderless by default with fluid hover that previews
 * where a click will land.
 *
 * The same parts and data-slot contract as shadcn's Card, on a transparent,
 * borderless surface: a card inherits its parent's substrate and leans on
 * hairline dividers rather than a drawn frame. Card.Group owns the layout (a
 * stacked list, inline rows or a grid) and numbers its cards for the fluid
 * hover; only a clickable card (`onClick`, `href` or a `value`) joins the
 * magnetic highlight. A clickable card is one stretched button or link, while
 * footer actions and Card.Action stay independently clickable above it.
 * Selection works both ways: the group's `value` / `defaultValue` /
 * `onValueChange` against each card's `value`, or `selected` per card.
 *
 * Statics:
 * - `Card.Group` — the layout and the hover: `orientation`, `columns`, `border`, `separated`, `fluidHover`, `value`.
 * - `Card.Header` — the title and description grid; pins Card.Action top-right.
 * - `Card.Title` — weight-animates while the card is selected.
 * - `Card.Description`, `Card.Action`, `Card.Content`, `Card.Footer` (the actions row).
 * - `Card.Media` — an icon tile, a logo or a `[logoA, logoB]` pair.
 * - `Card.Image` — a full-bleed banner, or a leading image when inline.
 * - `Card.Eyebrow` — a small muted label above the title.
 * - `Card.Feature` — an icon + title + description row.
 * - `Card.Button` — a compact Button for the footer; a link when given `href`.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/default/card.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      onClick,
      href,
      external,
      label,
      value,
      selected: selectedProp,
      disabled = false,
      dismissible = false,
      dismissOnHover = true,
      onDismiss,
      size,
      index: indexProp,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const shape = useShape()
    const compact = useSize(size).variant === 'compact'
    const group = useContext(CardGroupContext)
    const XIcon = useIcon('x')
    const position = useRowPosition()
    const index = indexProp ?? position

    const orientation = group?.orientation ?? 'card'
    const columns = group?.columns ?? 1
    const count = group?.count ?? 1
    const separated = group?.separated ?? true
    const divided = group?.divided ?? false
    const outlined = group?.outlined ?? false
    const activeIndex = group?.activeIndex ?? null
    const selectable = group !== null && value !== undefined
    const selected = selectedProp ?? (selectable && group.value === value)
    const clickable = !!href || !!onClick || selectable
    const press = selectable
      ? () => {
          group.select(value)
          onClick?.()
        }
      : onClick

    // A highlight on a card with nothing to click would promise a click that
    // has nowhere to land. The stable callback, not the context, so a hover
    // frame doesn't re-register every card.
    useRegisterFluidHoverItem(clickable ? group?.registerItem : undefined, index, internalRef)

    const markSelected = group?.markSelected
    useIsoLayoutEffect(() => {
      if (!markSelected || index === undefined || !selected) return
      markSelected(index, true)
      return () => markSelected(index, false)
    }, [markSelected, index, selected])

    // A hairline toward the neighbour below and to the right, dropped beside
    // the active or a selected card so the fill reads clean.
    const self = index ?? -1
    const col = self % columns
    const hasBelow = index !== undefined && index + columns < count
    const hasRight = index !== undefined && col < columns - 1 && index + 1 < count
    const lit = (i: number) => i === activeIndex || !!group?.selectedRows.has(i)
    const showBottom = divided && hasBelow && !(lit(self) || lit(self + columns))
    const showRight = divided && hasRight && !(lit(self) || lit(self + 1))

    const isInline = orientation === 'inline'
    const hasImage = Children.toArray(children).some(isCardImage)
    const inlineImage = isInline && hasImage

    // Standalone, a card is its own tile. In a group, a separated tile clips
    // only when it draws a frame (a borderless one has no surface to hug);
    // a card in a continuous block leans on the group's frame.
    const tileShape = !group
      ? cn(shape.container, 'overflow-hidden')
      : separated && outlined
        ? cn(shape.container, 'overflow-hidden border border-border/60')
        : ''

    // The stretched overlay makes the whole card the target while actions
    // (higher z) stay clickable: the accessible alternative to nesting controls
    // in a button. A disabled card drops it, so it can't be tabbed to
    // (pointer-events-none only blocks the mouse).
    const overlayClass =
      'absolute inset-0 z-20 outline-none focus-visible:ring-1 focus-visible:ring-focus-ring rounded-[inherit]'
    const overlay =
      clickable && !disabled ? (
        href ? (
          // biome-ignore lint/a11y/useAnchorContent: named by `label`; the card's content sits beside the stretched link.
          <a
            href={href}
            onClick={press}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            aria-label={label}
            aria-current={selected || undefined}
            className={overlayClass}
          />
        ) : (
          <button
            type="button"
            onClick={press}
            aria-label={label}
            aria-pressed={selected || undefined}
            className={overlayClass}
          />
        )
      ) : null

    const cardContext = useMemo<CardContextValue>(
      () => ({ emphasized: selected, orientation, clickable, hasImage }),
      [selected, orientation, clickable, hasImage],
    )

    // Inline image cards stack their other parts in a centred column beside the image.
    let body: ReactNode = children
    if (inlineImage) {
      const parts = Children.toArray(children)
      const image = parts.find(isCardImage)
      body = (
        <>
          {image}
          <div
            className={cn('flex min-w-0 flex-1 flex-col justify-center gap-2', compact ? 'py-2.5 pr-3' : 'py-3.5 pr-4')}
          >
            {parts.filter(part => part !== image)}
          </div>
        </>
      )
    }

    return (
      <SizeScope size={size}>
        <CardContext.Provider value={cardContext}>
          <div
            ref={mergeRefs(internalRef, ref)}
            data-slot="card"
            data-fluid-hover-index={index}
            data-selected={selected || undefined}
            data-orientation={orientation}
            aria-disabled={disabled || undefined}
            className={cn(
              'group/card relative z-10 min-w-0 min-h-[60px]',
              inlineImage
                ? cn('flex flex-row items-center', compact ? 'gap-2.5' : 'gap-3')
                : isInline
                  ? cn('flex flex-row items-center', compact ? 'gap-2.5 pl-3' : 'gap-3 pl-4')
                  : cn('flex flex-col', compact ? 'pb-3' : 'pb-4'),
              // Without a group's highlight, a clickable card tints itself.
              !group && clickable && !disabled && 'transition-colors duration-fast hover:bg-hover',
              // An inline row's dismiss would sit on the title's tail: the
              // header yields the room while the control shows.
              dismissible &&
                isInline &&
                (dismissOnHover
                  ? '[&:hover_[data-slot=card-header]]:pr-10 [&:focus-within_[data-slot=card-header]]:pr-10'
                  : '[&_[data-slot=card-header]]:pr-10'),
              tileShape,
              disabled && 'opacity-50 pointer-events-none',
              className,
            )}
            {...props}
          >
            {/* Fill and dividers sit behind the content (-z-10), the overlay above it (z-20), actions above that (z-30). */}
            {selected && (
              <span
                aria-hidden
                className={cn('absolute inset-0 -z-10 bg-active pointer-events-none', shape.container)}
              />
            )}
            {showBottom && (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-border/60 pointer-events-none -z-10" />
            )}
            {/* Stops 1px short of a bottom hairline, which owns the crossing pixel: two 60% lines would stack brighter. */}
            {showRight && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-0 right-0 w-px bg-border/60 pointer-events-none -z-10',
                  showBottom ? 'bottom-px' : 'bottom-0',
                )}
              />
            )}

            {overlay}
            {body}

            {dismissible && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss"
                className={cn(
                  'absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer outline-none transition-colors duration-fast focus-visible:ring-1 focus-visible:ring-focus-ring',
                  // Over media the icon needs its own ground.
                  hasImage ? 'bg-card/70 backdrop-blur-sm hover:bg-card' : 'hover:bg-hover',
                  // An invisible control must not swallow taps meant for the card
                  // (touch has no hover to reveal it); pointer-events never blocks tabbing.
                  dismissOnHover &&
                    'pointer-events-none opacity-0 transition-opacity duration-fast group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                  shape.button,
                )}
              >
                <XIcon size={compact ? 13 : 15} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </CardContext.Provider>
      </SizeScope>
    )
  },
) as CardComponent

Card.displayName = 'Card'

Object.assign(Card, {
  Group: CardGroup,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Action: CardAction,
  Content: CardContent,
  Footer: CardFooter,
  Media: CardMedia,
  Image: CardImage,
  Eyebrow: CardEyebrow,
  Feature: CardFeature,
  Button: CardButton,
})

export type { CardBorder, CardGroupProps, CardOrientation } from './card-group'
export type { CardButtonProps, CardFeatureProps, CardImageProps, CardLogo, CardMediaProps } from './card-media'
export type { CardProps }
export {
  Card,
  CardAction,
  CardButton,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardFeature,
  CardFooter,
  CardGroup,
  CardHeader,
  CardImage,
  CardMedia,
  CardTitle,
}
export default Card
