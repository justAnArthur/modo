/*
 * Local addition (not part of Fluid Functionalism): the field and panel every
 * date and time picker shares. Not an item (a file in a group folder): the
 * pickers import it.
 *
 * The field is a text field on the shared field box (`useFieldBox` in
 * `lib/field-classes.ts`, `bordered` unless the picker's `variant` says
 * otherwise) showing the formatted value. Pressed, it opens its panel through Base UI's
 * Popover and the morph layer, with Combobox's options: goo out of the field
 * by default, or in place over it (`effect="morph"` with `hideSource`), the
 * panel's header landing where the field was. On a phone-width screen the
 * panel is the Sheet item instead, from the bottom edge.
 *
 * With an `editor` (DatePicker's `editable`) the field is a box around that
 * text control instead of a button, and only its leading icon, an
 * `InputAction`, opens the panel; the panel still anchors to and grows out
 * of the whole field. `readOnly` shows the value and never opens.
 */

import { Popover } from '@base-ui/react/popover'
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from 'react'
import { type FieldVariant, fieldIconClasses, useFieldBox } from '../../../lib/field-classes'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { MorphSurface } from '../../../lib/morph-layers'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useIsMobile } from '../../../lib/use-is-mobile'
import {
  inPlaceOffset,
  type MorphEffect,
  type MorphFrom,
  type MorphTier,
  opensInPlace,
  useMorph,
  useMorphOrigin,
} from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import Button from '../../button'
import Sheet from '../../overlays/sheet'
import Input, { InputAction, InputAdornment, type InputProps } from '../input'

interface PickerShellProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  size?: SizeVariant
  variant?: FieldVariant
  invalid?: boolean
  disabled?: boolean
  /** The field's leading icon. */
  icon: IconName
  /** The formatted value; empty shows the placeholder. */
  display: ReactNode
  placeholder?: string
  /** The panel header's inputs; the shell adds the close button after them. */
  header: ReactNode
  /** What the panel focuses when it opens on a desktop (its header input). */
  initialFocus?: RefObject<HTMLElement | null>
  /** Accessible name of the close button. */
  closeLabel?: string
  id?: string
  dir?: string
  /** Classes for the field. */
  className?: string
  /** Classes for the panel on a desktop: its width. */
  popupClassName?: string
  /** The desktop panel's morph (see Morph); a phone's sheet grows from its edge. */
  from?: MorphFrom
  effect?: MorphEffect
  hideSource?: boolean
  tier?: MorphTier
  /** The field's own text control (an editable picker): the field becomes a box around it, and its icon a button that opens the panel. */
  editor?: ReactNode
  /** Accessible name of that icon button. Defaults to `"Open calendar"`. */
  triggerLabel?: string
  /** Shows the value and never opens. */
  readOnly?: boolean
  /** The panel body under the header. */
  children: ReactNode
}

/** The field and its panel: a popover out of the field (or in place of it), or a bottom sheet on a phone. */
function PickerShell({ open: openProp, defaultOpen = false, onOpenChange, size, ...props }: PickerShellProps) {
  const [open, setOpenState] = useControllableState(openProp, defaultOpen, onOpenChange)
  const setOpen = (next: boolean) => {
    if (next && props.readOnly) return
    setOpenState(next)
  }
  const mobile = useIsMobile(640)
  const shell = mobile ? (
    <PickerSheet open={open} setOpen={setOpen} {...props} />
  ) : (
    <PickerPopover open={open} setOpen={setOpen} {...props} />
  )
  // A size pins the field and the portalled panel (context crosses portals).
  return size ? <SizeProvider size={size}>{shell}</SizeProvider> : shell
}

type PanelProps = Omit<PickerShellProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'size'> & {
  open: boolean
  setOpen: (open: boolean) => void
}

type PickerFieldProps = Pick<
  PanelProps,
  'icon' | 'display' | 'placeholder' | 'variant' | 'invalid' | 'disabled' | 'readOnly' | 'id' | 'className'
> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

