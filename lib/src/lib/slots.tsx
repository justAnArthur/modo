import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

/** A host component: its props are whatever the design system declares. */
// biome-ignore lint/suspicious/noExplicitAny: no prop type admits every host component
export type AnyComponent = ComponentType<any>

export type Tier = 'primitives' | 'components' | 'blocks'

export interface ParsedItemLite {
  name: string
  id: string
  tier: Tier
  props: Array<{ name: string; optional: boolean }>
  /** Live Component, populated by the shell plugin when it bundles the item. */
  Component?: AnyComponent
  /** Absolute path of the item's entry in the shared build (.modo-tmp/build/items/<tier>/<id>.mjs). */
  bundleUrl?: string
}

export interface SlotMember {
  requiredProps: string[]
  fallback: string
  userTier: Tier
  name: string
}

export interface ShellSlot {
  name: 'Button' | 'Link' | 'Sidebar' | 'Code' | 'Select' | 'Icon'
  type: 'atom' | 'organism'
  userTier: Tier
  requiredProps: string[]
  fallback: string
  members?: Record<string, SlotMember>
}

export const SLOTS: ShellSlot[] = [
  {
    name: 'Button',
    type: 'atom',
    userTier: 'primitives',
    requiredProps: ['children'],
    fallback: 'primitives/button',
  },
  {
    name: 'Link',
    type: 'atom',
    userTier: 'primitives',
    requiredProps: ['href', 'children'],
    fallback: 'primitives/link',
  },
  {
    name: 'Code',
    type: 'atom',
    userTier: 'primitives',
    requiredProps: ['children'],
    fallback: 'primitives/code',
  },
  {
    name: 'Icon',
    type: 'atom',
    userTier: 'primitives',
    requiredProps: ['name'],
    fallback: 'primitives/icon',
  },
  {
    name: 'Select',
    type: 'atom',
    userTier: 'components',
    requiredProps: ['value', 'onChange', 'options'],
    fallback: 'components/select',
  },
  {
    name: 'Sidebar',
    type: 'organism',
    userTier: 'components',
    requiredProps: ['children'],
    fallback: 'components/sidebar',
    members: {
      Item: {
        name: 'Item',
        userTier: 'components',
        requiredProps: ['href', 'children'],
        fallback: 'components/sidebar',
      },
      Section: {
        name: 'Section',
        userTier: 'components',
        requiredProps: ['title', 'children'],
        fallback: 'components/sidebar',
      },
    },
  },
]

export interface UserConfigLite {
  name?: string
  shell?: Partial<Record<ShellSlot['name'], string>>
}

export interface LoadedComponent {
  Component: AnyComponent
  cssPaths: string[]
  source: 'config' | 'interface-match' | 'fallback'
  resolvedPath: string
  /** Path to the bundled .mjs file (when the loader created one). */
  bundlePath?: string
  /** The module export holding the component; `default` when unset. */
  exportName?: string
  /** When source is 'fallback', the name of the plain-HTML component to import. */
  fallbackName?:
    | 'PlainButton'
    | 'PlainLink'
    | 'PlainCode'
    | 'PlainSelect'
    | 'PlainIcon'
    | 'PlainSidebarItem'
    | 'PlainSidebarSection'
    | 'PlainSidebarRoot'
}

export interface ResolvedSidebar {
  Root: LoadedComponent
  Item: LoadedComponent
  Section: LoadedComponent
}

export interface ResolvedShell {
  Button: LoadedComponent
  Link: LoadedComponent
  Code: LoadedComponent
  Select: LoadedComponent
  Icon: LoadedComponent
  Sidebar: ResolvedSidebar
}

export type LoadUserPath = (path: string) => Promise<LoadedComponent | null>

export interface ResolveOptions {
  warnings?: string[]
}

/* Plain HTML fallbacks. Semantic tags only — structure comes from the lib's
   structural CSS via data-modo attrs, all visuals from the user's project.
   The user's primitives/components override these whenever they satisfy the
   slot contract. */

export function PlainButton({ type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} {...rest} />
}

export function PlainLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}

export function PlainCode({ children, ...rest }: HTMLAttributes<HTMLPreElement>) {
  return (
    <pre {...rest}>
      <code>{children}</code>
    </pre>
  )
}

