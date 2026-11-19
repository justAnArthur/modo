/*
 * Local addition (not part of Fluid Functionalism): buttons joined into one
 * control, and the split button, an action with a menu of its variants
 * attached on a chevron segment (Dropdown's popup).
 */

'use client'

import { createContext, forwardRef, type HTMLAttributes, type ReactNode, useContext } from 'react'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { type SizeVariant, useSizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import Dropdown, { type DropdownContentProps, type DropdownMenuProps } from '../../overlays/dropdown'
import Button, { type ButtonProps, type ButtonVariant } from '../button'

interface ButtonGroupContextValue {
  variant: ButtonVariant
  disabled?: boolean
}

const ButtonGroupContext = createContext<ButtonGroupContextValue>({ variant: 'primary' })

// Literal tables: UnoCSS only generates the classes it can read whole.
// Filled segments sit 1px apart, so the surface under them draws the hairline;
// framed ones overlap by their 1px frame, so the two frames read as one line.
const JOIN: Record<ButtonVariant, string> = {
  primary: 'gap-px',
  secondary: 'gap-px',
  destructive: 'gap-px',
  success: 'gap-px',
  ghost: 'gap-px',
  link: 'gap-px',
  tertiary: '[&>*+*]:-ml-px',
  outline: '[&>*+*]:-ml-px',
}

// The group keeps the outer corners; a focused segment's ring paints over its neighbours.
const SEGMENTS = '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:focus-visible]:z-10'

interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** The look every `ButtonGroup.Button` and `ButtonGroup.Menu` takes, and how the segments join: filled variants show a hairline of the surface between them, framed ones share one frame. Defaults to `"primary"`. */
  variant?: ButtonVariant
  /** Pins every segment, and the rows of a `ButtonGroup.Menu`, to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Disables every segment; a segment's own `disabled` wins. Defaults to `false`. */
  disabled?: boolean
  /** The segments: `ButtonGroup.Button`s and at most one `ButtonGroup.Menu`, last. */
  children: ReactNode
  /** Classes for the group. */
  className?: string
}

/** A segment: a Button in the group's variant, unless it names its own. */
const ButtonGroupButton = forwardRef<HTMLButtonElement, ButtonProps>(({ variant, disabled, ...props }, ref) => {
  const group = useContext(ButtonGroupContext)
  return <Button ref={ref} variant={variant ?? group.variant} disabled={disabled ?? group.disabled} {...props} />
})

ButtonGroupButton.displayName = 'ButtonGroupButton'

interface ButtonGroupMenuProps
  extends DropdownContentProps,
    Pick<DropdownMenuProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'disabled' | 'modal'> {
  /** The chevron segment's accessible name. Defaults to `"More options"`. */
  label?: string
  /** The segment's glyph. Defaults to the icon set's `chevron-down`. */
  icon?: IconComponent
}

/** The split button's menu: a square chevron segment that opens Dropdown's popup, aligned to the group's end. */
function ButtonGroupMenu({
  label = 'More options',
  icon,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled,
  modal,
  align = 'end',
  ...content
}: ButtonGroupMenuProps) {
  const group = useContext(ButtonGroupContext)
  const [open, setOpen] = useControllableState(openProp, defaultOpen)
  const compact = useSizeVariant() === 'compact'
  const Chevron = useIcon('chevron-down')
  const Icon = icon ?? Chevron

  return (
    <Dropdown.Menu
      open={open}
      onOpenChange={(next, details) => {
        onOpenChange?.(next, details)
        if (!details.isCanceled) setOpen(next)
      }}
      disabled={disabled ?? group.disabled}
      modal={modal}
    >
      <Dropdown.Trigger
        render={
          <Button variant={group.variant} size={compact ? 'icon-compact' : 'icon'} aria-label={label} active={open}>
            <Icon />
          </Button>
        }
      />
      <Dropdown.Content align={align} {...content} />
    </Dropdown.Menu>
  )
}

/**
 * Buttons joined into one control: one outer shape, square inner edges and
 * a hairline between the segments.
 *
 * Every segment takes the group's `variant` and `size`, so they share one
 * height and one look. Filled variants (primary, secondary, ghost, the
 * statuses) sit a hairline apart, the surface under them showing through;
 * framed ones (tertiary, outline) overlap so two frames read as one. Each
 * segment keeps the Button's press, hover and focus: a keyboard ring draws
 * over its neighbours, and a disabled segment dims alone.
 *
 * The split button is a `ButtonGroup.Button` for the main action and a
 * `ButtonGroup.Menu` after it: a chevron segment that opens Dropdown's popup
 * (see Dropdown), grown out of the chevron and aligned to the group's end,
 * the segment held pressed while it shows. Its rows follow the group's size.
 *
 * Statics:
 * - `ButtonGroup.Button` — a segment: Button's props; `variant` and
 *   `disabled` default to the group's.
 * - `ButtonGroup.Menu` — the split button's chevron and menu: `label`,
 *   `icon`, `open`, `defaultOpen`, `onOpenChange`, `disabled`, `modal`, and
 *   Dropdown.Content's props (`checkedIndex`, `align` defaulting to `"end"`,
 *   the morph options); its children are Dropdown rows.
 *
 * @example {@include ./examples.mdx}
 */
const ButtonGroup = Object.assign(
  function ButtonGroup({ variant = 'primary', size, disabled, children, className, ...props }: ButtonGroupProps) {
    return (
      <SizeScope size={size}>
        <ButtonGroupContext.Provider value={{ variant, disabled }}>
          {/* biome-ignore lint/a11y/useSemanticElements: a toolbar-style group of buttons, not a form fieldset */}
          <div
            role="group"
            className={cn('isolate inline-flex items-center', JOIN[variant], SEGMENTS, className)}
            {...props}
          >
            {children}
          </div>
        </ButtonGroupContext.Provider>
      </SizeScope>
    )
  },
  { Button: ButtonGroupButton, Menu: ButtonGroupMenu },
)

export type { ButtonGroupMenuProps, ButtonGroupProps }
export { ButtonGroup, ButtonGroupButton, ButtonGroupMenu }

export default ButtonGroup
