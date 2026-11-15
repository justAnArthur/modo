// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { Popover } from '@base-ui/react/popover'
import { forwardRef, useCallback, useMemo, useRef } from 'react'
import { useFieldBox } from '../../../lib/field-classes'
import { useIcon } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { OverlayContext, PortalContainer, positionerProps, useOverlay, useOverlayRoot } from '../../../lib/overlay'
import { PopupSurface } from '../../../lib/popup-surface'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import { type ParsedColor, parseColor, rgbToHexStr } from './color-math'
import { PanelSurfaceContext } from './context'
import { ColorPicker, type ColorPickerPopoverProps, type ColorPickerProps } from './index'
import { ColorTile } from './swatches'

/** ColorPicker.Popover: the panel behind a trigger showing the color, on a bordered field box. */
export const ColorPickerPopover = forwardRef<HTMLDivElement, ColorPickerPopoverProps>(
  (
    {
      triggerLabel,
      triggerLabelPosition = 'left',
      triggerShowValue = true,
      triggerShowRemove = false,
      onTriggerRemove,
      triggerClassName,
      open,
      defaultOpen,
      onOpenChange,
      size,
      from,
      effect,
      hideSource,
      tier,
      value: valueProp,
      defaultValue = '#6B97FF',
      onValueChange,
      name,
      ...pickerProps
    },
    ref,
  ) => {
    const root = useOverlayRoot({ open, defaultOpen, onOpenChange })
    const [value, setValue] = useControllableState(valueProp, defaultValue)
    const handleValueChange = useCallback(
      (next: string, parsed: ParsedColor) => {
        setValue(next)
        onValueChange?.(next, parsed)
      },
      [setValue, onValueChange],
    )

    // The trigger's own hooks run outside the SizeScope it renders, so it reads `size` directly.
    const box = useFieldBox({ variant: 'bordered', size })
    const sizeClasses = box.size
    const compact = sizeClasses.variant === 'compact'
    const frameRef = useRef<HTMLDivElement>(null)
    const XIcon = useIcon('x')

    const parsed = useMemo(() => parseColor(value), [value])
    const swatchColor = parsed ? rgbToHexStr(parsed.r, parsed.g, parsed.b, parsed.a) : value
    const valueLabel = parsed ? rgbToHexStr(parsed.r, parsed.g, parsed.b, 1).replace(/^#/, '').toUpperCase() : value
    const label = <span className={cn('text-muted-foreground px-1 select-none', sizeClasses.text)}>{triggerLabel}</span>

    return (
      <SizeScope size={size}>
        <OverlayContext.Provider value={root.state}>
          {/* Non-modal: the page keeps scrolling and the panel follows its trigger. */}
          <Popover.Root open={root.open} onOpenChange={root.onOpenChange} modal={false}>
            {/* The frame holds the trigger and the remove button side by side: no control nests in another. */}
            <div
              ref={mergeRefs(frameRef, ref)}
              {...box.props}
              className={cn(
                box.props.className,
                // A button field has no caret: keyboard focus rings it.
                'inline-flex items-center cursor-pointer [&:has(:focus-visible)]:!ring-focus-ring',
                sizeClasses.control,
                triggerClassName,
              )}
            >
              <Popover.Trigger
                className={cn(
                  'flex items-center self-stretch bg-transparent outline-none cursor-pointer weight-medium',
                  sizeClasses.gap,
                )}
              >
                {triggerLabel && triggerLabelPosition === 'left' && label}
                <ColorTile color={swatchColor} size={compact ? 16 : 20} />
                {triggerShowValue && (
                  <span className={cn('text-foreground tabular-nums', sizeClasses.text)}>{valueLabel}</span>
                )}
                {triggerLabel && triggerLabelPosition === 'right' && label}
              </Popover.Trigger>
              {triggerShowRemove && (
                <button
                  type="button"
                  aria-label="Remove color"
                  onClick={onTriggerRemove}
                  className="ml-1 flex items-center bg-transparent text-muted-foreground hover:text-foreground outline-none cursor-pointer"
                >
                  <XIcon size={14} strokeWidth={1.5} />
                </button>
              )}
              {/* Here, not in the panel: the panel unmounts while closed. */}
              {name && <input type="hidden" name={name} value={value} />}
            </div>
            <ColorPickerPanel
              anchor={frameRef}
              morphProps={{ from, effect, hideSource, tier }}
              pickerProps={{ ...pickerProps, value, onValueChange: handleValueChange }}
            />
          </Popover.Root>
        </OverlayContext.Provider>
      </SizeScope>
    )
  },
)

ColorPickerPopover.displayName = 'ColorPickerPopover'

function ColorPickerPanel({
  anchor,
  morphProps,
  pickerProps,
}: {
  anchor: React.RefObject<HTMLDivElement | null>
  morphProps: Pick<ColorPickerPopoverProps, 'from' | 'effect' | 'hideSource' | 'tier'>
  pickerProps: ColorPickerProps
}) {
  const { open, origin } = useOverlay('ColorPicker.Popover')
  const morph = useMorph(open, origin, morphProps)

  return (
    <Popover.Portal>
      <Popover.Positioner
        anchor={anchor}
        {...positionerProps(morphProps, { side: 'bottom', align: 'start', sideOffset: 6 })}
      >
        <Popover.Popup ref={morph.popupRef} className="relative outline-none">
          {/* The format menu portals inside the panel, so it stays in the popover's focus scope. */}
          <PortalContainer value={morph.popup}>
            <PopupSurface morph={morph}>
              <PanelSurfaceContext.Provider value={false}>
                <ColorPicker {...pickerProps} />
              </PanelSurfaceContext.Provider>
            </PopupSurface>
          </PortalContainer>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}