export function PlainSelect({
  onChange,
  options,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select onChange={e => onChange(e.target.value)} {...rest}>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Hosts without an Icon slot get the label as text. */
export function PlainIcon({ label }: { name: string; label: string }) {
  return <span data-modo="icon-label">{label}</span>
}

export function PlainSidebarRoot({ children }: { children?: ReactNode }) {
  return <nav data-modo="sidebar-nav">{children}</nav>
}

export function PlainSidebarItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  return (
    <a data-modo="sidebar-item" href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

export function PlainSidebarSection({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div data-modo="sidebar-section">
      <h3 data-modo="sidebar-section-title">{title}</h3>
      <div data-modo="sidebar-section-items">{children}</div>
    </div>
  )
}

function fallbackFor(slotName: 'Button' | 'Link' | 'Code' | 'Select' | 'Icon' | 'SidebarRoot'): AnyComponent {
  switch (slotName) {
    case 'Button':
      return PlainButton
    case 'Link':
      return PlainLink
    case 'Code':
      return PlainCode
    case 'Select':
      return PlainSelect
    case 'Icon':
      return PlainIcon
    case 'SidebarRoot':
      return PlainSidebarRoot
  }
}

function omitted(slotName: 'Button' | 'Link' | 'Code' | 'Select' | 'Icon' | 'Sidebar'): LoadedComponent {
  const fallbackName = slotName === 'Sidebar' ? 'SidebarRoot' : slotName
  return {
    Component: fallbackFor(fallbackName),
    cssPaths: [],
    source: 'fallback',
    resolvedPath: `fallback:${slotName}`,
    fallbackName: `Plain${fallbackName}`,
  }
}

export async function resolveShellSlots(
  config: UserConfigLite,
  userItems: ParsedItemLite[],
  loadUserPath: LoadUserPath,
  opts: ResolveOptions = {},
): Promise<ResolvedShell> {
  const warnings = opts.warnings ?? []
  // Genuinely-empty projects (no items, no shell mapping) shouldn't spam 7
  // warnings on every boot — the absence is the user's intent, not a bug.
  const silence = userItems.length === 0 && Object.keys(config.shell ?? {}).length === 0

  async function pick(slotName: ShellSlot['name'], member?: SlotMember): Promise<LoadedComponent> {
    const base = member ?? SLOTS.find(s => s.name === slotName)!
    const { requiredProps: required, userTier: tier } = base

    const explicit = config.shell?.[slotName]
    if (explicit) {
      const loaded = await loadUserPath(explicit)
      if (loaded) return { ...loaded, source: 'config', resolvedPath: explicit }
    }

    const expectedName = (member?.name ?? slotName).toLowerCase()
    const candidates = userItems
      .filter(it => it.tier === tier && it.name.toLowerCase() === expectedName)
      .filter(it => required.every(rp => it.props.some(p => p.name === rp)))
      .sort((a, b) => a.id.localeCompare(b.id))
    if (candidates.length > 0) {
      const c = candidates[0]!
      if (c.bundleUrl || c.Component) {
        return {
          Component: null as unknown as AnyComponent,
          cssPaths: [],
          source: 'interface-match',
          resolvedPath: `${c.tier}/${c.id}`,
          bundlePath: c.bundleUrl,
        }
      }
      const loaded = await loadUserPath(`.modo-bundles/${c.tier}/${c.id}.mjs`)
      if (loaded) {
        return { ...loaded, source: 'interface-match', resolvedPath: `${c.tier}/${c.id}` }
      }
    }

    if (!silence) warnings.push(`Shell slot "${slotName}${member ? `.${member.name}` : ''}" could not be resolved`)
    return omitted(slotName)
  }

  const rootPicks = {
    Button: await pick('Button'),
    Link: await pick('Link'),
    Code: await pick('Code'),
    Select: await pick('Select'),
    Icon: await pick('Icon'),
    Sidebar: await pick('Sidebar'),
  }

  const sidebarRootComp = rootPicks.Sidebar.Component as unknown as {
    Item?: AnyComponent
    Section?: AnyComponent
  } | null
  const sidebarMembers = SLOTS.find(s => s.name === 'Sidebar')!.members!

  function fromRoot(name: 'Item' | 'Section'): LoadedComponent | null {
    const fn = sidebarRootComp?.[name]
    if (typeof fn !== 'function') return null
    return {
      Component: fn,
      cssPaths: rootPicks.Sidebar.cssPaths,
      source: 'interface-match',
      resolvedPath: `${rootPicks.Sidebar.resolvedPath}.${name}`,
    }
  }

  // Components are never imported node-side (the shared build is browser-only),
  // so the root's Item/Section statics can't be inspected here. Any user-provided
  // root owns its members; the shell resolves `Root.Item ?? Item` at runtime.
  const sidebarFromRoot = rootPicks.Sidebar.source !== 'fallback'
  const sidebarItem = fromRoot('Item') ?? (sidebarFromRoot ? null : await pick('Sidebar', sidebarMembers.Item))
  const sidebarSection = fromRoot('Section') ?? (sidebarFromRoot ? null : await pick('Sidebar', sidebarMembers.Section))

  const fallbackItem: LoadedComponent = {
    Component: PlainSidebarItem,
    cssPaths: [],
    source: 'fallback',
    resolvedPath: 'fallback:Sidebar.Item',
    fallbackName: 'PlainSidebarItem',
  }
  const fallbackSection: LoadedComponent = {
    Component: PlainSidebarSection,
    cssPaths: [],
    source: 'fallback',
    resolvedPath: 'fallback:Sidebar.Section',
    fallbackName: 'PlainSidebarSection',
  }

  return {
    Button: rootPicks.Button,
    Link: rootPicks.Link,
    Code: rootPicks.Code,
    Select: rootPicks.Select,
    Icon: rootPicks.Icon,
    Sidebar: {
      Root: rootPicks.Sidebar,
      Item: sidebarItem ?? fallbackItem,
      Section: sidebarSection ?? fallbackSection,
    },
  }
}
