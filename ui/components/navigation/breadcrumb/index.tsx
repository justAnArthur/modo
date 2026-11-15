/*!
 * Local addition (not part of Fluid Functionalism): a breadcrumb trail. One
 * fluid hover highlight runs along the crumbs, and the middle crumbs that
 * don't fit fold into a Dropdown behind an ellipsis.
 */

'use client'

import { Children, isValidElement, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { type UseFluidHoverReturn, useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import Dropdown from '../../overlays/dropdown'

interface BreadcrumbItemProps {
  /** The crumb's text. */
  label: string
  /** Where the crumb links to. */
  href?: string
  /** Called when the crumb is pressed; a crumb with neither `href` nor `onClick` is plain text. */
  onClick?: () => void
}

/** One crumb, as a child of `Breadcrumb`; it reads the same as an entry of `items`. */
function BreadcrumbItem(_: BreadcrumbItemProps) {
  return null
}

function useCrumbClasses() {
  const size = useSize()
  const shape = useShape()
  return cn(
    'relative z-10 flex min-w-0 items-center whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
    size.control,
    size.itemPx,
    size.text,
    shape.bg,
  )
}

interface CrumbProps {
  item: BreadcrumbItemProps
  current: boolean
  index: number
  hover: UseFluidHoverReturn
}

function Crumb({ item, current, index, hover }: CrumbProps) {
  const ref = useRef<HTMLLIElement>(null)
  const classes = useCrumbClasses()
  const interactive = !current && (item.href !== undefined || item.onClick !== undefined)
  useRegisterFluidHoverItem(hover.registerItem, interactive ? index : undefined, ref)
  const lit = current || hover.activeIndex === index
  const text = cn(
    classes,
    'truncate transition-[color] duration-fast',
    lit ? 'text-foreground' : 'text-muted-foreground',
    interactive && 'cursor-pointer',
  )

  return (
    <li ref={ref} className={cn('flex min-w-0', current ? 'shrink' : 'shrink-0')}>
      {current ? (
        <span aria-current="page" className={text}>
          {item.label}
        </span>
      ) : item.href !== undefined ? (
        <a href={item.href} onClick={item.onClick} className={text}>
          {item.label}
        </a>
      ) : item.onClick ? (
        <button type="button" onClick={item.onClick} className={text}>
          {item.label}
        </button>
      ) : (
        <span className={text}>{item.label}</span>
      )}
    </li>
  )
}

function Separator() {
  const size = useSize()
  const Chevron = useIcon('chevron-right')
  return (
    <li aria-hidden="true" className="flex shrink-0 items-center text-muted-foreground">
      <Chevron size={size.icon} strokeWidth={1.5} />
    </li>
  )
}

function Overflow({
  items,
  index,
  hover,
}: {
  items: BreadcrumbItemProps[]
  index: number
  hover: UseFluidHoverReturn
}) {
  const ref = useRef<HTMLLIElement>(null)
  const classes = useCrumbClasses()
  const size = useSize()
  const More = useIcon('more-horizontal')
  useRegisterFluidHoverItem(hover.registerItem, index, ref)
  const lit = hover.activeIndex === index

  return (
    <li ref={ref} className="flex shrink-0">
      <Dropdown.Menu>
        <Dropdown.Trigger
          render={
            <button
              type="button"
              aria-label={`${items.length} more`}
              className={cn(
                classes,
                'cursor-pointer transition-[color] duration-fast',
                lit ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          }
        >
          <More size={size.icon} strokeWidth={1.5} />
        </Dropdown.Trigger>
        <Dropdown.Content align="start">
          {items.map((item, i) => (
            <Dropdown.Item
              key={`${item.label}-${i}`}
              index={i}
              label={item.label}
              onSelect={() => (item.onClick ? item.onClick() : item.href && window.location.assign(item.href))}
            />
          ))}
        </Dropdown.Content>
      </Dropdown.Menu>
    </li>
  )
}

/** How many middle crumbs to fold so the trail fits `room`: the first and the last stay out. */
function foldCount(widths: number[], separator: number, ellipsis: number, room: number) {
  const total = (shown: number[], folded: boolean) =>
    shown.reduce((sum, w) => sum + w, 0) + (shown.length - 1 + (folded ? 1 : 0)) * separator + (folded ? ellipsis : 0)

  for (let folded = 0; folded <= widths.length - 2; folded++) {
    const shown = [...widths.slice(0, 1), ...widths.slice(1 + folded)]
    if (total(shown, folded > 0) <= room) return folded
  }
  return Math.max(widths.length - 2, 0)
}

interface BreadcrumbProps {
  /** The trail, first crumb first: `{ label, href?, onClick? }`. Or pass `Breadcrumb.Item` children instead. */
  items?: BreadcrumbItemProps[]
  /** `Breadcrumb.Item`s, read when `items` is left out. */
  children?: ReactNode
  /** Pins the crumbs to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `nav` root. */
  className?: string
}

/**
 * Where you are: the path from the top down to the current page, each step a
 * link back up.
 *
 * The last crumb is the current page (`aria-current="page"`), in the text
 * color; the ones before it are muted links that light up under one fluid
 * hover highlight gliding along the trail. When the trail runs out of room,
 * the middle crumbs fold into an ellipsis that opens them as a Dropdown,
 * keeping the first and as many of the last as fit; the current page
 * truncates last.
 *
 * Statics:
 * - `Breadcrumb.Item` — one crumb: `label`, `href`, `onClick`.
 *
 * @example {@include ./examples.mdx}
 */
function Breadcrumb({ items: itemsProp, children, size: sizeProp, className }: BreadcrumbProps) {
  const items =
    itemsProp ??
    Children.toArray(children)
      .filter(isValidElement<BreadcrumbItemProps>)
      .map(child => child.props)
  const size = useSize(sizeProp)
  const shape = useShape()
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLOListElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const hover = useFluidHover(listRef, { axis: 'x', gapClick: false })
  const [folded, setFolded] = useState(0)
  const labels = items.map(item => item.label).join('\n')

  // The measuring copy holds every crumb, a separator and the ellipsis, so the
  // fold is computed from real widths whatever the font or the size step.
  useLayoutEffect(() => {
    const nav = navRef.current
    const measure = measureRef.current
    if (!nav || !measure) return
    const fit = () => {
      const widths = [...measure.children].map(cell => (cell as HTMLElement).offsetWidth)
      const ellipsis = widths.pop() ?? 0
      const separator = widths.pop() ?? 0
      setFolded(foldCount(widths, separator, ellipsis, nav.clientWidth))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [labels, size.variant])

  const first = items.slice(0, 1)
  const hidden = items.slice(1, 1 + folded)
  const rest = items.slice(1 + folded)
  const last = items.length - 1
  // Fluid hover indices: the first crumb, then the ellipsis, then the rest.
  const restOffset = folded > 0 ? 2 : 1

  const nav = (
    <nav ref={navRef} aria-label="Breadcrumb" className={cn('relative flex w-full min-w-0', className)}>
      <ol
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 flex whitespace-nowrap"
      >
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className={cn('flex', size.control, size.itemPx, size.text)}>
            {item.label}
          </li>
        ))}
        <Separator />
        <li className={cn('flex items-center', size.control, size.itemPx)}>
          <span style={{ width: size.icon }} />
        </li>
      </ol>

      <ol ref={listRef} {...hover.handlers} className="relative flex min-w-0 items-center">
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {first.map(item => (
          <Crumb key="first" item={item} current={last === 0} index={0} hover={hover} />
        ))}
        {folded > 0 && (
          <>
            <Separator />
            <Overflow items={hidden} index={1} hover={hover} />
          </>
        )}
        {rest.map((item, i) => (
          <RestCrumb
            key={`${item.label}-${1 + folded + i}`}
            item={item}
            current={1 + folded + i === last}
            index={restOffset + i}
            hover={hover}
          />
        ))}
      </ol>
    </nav>
  )

  return sizeProp ? <SizeProvider size={sizeProp}>{nav}</SizeProvider> : nav
}

function RestCrumb(props: CrumbProps) {
  return (
    <>
      <Separator />
      <Crumb {...props} />
    </>
  )
}

Breadcrumb.Item = BreadcrumbItem

export type { BreadcrumbItemProps, BreadcrumbProps }
export { Breadcrumb, BreadcrumbItem }

export default Breadcrumb
