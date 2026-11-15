/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/card.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef, type ReactNode, useContext } from 'react'
import { type IconComponent, type IconComponentProps, useIcon } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import Button, { type ButtonProps } from '../button'
import { CardContext } from './card-group'

type CardLogo = string | [string, string]

interface CardMediaProps {
  /** A logo image URL, or a `[logoA, logoB]` pair drawn as a connected pair. Wins over `icon`. */
  logo?: CardLogo
  /** Alt text for the logo images. Defaults to `""` (decorative). */
  logoAlt?: string
  /** An icon, drawn in a tinted 32px tile. */
  icon?: IconComponent
  /** Logo edge in px. Defaults to `22`. */
  size?: number
  /** Classes for the media box. */
  className?: string
}

/** A leading icon tile or brand logo(s). Not in shadcn's anatomy, but most product cards need one. */
function CardMedia({ logo, logoAlt, icon: Icon, size = 22, className }: CardMediaProps) {
  const { orientation } = useContext(CardContext)
  const shape = useShape()
  const compact = useSize().variant === 'compact'
  // Stacked, mb-2 plus the header's gap-1 makes 12px under the media; inline, the card owns the inset.
  const wrap = cn(orientation === 'inline' ? '' : 'mb-2', className)

  if (logo) {
    const logos = Array.isArray(logo) ? logo : [logo]
    return (
      <span data-slot="card-media" className={cn('inline-flex items-center gap-1.5 shrink-0', wrap)}>
        {logos.map((src, i) => (
          <span key={src} className="inline-flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="w-2 h-px bg-border" />}
            <img
              src={src}
              alt={logoAlt ?? ''}
              width={size}
              height={size}
              className={cn('object-contain', shape.bg)}
              style={{ width: size, height: size }}
            />
          </span>
        ))}
      </span>
    )
  }
  if (Icon) {
    // An overlay tint, not a surface, so it blends over the substrate or the hover highlight.
    return (
      <span
        data-slot="card-media"
        className={cn('inline-flex items-center justify-center shrink-0 size-8 bg-hover', shape.bg, wrap)}
      >
        <Icon size={compact ? 16 : 18} strokeWidth={1.5} className="text-muted-foreground" />
      </span>
    )
  }
  return null
}

interface CardImageProps {
  /** The image URL. */
  src: string
  /** Alt text. Defaults to `""` (decorative). */
  alt?: string
  /** Classes for the image. */
  className?: string
}

/** The prominent image: a 16:9 banner when stacked, a full-height leading image when inline. */
function CardImage({ src, alt, className }: CardImageProps) {
  const { orientation } = useContext(CardContext)
  return (
    <img
      src={src}
      alt={alt ?? ''}
      data-slot="card-image"
      className={cn(
        'object-cover rounded-xs',
        orientation === 'inline' ? 'size-40 shrink-0' : 'w-full aspect-[16/9]',
        className,
      )}
    />
  )
}

// The Card finds its image child by this name too, which survives the module
// duplication HMR can cause (where `type ===` fails).
CardImage.displayName = 'CardImage'

interface CardFeatureProps {
  /** A leading icon. */
  icon?: IconComponent
  /** The feature's name. */
  title: string
  /** One line under the title. */
  description?: string
}

/** An icon + title + description row, for feature lists inside Card.Content. */
function CardFeature({ icon: Icon, title, description }: CardFeatureProps) {
  const sizeClasses = useSize()
  const compact = sizeClasses.variant === 'compact'
  return (
    <div data-slot="card-feature" className={cn('flex items-start', sizeClasses.gap)}>
      {Icon && <Icon size={sizeClasses.icon} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-foreground" />}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={cn('text-foreground text-trim weight-medium', sizeClasses.text)}>{title}</span>
        {description && (
          <span
            className={cn('leading-relaxed text-muted-foreground', compact ? 'text-caption-compact' : 'text-caption')}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  )
}

function ExternalGlyph({ className, ...props }: IconComponentProps) {
  const ArrowRight = useIcon('arrow-right')
  return <ArrowRight {...props} className={cn('-rotate-45', className)} />
}

interface CardButtonProps
  extends Omit<ButtonProps, 'size' | 'leadingIcon' | 'trailingIcon' | 'render' | 'asChild' | 'children'> {
  /** The label. */
  children: ReactNode
  /** Renders a link to this URL instead of a button. */
  href?: string
  /** Visual style, Button's. Defaults to `"ghost"`. */
  variant?: ButtonProps['variant']
  /** An icon beside the label. */
  icon?: IconComponent
  /** Which side of the label the icon sits on. With `external` the arrow takes the end, so the icon leads. Defaults to `"start"`. */
  iconPosition?: 'start' | 'end'
  /** Opens `href` in a new tab and ends the label with an outward arrow. Defaults to `false`. */
  external?: boolean
}

/**
 * A compact Button for the footer, raised above the stretched overlay. A
 * disabled link renders as a disabled button, since an anchor can't be disabled.
 */
const CardButton = forwardRef<HTMLButtonElement, CardButtonProps>(
  (
    {
      children,
      href,
      variant = 'ghost',
      icon,
      iconPosition = 'start',
      external = false,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const position = external ? 'start' : iconPosition
    const link = href && !disabled
    return (
      <Button
        ref={ref}
        size="compact"
        variant={variant}
        disabled={disabled}
        leadingIcon={position === 'start' ? icon : undefined}
        trailingIcon={external ? ExternalGlyph : position === 'end' ? icon : undefined}
        render={
          link ? (
            // biome-ignore lint/a11y/useAnchorContent: Button renders the label into it.
            <a
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            />
          ) : undefined
        }
        className={cn('z-30', className)}
        {...props}
      >
        {children}
      </Button>
    )
  },
)

CardButton.displayName = 'CardButton'

export type { CardButtonProps, CardFeatureProps, CardImageProps, CardLogo, CardMediaProps }
export { CardButton, CardFeature, CardImage, CardMedia }
