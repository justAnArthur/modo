// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { Menu } from '@base-ui/react/menu'
import { AnimatePresence, motion } from 'motion/react'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { useIcon } from '../../../lib/icon-context'
import { OverlayContext, useOverlay, useOverlayRoot, usePortalContainer } from '../../../lib/overlay'
import { POPUP_SHAPE } from '../../../lib/popup'
import { PopupSurface } from '../../../lib/popup-surface'
import { useRowFocus } from '../../../lib/row-group'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import type { ColorFormat } from './variants'

const FORMAT_LABELS: Record<ColorFormat, string> = {
  hex: 'HEX',
  rgb: 'RGB',
  hsl: 'HSL',
  oklch: 'OKLCH',
}

const FORMATS = ['hex', 'rgb', 'hsl', 'oklch'] as const

interface FormatMenuContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
}

const FormatMenuContext = createContext<FormatMenuContextValue | null>(null)

function FormatItem({
  index,
  value,
  label,
  checked,
}: {
  index: number
  value: ColorFormat
  label: string
  checked: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const menuCtx = useContext(FormatMenuContext)
  const shape = useShape()
  const sizeClasses = useSize()
  const compact = sizeClasses.variant === 'compact'

  useRegisterFluidHoverItem(menuCtx?.registerItem, index, ref)

  const isActive = menuCtx?.activeIndex === index

  return (
    <Menu.RadioItem
      value={value}
      label={label}
      closeOnClick
      render={
        <div
          ref={ref}
          data-fluid-hover-index={index}
          className={cn(
            'relative z-10 flex items-center cursor-pointer outline-none',
            compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
            sizeClasses.text,
            shape.item,
          )}
        />
      }
    >
      <WeightLabel emphasized={checked} lit={isActive || checked}>
        {label}
      </WeightLabel>
    </Menu.RadioItem>
  )
}

interface FormatMenuProps {
  value: ColorFormat
  onValueChange: (format: ColorFormat) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/** The format dropdown: a Base UI Menu whose popup morphs out of its trigger. */
export function FormatMenu({ value, onValueChange, open, defaultOpen, onOpenChange }: FormatMenuProps) {
  const root = useOverlayRoot({ open, defaultOpen, onOpenChange })
  const shape = useShape()
  const sizeClasses = useSize()
  const ChevronDownIcon = useIcon('chevron-down')

  return (
    <OverlayContext.Provider value={root.state}>
      {/* Non-modal: the page keeps scrolling and the popup follows its trigger. */}
      <Menu.Root open={root.open} onOpenChange={root.onOpenChange} modal={false}>
        <Menu.Trigger
          className={cn(
            'flex items-center justify-between bg-transparent hover:bg-hover hover:text-foreground transition-colors duration-fast outline-none focus-visible:ring-1 focus-visible:ring-focus-ring cursor-pointer',
            sizeClasses.gap,
            sizeClasses.control,
            sizeClasses.px,
            sizeClasses.text,
            root.open ? 'bg-active text-foreground' : 'text-muted-foreground active:bg-active',
            shape.input,
            'weight-medium',
          )}
        >
          <span>{FORMAT_LABELS[value]}</span>
          <ChevronDownIcon
            size={14}
            strokeWidth={1.5}
            className={cn('text-muted-foreground transition-transform duration-150', root.open && 'rotate-180')}
          />
        </Menu.Trigger>
        <FormatPopup value={value} onValueChange={onValueChange} />
      </Menu.Root>
    </OverlayContext.Provider>
  )
}

function FormatPopup({ value, onValueChange }: Pick<FormatMenuProps, 'value' | 'onValueChange'>) {
  const { open, origin } = useOverlay('FormatMenu')
  const morph = useMorph(open, origin, { tier: 'moderate' })
  const containerRef = useRef<HTMLDivElement>(null)
  const hover = useFluidHover(containerRef)
  const { activeIndex, itemRects, handlers, registerItem, remeasure } = hover
  const rowFocus = useRowFocus(hover)

  // The rows stay registered between opens, measured while hidden: remeasure once open.
  useEffect(() => {
    if (!open) return
    remeasure()
  }, [open, remeasure])

  const checkedIndex = FORMATS.indexOf(value)
  const checkedRect = checkedIndex !== -1 ? (itemRects[checkedIndex] ?? null) : null
  const menuCtx = useMemo(() => ({ registerItem, activeIndex }), [registerItem, activeIndex])

  return (
    <Menu.Portal container={usePortalContainer()}>
      <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-[60] outline-none">
        <FormatMenuContext.Provider value={menuCtx}>
          <Menu.Popup
            ref={morph.popupRef}
            onMouseEnter={() => {
              handlers.onMouseEnter()
              rowFocus.setFocusedIndex(null)
            }}
            onMouseMove={handlers.onMouseMove}
            onMouseLeave={handlers.onMouseLeave}
            onClick={handlers.onClick}
            {...rowFocus.handlers}
            className="relative select-none outline-none"
          >
            <PopupSurface morph={morph} radius={POPUP_SHAPE.container} className="min-w-[var(--anchor-width)]">
              <div ref={containerRef} className="relative flex flex-col p-1">
                <AnimatePresence>
                  {checkedRect && (
                    <motion.div
                      className={`absolute ${POPUP_SHAPE.bg} bg-active pointer-events-none`}
                      initial={false}
                      animate={{
                        top: checkedRect.top,
                        left: checkedRect.left,
                        width: checkedRect.width,
                        height: checkedRect.height,
                        opacity: 1,
                      }}
                      exit={{ opacity: 0, transition: spring.moderate.exit }}
                      transition={{
                        ...spring.moderate,
                        opacity: { duration: spring.fast.duration },
                      }}
                    />
                  )}
                </AnimatePresence>

                <FluidHoverHighlight hover={hover} from={checkedRect} className={POPUP_SHAPE.bg} />

                <FocusRing rect={rowFocus.focusRect} className={POPUP_SHAPE.focusRing} />

                {/* `contents`: the rows stay direct children of the measured container. */}
                <Menu.RadioGroup
                  value={value}
                  onValueChange={next => onValueChange(next as ColorFormat)}
                  className="contents"
                >
                  {FORMATS.map((fmt, i) => (
                    <FormatItem key={fmt} index={i} value={fmt} label={FORMAT_LABELS[fmt]} checked={value === fmt} />
                  ))}
                </Menu.RadioGroup>
              </div>
            </PopupSurface>
          </Menu.Popup>
        </FormatMenuContext.Provider>
      </Menu.Positioner>
    </Menu.Portal>
  )
}
