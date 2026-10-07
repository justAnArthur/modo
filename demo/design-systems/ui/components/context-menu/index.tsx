/*
 * Local addition (not part of Fluid Functionalism): a context menu that grows
 * out of the press point through `lib/use-morph.ts`, goo by default. Behavior
 * is Base UI's ContextMenu (right click, long press, positioning at the
 * pointer, roving highlight, typeahead, dismissal). The rows are Dropdown's:
 * `MenuItem` from `components/dropdown/menu-item.tsx`, `Dropdown.Label` and
 * `Dropdown.Separator`, with the fluid hover highlight gliding between them.
 */

import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu'
import {
  createContext,
  forwardRef,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
import { MorphSurface } from '../../lib/morph-layers'
import { isDisabledRow, popupScrollAreaClass, popupViewportClass } from '../../lib/popup'
import { shapeMap } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { useControllableState } from '../../lib/use-controllable-state'
import { useFluidHover } from '../../lib/use-fluid-hover'
import { type MorphOrigin, useMorph, useMorphOrigin } from '../../lib/use-morph'
import { cn } from '../../lib/utils'
import { ScrollArea } from '../../primitives/scroll-area'
import { SizeProvider } from '../../primitives/sizes'
import { DropdownLabel, DropdownSeparator } from '../dropdown'
import { DropdownContext, MenuItem, type MenuItemProps, type MenuItemRenderOptions } from '../dropdown/menu-item'

// The rows' radii, as in Dropdown: menus keep the "rounded" shape whatever the
// rest of the UI is shaped.
const shape = shapeMap.rounded

interface ContextMenuContextValue {
  open: boolean
  origin: RefObject<MorphOrigin>
}

const ContextMenuContext = createContext<ContextMenuContextValue>({ open: false, origin: { current: {} } })

const ShortcutContext = createContext<string | undefined>(undefined)

function RowShortcut() {
  const shortcut = useContext(ShortcutContext)
  const compact = useSize().variant === 'compact'
  if (!shortcut) return null
  return (
    <kbd
      className={cn('shrink-0 pl-4 font-sans text-muted-foreground', compact ? 'text-caption-compact' : 'text-caption')}
    >
      {shortcut}
    </kbd>
  )
}

// MenuItem's render hook: the styled row goes into Base UI's context-menu item.
function renderMenuItem({
  radio,
  checkbox,
  checked,
  disabled,
  label,
  closeOnClick,
  onClick,
  element,
  children,
}: MenuItemRenderOptions) {
  // The row's activation goes on the primitive: Base UI's Enter/Space calls
  // only the primitive's own onClick.
  return radio || checkbox ? (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked}
      disabled={disabled}
      label={label}
      closeOnClick={closeOnClick}
      onClick={onClick}
      render={element}
    >
      {children}
      <RowShortcut />
    </ContextMenuPrimitive.CheckboxItem>
  ) : (
    <ContextMenuPrimitive.Item
      disabled={disabled}
      label={label}
      closeOnClick={closeOnClick}
      onClick={onClick}
      render={element}
    >
      {children}
      <RowShortcut />
    </ContextMenuPrimitive.Item>
  )
}

interface ContextMenuItemProps extends MenuItemProps {
  /** Keyboard shortcut shown at the row's end, e.g. `⌘C`. */
  shortcut?: string
}

const ContextMenuItem = forwardRef<HTMLDivElement, ContextMenuItemProps>(({ shortcut, ...props }, ref) => (
  <ShortcutContext.Provider value={shortcut}>
    <MenuItem ref={ref} {...props} />
  </ShortcutContext.Provider>
))
ContextMenuItem.displayName = 'ContextMenuItem'

interface ContextMenuContentProps {
  /** Where the menu grows from (see Morph): the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'pointer'`. */
  from?: 'pointer' | 'center' | 'top' | 'right' | 'bottom' | 'left' | RefObject<HTMLElement | null>
  /** How it grows (see Morph): with the liquid goo neck, a plain morph, a slide or a fade. Defaults to `'goo'`. */
  effect?: 'goo' | 'morph' | 'slide' | 'fade'
  /** Hide the `from` element while open, so it reads as turning into the menu. Defaults to `false`. */
  hideSource?: boolean
  /** Spring tier of a plain morph, slide or fade; goo runs on its own `spring.goo`. Defaults to `'moderate'`. */
  tier?: 'moderate' | 'slow'
  /** Portal target. Defaults to the document body. */
  container?: HTMLElement | null
  /** Extra classes for the menu surface — it is 14rem wide by default. */
  className?: string
  /** `ContextMenu.Item` rows, plus `ContextMenu.Label` and `ContextMenu.Separator`. */
  children?: ReactNode
}

