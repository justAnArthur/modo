/*
 * Local addition (not part of Fluid Functionalism): a tree view in the
 * Sidebar's motion language. The selected row is a liquid indicator
 * (`lib/goo-indicator.tsx`), one fluid hover highlight runs across every
 * level, branches fold on a measured height, and the keyboard follows the
 * WAI-ARIA tree pattern.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { type UseFluidHoverReturn, useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { SizeScope } from '../../../primitives/systems/sizes'

/** One node of the tree. */
interface TreeItem {
  /** Unique across the whole tree: the selection and the expanded set key on it. */
  id: string
  /** The row's text, also what typeahead matches. */
  label: string
  /** A glyph ahead of the label. */
  icon?: IconComponent
  /** The nodes it folds; any array, even empty, makes it a branch. */
  children?: TreeItem[]
}

interface TreeNode {
  item: TreeItem
  index: number
  parent: TreeNode | null
}

// Literal table: the guide sits under the parent's chevron, itemPx + icon / 2.
const GUIDE: Record<SizeVariant, string> = {
  default: 'ml-[15px]',
  compact: 'ml-[12px]',
}

const TYPEAHEAD_MS = 500

const closedRow = (el: HTMLElement) => el.closest('[data-tree-group="closed"]') !== null

function flatten(items: TreeItem[]): TreeNode[] {
  const nodes: TreeNode[] = []
  const walk = (list: TreeItem[], parent: TreeNode | null) => {
    for (const item of list) {
      const node = { item, index: nodes.length, parent }
      nodes.push(node)
      if (item.children) walk(item.children, node)
    }
  }
  walk(items, null)
  return nodes
}

interface TreeState {
  expanded: Set<string>
  value: string | undefined
  tabStop: string | undefined
  hover: UseFluidHoverReturn
  rows: Map<string, HTMLDivElement>
  nodes: Map<string, TreeNode>
  activate: (node: TreeNode) => void
}

const TreeContext = createContext<TreeState | null>(null)

