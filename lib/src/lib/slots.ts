export type Tier = 'primitives' | 'components' | 'blocks'

export interface ParsedItemLite {
  name: string
  id: string
  tier: Tier
  props: Array<{ name: string; optional: boolean }>
  /** Live Component, populated by the shell plugin when it bundles the item. */
  Component?: React.ComponentType<any>
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
  name: 'Button' | 'Link' | 'Sidebar' | 'Panel' | 'Code'
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
  Component: React.ComponentType<any>
  cssPaths: string[]
  source: 'config' | 'interface-match' | 'shell-ds' | 'omitted'
  resolvedPath: string
  /** Path to the bundled .mjs file (when the loader created one). */
  bundlePath?: string
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
  Sidebar: ResolvedSidebar
  Panel: LoadedComponent
}

export type LoadShellDS = (slotPath: string) => Promise<LoadedComponent | null>
export type LoadUserPath = (path: string) => Promise<LoadedComponent | null>

export interface ResolveOptions {
  warnings?: string[]
}

export async function resolveShellSlots(
  config: UserConfigLite,
  userItems: ParsedItemLite[],
  loadShellDS: LoadShellDS,
  loadUserPath: LoadUserPath,
  opts: ResolveOptions = {},
): Promise<ResolvedShell> {
  const warnings = opts.warnings ?? []

  async function pick(slotName: ShellSlot['name'], member?: SlotMember): Promise<LoadedComponent> {
    const base = member ?? SLOTS.find((s) => s.name === slotName)!
    const { requiredProps: required, userTier: tier, fallback } = base

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
          Component: null as unknown as React.ComponentType<any>,
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

    const ds = await loadShellDS(fallback)
    if (ds) return { ...ds, source: 'shell-ds', resolvedPath: `shell-ds:${fallback}` }

    warnings.push(`Shell slot "${slotName}${member ? `.${member.name}` : ''}" could not be resolved`)
    return {
      Component: null as unknown as React.ComponentType<any>,
      cssPaths: [],
      source: 'omitted',
      resolvedPath: '',
    }
  }

  const rootPicks = {
    Button: await pick('Button'),
    Link: await pick('Link'),
    Code: await pick('Code'),
    Sidebar: await pick('Sidebar'),
    Panel: await pick('Panel'),
  }

  const sidebarRootComp = rootPicks.Sidebar.Component as unknown as
    | { Root?: any; Item?: any; Section?: any }
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

  return {
    Button: rootPicks.Button,
    Link: rootPicks.Link,
    Code: rootPicks.Code,
    Sidebar: {
      Root: rootPicks.Sidebar,
      Item: fromRoot('Item') ?? await pick('Sidebar', sidebarMembers.Item),
      Section: fromRoot('Section') ?? await pick('Sidebar', sidebarMembers.Section),
    },
    Panel: rootPicks.Panel,
  }
}