// Forwards its ref: Base UI anchors the panel to the field through it.
const PickerField = forwardRef<HTMLButtonElement, PickerFieldProps>(
  ({ icon, display, placeholder, variant = 'bordered', invalid, disabled, readOnly, id, className, ...props }, ref) => {
    const Icon = useIcon(icon)
    const { size: sizeClasses, props: boxProps } = useFieldBox({ variant, invalid, disabled, readOnly })

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...boxProps}
        // Base UI's trigger props (open state, handlers, aria) arrive here.
        {...props}
        className={cn(
          boxProps.className,
          'flex w-full min-w-0 items-center text-left cursor-pointer outline-none focus-visible:ring-focus-ring',
          sizeClasses.gap,
          sizeClasses.control,
          className,
        )}
      >
        <Icon size={sizeClasses.icon} strokeWidth={1.5} className={fieldIconClasses} />
        <span
          className={cn('flex-1 truncate', sizeClasses.text, display ? 'text-foreground' : 'text-muted-foreground')}
        >
          {display || placeholder}
        </span>
      </button>
    )
  },
)
PickerField.displayName = 'PickerField'

type EditableFieldProps = Pick<
  PanelProps,
  'icon' | 'variant' | 'invalid' | 'disabled' | 'readOnly' | 'className' | 'editor' | 'triggerLabel'
> & {
  /** Wraps the icon button in the panel's trigger. */
  trigger: (button: ReactNode) => ReactNode
}

/** An editable picker's field: its text control, led by the icon button that opens the panel. */
const EditableField = forwardRef<HTMLDivElement, EditableFieldProps>(
  (
    {
      icon,
      variant = 'bordered',
      invalid,
      disabled,
      readOnly,
      className,
      editor,
      triggerLabel = 'Open calendar',
      trigger,
    },
    ref,
  ) => {
    const Icon = useIcon(icon)
    const { size: sizeClasses, props: boxProps } = useFieldBox({ variant, invalid, disabled, readOnly })
    return (
      <div
        ref={ref}
        {...boxProps}
        className={cn(
          boxProps.className,
          'flex w-full min-w-0 items-center',
          sizeClasses.gap,
          sizeClasses.control,
          className,
        )}
      >
        <InputAdornment>
          {trigger(<InputAction label={triggerLabel} icon={Icon} disabled={disabled || readOnly} />)}
        </InputAdornment>
        {editor}
      </div>
    )
  },
)
EditableField.displayName = 'EditableField'

function PanelHeader({
  header,
  closeLabel = 'Close',
  close,
}: {
  header: ReactNode
  closeLabel?: string
  close: () => void
}) {
  const X = useIcon('x')
  const sizeClasses = useSize()
  return (
    <div className="flex items-center gap-1 border-b border-border pb-1">
      <div className="flex min-w-0 flex-1 items-center">{header}</div>
      <Button variant="ghost" size="icon-sm" aria-label={closeLabel} onClick={close}>
        <X size={sizeClasses.icon} strokeWidth={1.5} />
      </Button>
    </div>
  )
}