function TreeGroup({ open, items, depth }: { open: boolean; items: TreeItem[]; depth: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const size = useSize()
  const reduced = useReduceMotion()
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Spring only when this branch toggles; a nested branch folding inside it
  // changes the measurement and must snap, or two springs chase each other.
  const previous = useRef(open)
  const toggling = useRef(false)
  if (previous.current !== open) {
    previous.current = open
    toggling.current = true
  }

  return (
    <motion.div
      className={cn('overflow-hidden', height === null && !open && 'h-0')}
      initial={false}
      animate={height === null ? { opacity: open ? 1 : 0 } : { height: open ? height : 0, opacity: open ? 1 : 0 }}
      transition={toggling.current && !reduced ? (open ? spring.moderate : spring.moderate.exit) : { duration: 0 }}
      onAnimationComplete={() => {
        toggling.current = false
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a tree branch is an ARIA group, not a form fieldset */}
      <div
        ref={ref}
        role="group"
        data-tree-group={open ? 'open' : 'closed'}
        {...(open ? {} : { inert: '' })}
        className={cn('flex flex-col border-l border-border pl-[var(--space-1)]', GUIDE[size.variant])}
      >
        {items.map(item => (
          <TreeRow key={item.id} item={item} depth={depth} />
        ))}
      </div>
    </motion.div>
  )
}

function TreeRow({ item, depth }: { item: TreeItem; depth: number }) {
  const tree = useContext(TreeContext) as TreeState
  const rowRef = useRef<HTMLDivElement>(null)
  const size = useSize()
  const reduced = useReduceMotion()
  const Chevron = useIcon('chevron-right')
  const node = tree.nodes.get(item.id) as TreeNode
  useRegisterFluidHoverItem(tree.hover.registerItem, node.index, rowRef)

  const branch = item.children !== undefined
  const open = tree.expanded.has(item.id)
  const selected = tree.value === item.id
  const lit = selected || tree.hover.activeIndex === node.index
  const Icon = item.icon

  return (
    <div
      ref={el => {
        if (el) tree.rows.set(item.id, el)
        else tree.rows.delete(item.id)
      }}
      role="treeitem"
      data-tree-id={item.id}
      aria-level={depth}
      aria-selected={selected}
      aria-expanded={branch ? open : undefined}
      tabIndex={tree.tabStop === item.id ? 0 : -1}
      className="flex flex-col outline-none"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: the treeitem around the row takes focus and keys; the row is its pointer target */}
      <div
        ref={rowRef}
        onClick={(e: MouseEvent) => {
          e.stopPropagation()
          tree.activate(node)
        }}
        className={cn(
          'relative z-10 flex min-w-0 cursor-pointer select-none items-center',
          size.control,
          size.itemPx,
          size.gap,
        )}
      >
        <span className="flex shrink-0 items-center justify-center" style={{ width: size.icon, height: size.icon }}>
          {branch && (
            <motion.span
              className="inline-flex"
              initial={false}
              animate={{ rotate: open ? 90 : 0 }}
              transition={reduced ? { duration: 0 } : spring.fast}
            >
              <Chevron size={size.icon} strokeWidth={1.5} className="text-muted-foreground" />
            </motion.span>
          )}
        </span>
        {Icon && (
          <Icon
            size={size.icon}
            strokeWidth={lit ? 2 : 1.5}
            className={cn(
              'shrink-0 transition-[color,stroke-width] duration-fast',
              lit ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
        )}
        <WeightLabel emphasized={selected} lit={lit} trim truncate="line" className={size.text}>
          {item.label}
        </WeightLabel>
      </div>
      {item.children && <TreeGroup open={open} items={item.children} depth={depth + 1} />}
    </div>
  )
}

interface TreeProps {
  /** The nodes: `{ id, label, icon?, children? }`, nested through `children`. */
  items: TreeItem[]
  /** Controlled ids of the open branches. Pair with `onExpandedChange`. */
  expanded?: string[]
  /** Branches open at first, for an uncontrolled tree. Defaults to `[]`. */
  defaultExpanded?: string[]
  /** Called with the open branches whenever one opens or closes. */
  onExpandedChange?: (expanded: string[]) => void
  /** Controlled id of the selected node. Pair with `onValueChange`. */
  value?: string
  /** The node selected at first, for an uncontrolled tree. */
  defaultValue?: string
  /** Called with the id of the node that was picked. */
  onValueChange?: (value: string) => void
  /** The tree's accessible name. */
  label?: string
  /** Pins the rows to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root. */
  className?: string
}

/**
 * A tree of nested items: folders and files, an outline, a hierarchy of
 * settings.
 *
 * Picking a row selects it, and a branch opens or closes too: its chevron
 * turns and its children fold out under it, on a guide line that hangs from
 * the chevron. The selected row is a liquid background that melts across
 * from the old one, and its label turns semibold without moving. One fluid
 * hover highlight runs over every level, so it glides from a folder into
 * its children.
 *
 * The keyboard follows the tree pattern: up and down move through the
 * visible rows, right opens a branch or steps into it, left closes it or
 * steps out to its parent, Home and End jump to the ends, Enter and Space
 * pick, and typing a name jumps to the next row that starts with it. Tab
 * leaves the tree from the selected row. Works controlled (`value`,
 * `expanded`) or uncontrolled (`defaultValue`, `defaultExpanded`).
 *
 * @example {@include ./examples.mdx}
 */
function Tree({
  items,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  size: sizeProp,
  className,
}: TreeProps) {
  const [expandedList, setExpanded] = useControllableState(expandedProp, defaultExpanded, onExpandedChange)
  const [value, setValue] = useControllableState<string | undefined>(
    valueProp,
    defaultValue,
    onValueChange as ((value: string | undefined) => void) | undefined,
  )
  const [focused, setFocused] = useState<string>()
  const [keyboard, setKeyboard] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rows = useRef(new Map<string, HTMLDivElement>()).current
  const typeahead = useRef({ text: '', at: 0 })
  const hover = useFluidHover(containerRef, { isItemDisabled: closedRow })
  const shape = useShape()

  const flat = useMemo(() => flatten(items), [items])
  const nodes = useMemo(() => new Map(flat.map(node => [node.item.id, node])), [flat])
  const expanded = useMemo(() => new Set(expandedList), [expandedList])

  const shown = (node: TreeNode | undefined | null) => {
    for (let up = node?.parent; up; up = up.parent) if (!expanded.has(up.item.id)) return false
    return node != null
  }
  const visible = flat.filter(shown)
  const at = (id: string | undefined) => (id === undefined ? undefined : nodes.get(id))
  const tabStop = [focused, value].find(id => shown(at(id))) ?? visible[0]?.item.id

  const toggle = (node: TreeNode, open = !expanded.has(node.item.id)) =>
    setExpanded(list => (open ? [...list, node.item.id] : list.filter(id => id !== node.item.id)))

  const activate = (node: TreeNode) => {
    setValue(node.item.id)
    if (node.item.children) toggle(node)
  }

  const focusNode = (node: TreeNode | undefined | null) => {
    if (node) rows.get(node.item.id)?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const node = at((e.target as HTMLElement).dataset.treeId)
    if (!node) return
    const i = visible.indexOf(node)
    const branch = node.item.children !== undefined
    const open = expanded.has(node.item.id)

    if (e.key === 'ArrowDown') focusNode(visible[i + 1])
    else if (e.key === 'ArrowUp') focusNode(visible[i - 1])
    else if (e.key === 'Home') focusNode(visible[0])
    else if (e.key === 'End') focusNode(visible[visible.length - 1])
    else if (e.key === 'ArrowRight') {
      if (branch && !open) toggle(node, true)
      else if (branch) focusNode(at(node.item.children?.[0]?.id))
    } else if (e.key === 'ArrowLeft') {
      if (branch && open) toggle(node, false)
      else focusNode(node.parent)
    } else if (e.key === 'Enter') activate(node)
    else if (e.key === ' ') setValue(node.item.id)
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = e.timeStamp
      const fresh = now - typeahead.current.at > TYPEAHEAD_MS
      typeahead.current = { text: (fresh ? '' : typeahead.current.text) + e.key.toLowerCase(), at: now }
      const text = typeahead.current.text
      // A first letter moves past the current row; a longer prefix may stay on it.
      const order = [...visible.slice(i + (text.length === 1 ? 1 : 0)), ...visible.slice(0, i)]
      focusNode(order.find(n => n.item.label.toLowerCase().startsWith(text)))
    } else return

    e.preventDefault()
    // Keep handled keys from reaching window-level listeners (the docs' arrow paging).
    e.stopPropagation()
  }

  const onFocus = (e: FocusEvent) => {
    const node = at((e.target as HTMLElement).dataset.treeId)
    if (!node) return
    setFocused(node.item.id)
    setKeyboard(e.target.matches(':focus-visible'))
    hover.setActiveIndex(node.index)
  }

  const onBlur = (e: FocusEvent) => {
    if (containerRef.current?.contains(e.relatedTarget as globalThis.Node | null)) return
    setKeyboard(false)
    hover.setActiveIndex(null)
  }

  const rectOf = (node: TreeNode | undefined) =>
    node && hover.isMeasured && shown(node) ? hover.itemRects[node.index] : undefined
  const selectedRect = rectOf(at(value))
  const hoveredNode = hover.activeIndex === null ? undefined : flat[hover.activeIndex]
  const focusRect = keyboard ? rectOf(at(focused)) : undefined

  // A rect that changed because the rows reflowed (a branch folding above)
  // snaps; only a change of row travels. Compared against the last commit.
  const previous = useRef({ value, hovered: hover.activeIndex, focused })
  const travels = {
    value: previous.current.value !== value,
    hovered: previous.current.hovered !== hover.activeIndex,
    focused: previous.current.focused !== focused,
  }
  useLayoutEffect(() => {
    previous.current = { value, hovered: hover.activeIndex, focused }
  })

  const state: TreeState = { expanded, value, tabStop, hover, rows, nodes, activate }

  const tree = (
    <div ref={containerRef} {...hover.handlers} className={cn('relative flex flex-col', className)}>
      <AnimatePresence>
        {selectedRect && (
          <motion.div
            key="selected"
            className="pointer-events-none absolute top-0 left-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: spring.moderate.exit }}
            transition={spring.fast}
          >
            <GooIndicator
              rect={selectedRect}
              className={cn('bg-active', shape.bg)}
              transition={travels.value ? spring.moderate : false}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <FluidHoverHighlight
        hover={hover}
        hidden={hoveredNode !== undefined && !shown(hoveredNode)}
        from={selectedRect}
        className={shape.bg}
        transition={travels.hovered ? undefined : false}
      />
      <FocusRing rect={focusRect ?? null} instant={!travels.focused} />

      <TreeContext.Provider value={state}>
        <div
          role="tree"
          aria-label={label}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerDown={() => setKeyboard(false)}
          className="flex flex-col"
        >
          {items.map(item => (
            <TreeRow key={item.id} item={item} depth={1} />
          ))}
        </div>
      </TreeContext.Provider>
    </div>
  )

  return <SizeScope size={sizeProp}>{tree}</SizeScope>
}

Tree.displayName = 'Tree'

export type { TreeItem, TreeProps }
export { Tree }

export default Tree