const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  ({ from = 'pointer', effect, hideSource, tier = 'moderate', container, className, children }, ref) => {
    const { open, origin } = useContext(ContextMenuContext)
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    useImperativeHandle(ref, () => morph.popup as HTMLDivElement, [morph.popup])
    // Fixed shadow, like Dropdown (see Elevated).
    const level = Math.min(useSurface() + 2, 8)
    const containerRef = useRef<HTMLDivElement>(null)
    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, setActiveIndex, handlers, registerItem, remeasure } = hover

    // Rows stay registered between opens, so their rects are stale until the
    // menu is open again; a close drops the highlight so the next open doesn't
    // spring it over from the last row.
    useEffect(() => {
      if (open) remeasure()
      else setActiveIndex(null)
    }, [open, remeasure, setActiveIndex])

    const rows = useMemo(
      () => ({ registerItem, activeIndex, inMenu: true, renderMenuItem }),
      [registerItem, activeIndex],
    )

    return (
      <ContextMenuPrimitive.Portal container={container ?? undefined}>
        <ContextMenuPrimitive.Positioner className="z-50 outline-none">
          <ContextMenuPrimitive.Popup
            ref={morph.popupRef}
            onMouseEnter={handlers.onMouseEnter}
            onMouseMove={handlers.onMouseMove}
            onMouseLeave={handlers.onMouseLeave}
            onClick={handlers.onClick}
            // Keyboard navigation moves focus between rows; the hover background follows it.
            onFocus={e => {
              const index = (e.target as HTMLElement)
                .closest('[data-fluid-hover-index]')
                ?.getAttribute('data-fluid-hover-index')
              if (index != null) setActiveIndex(Number(index))
            }}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setActiveIndex(null)
            }}
            className="relative select-none outline-none"
          >
            <SurfaceProvider value={level}>
              <MorphSurface
                morph={morph}
                bg={SURFACE_BG[level]}
                shadow={SURFACE_SHADOW[3]}
                radius={shape.container}
                className={cn(
                  'flex w-56 max-h-[min(480px,var(--available-height))] flex-col overflow-hidden',
                  shape.container,
                  className,
                )}
              >
                <ScrollArea className={popupScrollAreaClass} viewportClassName={cn(popupViewportClass, 'scroll-fade')}>
                  <div ref={containerRef} className="relative flex flex-col p-1">
                    <FluidHoverHighlight hover={hover} hidden={!open} className={shape.bg} />
                    <DropdownContext.Provider value={rows}>{children}</DropdownContext.Provider>
                  </div>
                </ScrollArea>
              </MorphSurface>
            </SurfaceProvider>
          </ContextMenuPrimitive.Popup>
        </ContextMenuPrimitive.Positioner>
      </ContextMenuPrimitive.Portal>
    )
  },
)
ContextMenuContent.displayName = 'ContextMenuContent'

interface ContextMenuProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled menu. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Turns the trigger area back into a plain one: no menu on right click or long press. Defaults to `false`. */
  disabled?: boolean
  /** Pins the rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
  /** The area and the menu — `ContextMenu.Trigger` plus a `ContextMenu.Content`. */
  children?: ReactNode
}

/**
 * A menu that grows out of the pointer on right click, or on a long press on
 * touch: the surface swells from the exact point you pressed into the menu.
 *
 * The morph comes from the shared engine (see Morph): from the press point
 * by default, or from its own center, a viewport edge or any element, with
 * the goo, a plain morph, a slide or a fade. The rows are Dropdown's — the
 * fluid hover background gliding between them, icons that firm up under it,
 * dimmed disabled rows the pointer skips — plus a keyboard shortcut at the
 * end of a row. The menu lifts 2 surface levels off its substrate. Built on
 * Base UI's ContextMenu: it opens at the pointer and flips or shifts to stay
 * on screen, arrow keys and typeahead move between rows, and picking a row,
 * Escape or an outside press closes it.
 *
 * Statics:
 * - `ContextMenu.Trigger` — the area that opens it (a `div`).
 * - `ContextMenu.Content` — the menu: the morph options `from`, `effect`,
 *   `hideSource`, `tier`.
 * - `ContextMenu.Item` — a row: `index`, `label`, `icon`, `shortcut`,
 *   `onSelect`, `disabled`.
 * - `ContextMenu.Label` / `ContextMenu.Separator` — a caption over a run of
 *   rows and a rule between runs (Dropdown's).
 *
 * @example {@include ./examples.mdx}
 */
function ContextMenu({ open, defaultOpen = false, onOpenChange, disabled = false, size, children }: ContextMenuProps) {
  const [current, setCurrent] = useControllableState(open, defaultOpen, onOpenChange)
  const { origin, capture } = useMorphOrigin()
  const ctx = useMemo(() => ({ open: current, origin }), [current, origin])

  const root = (
    <ContextMenuContext.Provider value={ctx}>
      <ContextMenuPrimitive.Root
        open={current}
        disabled={disabled}
        onOpenChange={(next, details) => {
          if (next) capture(details)
          setCurrent(next)
        }}
      >
        {children}
      </ContextMenuPrimitive.Root>
    </ContextMenuContext.Provider>
  )

  // The portalled menu reads the size through React context.
  return size ? <SizeProvider size={size}>{root}</SizeProvider> : root
}

ContextMenu.Trigger = ContextMenuPrimitive.Trigger
ContextMenu.Content = ContextMenuContent
ContextMenu.Item = ContextMenuItem
ContextMenu.Label = DropdownLabel
ContextMenu.Separator = DropdownSeparator

export type { ContextMenuContentProps, ContextMenuItemProps, ContextMenuProps }
export { ContextMenu, ContextMenuContent, ContextMenuItem }

export default ContextMenu
