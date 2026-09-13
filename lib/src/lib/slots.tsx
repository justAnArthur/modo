import type { ComponentType, ReactNode } from 'react'

export type Tier = 'primitives' | 'components' | 'blocks'

export interface ParsedItemLite {
  name: string
  id: string
  tier: Tier
  props: Array<{ name: string; optional: boolean }>
  /** Live Component, populated by the shell plugin when it bundles the item. */
  Component?: ComponentType<any>
  /** file:// URL of the bundled .mjs for this item. */
  bundleUrl?: string
}

export interface SlotMember {
  requiredProps: string[]
  fallback: string
  userTier: Tier
  name: string
}

export interface ShellSlot {
  name: 'Button' | 'Link' | 'Sidebar' | 'Panel' | 'Code' | 'Select'
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
  {
    name: 'Panel',
    type: 'organism',
    userTier: 'components',
    requiredProps: ['children'],
    fallback: 'components/panel',
  },
]

export interface UserConfigLite {
  name?: string
  shell?: Partial<Record<ShellSlot['name'], string>>
}

export interface LoadedComponent {
  Component: ComponentType<any>
  cssPaths: string[]
  source: 'config' | 'interface-match' | 'fallback'
  resolvedPath: string
  /** Path to the bundled .mjs file (when the loader created one). */
  bundlePath?: string
  /** When source is 'fallback', the name of the plain-HTML component to import. */
  fallbackName?: 'PlainButton' | 'PlainLink' | 'PlainCode' | 'PlainSelect' | 'PlainPanel' | 'PlainSidebarItem' | 'PlainSidebarSection' | 'PlainSidebarRoot'
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
  Sidebar: ResolvedSidebar
  Panel: LoadedComponent
}

export type LoadUserPath = (path: string) => Promise<LoadedComponent | null>

export interface ResolveOptions {
  warnings?: string[]
}

/* Plain HTML fallbacks. No styling, no defaults — semantic tags only so the
   chrome renders something usable when the user project ships no DS. The user's
   primitives/components override these whenever they satisfy the slot contract. */

export function PlainButton({ children, disabled, onClick, type = 'button', ...rest }: any) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}

export function PlainLink({ href, children, ...rest }: any) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

export function PlainCode({ children, ...rest }: any) {
  return (
    <pre {...rest}>
      <code>{children}</code>
    </pre>
  )
}

export function PlainSelect({ value, onChange, options, ...rest }: any) {
  return (
    <select
      value={value}
      onChange={(e: any) => onChange?.(e.target.value)}
      {...rest}
    >
      {(options ?? []).map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function PlainPanel({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function PlainSidebarRoot({ children }: { children?: ReactNode }) {
  return <nav>{children}</nav>
}

export function PlainSidebarItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  return (
    <a href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

export function PlainSidebarSection({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  )
}

const PlainSidebar = Object.assign(PlainSidebarRoot, {
  Item: PlainSidebarItem,
  Section: PlainSidebarSection,
})

function fallbackFor(
  slotName: 'Button' | 'Link' | 'Code' | 'Select' | 'Panel' | 'SidebarRoot',
): ComponentType<any> {
  switch (slotName) {
    case 'Button': return PlainButton
    case 'Link': return PlainLink
    case 'Code': return PlainCode
    case 'Select': return PlainSelect
    case 'Panel': return PlainPanel
    case 'SidebarRoot': return PlainSidebarRoot
  }
}

function omitted(
  slotName: 'Button' | 'Link' | 'Code' | 'Select' | 'Panel' | 'Sidebar',
): LoadedComponent {
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
    const base = member ?? SLOTS.find((s) => s.name === slotName)!
    const { requiredProps: required, userTier: tier } = base

    const explicit = config.shell?.[slotName]
    if (explicit) {
      const loaded = await loadUserPath(explicit)
      if (loaded) return { ...loaded, source: 'config', resolvedPath: explicit }
    }

    const expectedName = (member?.name ?? slotName).toLowerCase()
    const candidates = userItems
      .filter((it) => it.tier === tier && it.name.toLowerCase() === expectedName)
      .filter((it) => required.every((rp) => it.props.some((p) => p.name === rp)))
      .sort((a, b) => a.id.localeCompare(b.id))
    if (candidates.length > 0) {
      const c = candidates[0]!
      if (c.bundleUrl || c.Component) {
        return {
          Component: null as unknown as ComponentType<any>,
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
    Sidebar: await pick('Sidebar'),
    Panel: await pick('Panel'),
  }

  const sidebarRootComp = rootPicks.Sidebar.Component as unknown as
    | { Item?: any; Section?: any }
    | null
  const sidebarMembers = SLOTS.find((s) => s.name === 'Sidebar')!.members!

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

  const sidebarFromRoot = rootPicks.Sidebar.source === 'interface-match'
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
    Sidebar: {
      Root: rootPicks.Sidebar,
      Item: sidebarItem ?? fallbackItem,
      Section: sidebarSection ?? fallbackSection,
    },
    Panel: rootPicks.Panel,
  }
}