function PickerPopover({
  open,
  setOpen,
  header,
  initialFocus,
  closeLabel,
  dir,
  popupClassName,
  from,
  effect,
  hideSource,
  tier = 'moderate',
  children,
  editor,
  triggerLabel,
  ...field
}: PanelProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const { origin, capture } = useMorphOrigin()
  const morph = useMorph(open, origin, { from, effect, hideSource, tier })
  const shape = useShape()
  const level = Math.min(useSurface() + 2, 8)

  const handleOpenChange = useCallback(
    (next: boolean, details: { reason?: string; trigger?: Element; event?: Event }) => {
      // Pressing or focusing the editable field's own text is no reason to
      // close: the panel belongs to that field.
      if (!next && editor && (details.reason === 'outside-press' || details.reason === 'focus-out')) {
        const event = details.event as (Event & { relatedTarget?: EventTarget | null }) | undefined
        const target = (event?.relatedTarget ?? event?.target) as Node | null | undefined
        if (target && fieldRef.current?.contains(target)) return
      }
      // An editable field's panel grows out of the whole field, not its icon.
      if (next) capture(editor ? { event: details.event, trigger: fieldRef.current ?? undefined } : details)
      setOpen(next)
    },
    [capture, setOpen, editor],
  )

  return (
    // Non-modal: the page keeps scrolling and the panel follows its field.
    <Popover.Root open={open} onOpenChange={handleOpenChange} modal={false}>
      {editor ? (
        <EditableField
          ref={fieldRef}
          {...field}
          editor={editor}
          triggerLabel={triggerLabel}
          trigger={button => <Popover.Trigger disabled={field.disabled} render={button as ReactElement} />}
        />
      ) : (
        <Popover.Trigger disabled={field.disabled} render={<PickerField {...field} />} />
      )}
      <Popover.Portal>
        <Popover.Positioner
          anchor={editor ? fieldRef : undefined}
          side="bottom"
          align="start"
          sideOffset={opensInPlace({ effect, hideSource }) ? inPlaceOffset : 6}
          className="z-50 outline-none"
        >
          <Popover.Popup ref={morph.popupRef} initialFocus={initialFocus} className="relative outline-none">
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shape.container}
                className={cn('flex max-w-[calc(100vw-1rem)] flex-col gap-1 p-1', popupClassName)}
              >
                <div dir={dir} className="flex min-h-0 flex-col gap-1">
                  <PanelHeader header={header} closeLabel={closeLabel} close={() => setOpen(false)} />
                  {children}
                </div>
              </MorphSurface>
            </SurfaceProvider>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function PickerSheet({ open, setOpen, header, closeLabel, dir, children, editor, triggerLabel, ...field }: PanelProps) {
  const {
    initialFocus: _focus,
    popupClassName: _width,
    from: _from,
    effect: _effect,
    hideSource: _hide,
    tier: _tier,
    ...fieldProps
  } = field
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {editor ? (
        <EditableField
          {...fieldProps}
          editor={editor}
          triggerLabel={triggerLabel}
          trigger={button => <Sheet.Trigger disabled={field.disabled} render={button as ReactElement} />}
        />
      ) : (
        <Sheet.Trigger disabled={field.disabled} render={<PickerField {...fieldProps} />} />
      )}
      <Sheet.Content className="gap-2 p-3 pt-3">
        <div dir={dir} className="flex min-h-0 flex-col gap-2">
          <PanelHeader header={header} closeLabel={closeLabel} close={() => setOpen(false)} />
          {children}
        </div>
      </Sheet.Content>
    </Sheet>
  )
}

interface PickerInputProps extends Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> {
  /** The value as the field shows it, while nothing is being typed. */
  formatted: string
  /** Reads typed text and commits it; returns whether it could. */
  onText: (text: string) => boolean
  /** Enter, after a valid entry: the pickers close. */
  onEnter?: () => void
}

/**
 * A header input: shows the formatted value, selects it all on focus, and
 * commits what is typed as soon as it reads as a value (marking it invalid
 * until then). Leaving it restores the formatted value. Hover and focus fill
 * it without the field ring.
 */
const PickerInput = forwardRef<HTMLInputElement, PickerInputProps>(
  ({ formatted, onText, onEnter, onFocus, onBlur, onKeyDown, className, ...props }, ref) => {
    const [draft, setDraft] = useState<string | null>(null)
    const [invalid, setInvalid] = useState(false)
    return (
      <Input
        ref={ref}
        {...props}
        // The header is already framed by the panel: hover and focus change
        // the fill only (an invalid entry keeps its destructive ring).
        className={cn('hover:ring-transparent focus-within:ring-transparent data-[active]:ring-transparent', className)}
        value={draft ?? formatted}
        invalid={invalid}
        onChange={text => {
          setDraft(text)
          setInvalid(!onText(text))
        }}
        onFocus={e => {
          e.currentTarget.select()
          onFocus?.(e)
        }}
        onBlur={e => {
          setDraft(null)
          setInvalid(false)
          onBlur?.(e)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !invalid) onEnter?.()
          onKeyDown?.(e)
        }}
      />
    )
  },
)
PickerInput.displayName = 'PickerInput'

export type { PickerShellProps }
export { PickerInput, PickerShell }
