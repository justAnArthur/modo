import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { SiteConfig } from './schema'

export type { Tier } from './tiers'

import type { Tier } from './tiers'

export interface ParsedItemLite {
  name: string
  id: string
  tier: Tier
  props: Array<{ name: string; optional: boolean }>
  /** Absolute path of the item's entry in the shared build (.modo-tmp/build/items/<tier>/<id>.mjs). */
  bundleUrl: string
}

export interface SlotMember {
  requiredProps: string[]
  userTier: Tier
  name: string
}

export interface ShellSlot {
  name: 'Button' | 'Link' | 'Sidebar' | 'Code' | 'Select' | 'Icon'
  userTier: Tier
  requiredProps: string[]
  members?: Record<string, SlotMember>
}

export const SLOTS: ShellSlot[] = [
  {
    name: 'Button',
    userTier: 'primitives',
    requiredProps: ['children'],
  },
  {
    name: 'Link',
    userTier: 'primitives',
    requiredProps: ['href', 'children'],
  },
  {
    name: 'Code',
    userTier: 'primitives',
    requiredProps: ['children'],
  },
  {
    name: 'Icon',
    userTier: 'primitives',
    requiredProps: ['name'],
  },
  {
    name: 'Select',
    userTier: 'components',
    requiredProps: ['value', 'onChange', 'options'],
  },
  {
    name: 'Sidebar',
    userTier: 'components',
    requiredProps: ['children'],
    members: {
      Item: {
        name: 'Item',
        userTier: 'components',
        requiredProps: ['href', 'children'],
      },
      Section: {
        name: 'Section',
        userTier: 'components',
        requiredProps: ['title', 'children'],
      },
    },
  },
]

// Components are never loaded node-side (the shared build is browser-only):
// a slot resolves to a bundle path or a plain fallback's name, which the
// shell's virtual module imports in the browser.
export interface LoadedComponent {
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

function omitted(slotName: 'Button' | 'Link' | 'Code' | 'Select' | 'Icon' | 'Sidebar'): LoadedComponent {
  const fallbackName = slotName === 'Sidebar' ? 'SidebarRoot' : slotName
  return {
    cssPaths: [],
    source: 'fallback',
    resolvedPath: `fallback:${slotName}`,
    fallbackName: `Plain${fallbackName}`,
  }
}

export async function resolveShellSlots(
  config: Pick<SiteConfig, 'shell'>,
  userItems: ParsedItemLite[],
  loadUserPath: LoadUserPath,
  opts: ResolveOptions = {},
): Promise<ResolvedShell> {
  const warnings = opts.warnings ?? []
  // Genuinely-empty projects (no items, no shell mapping) shouldn't spam 7
  // warnings on every boot — the absence is the user's intent, not a bug.
  const silence = userItems.length === 0 && Object.keys(config.shell ?? {}).length === 0

  async function pick(
    slotName: ShellSlot['name'],
    member?: SlotMember,
    fallback = omitted(slotName),
  ): Promise<LoadedComponent> {
    const base = member ?? SLOTS.find(s => s.name === slotName)!
    const { requiredProps: required, userTier: tier } = base

    const explicit = config.shell?.[slotName]
    if (explicit) {
      const loaded = await loadUserPath(explicit)
      if (loaded) return { ...loaded, source: 'config', resolvedPath: explicit }
      // A pin that doesn't load (missing file, failed build, no such export)
      // must not fall back to interface matching in silence.
      if (!member) warnings.push(`Shell slot "${slotName}" is pinned to "${explicit}", which didn't load`)
    }

    const expectedName = (member?.name ?? slotName).toLowerCase()
    const candidates = userItems
      .filter(it => it.tier === tier && it.name.toLowerCase() === expectedName)
      .filter(it => required.every(rp => it.props.some(p => p.name === rp)))
      .sort((a, b) => a.id.localeCompare(b.id))
    if (candidates.length > 0) {
      const c = candidates[0]!
      return { cssPaths: [], source: 'interface-match', resolvedPath: `${c.tier}/${c.id}`, bundlePath: c.bundleUrl }
    }

    if (!silence) warnings.push(`Shell slot "${slotName}${member ? `.${member.name}` : ''}" could not be resolved`)
    return fallback
  }

  const rootPicks = {
    Button: await pick('Button'),
    Link: await pick('Link'),
    Code: await pick('Code'),
    Select: await pick('Select'),
    Icon: await pick('Icon'),
    Sidebar: await pick('Sidebar'),
  }

  const sidebarMembers = SLOTS.find(s => s.name === 'Sidebar')!.members!

  // The root's Item/Section statics can't be inspected node-side: a host root
  // owns its members, and the shell resolves `Root.Item ?? Item` in the browser.
  const sidebarFromRoot = rootPicks.Sidebar.source !== 'fallback'
  const fallbackItem: LoadedComponent = {
    cssPaths: [],
    source: 'fallback',
    resolvedPath: 'fallback:Sidebar.Item',
    fallbackName: 'PlainSidebarItem',
  }
  const fallbackSection: LoadedComponent = {
    cssPaths: [],
    source: 'fallback',
    resolvedPath: 'fallback:Sidebar.Section',
    fallbackName: 'PlainSidebarSection',
  }

  const sidebarItem = sidebarFromRoot ? fallbackItem : await pick('Sidebar', sidebarMembers.Item, fallbackItem)
  const sidebarSection = sidebarFromRoot
    ? fallbackSection
    : await pick('Sidebar', sidebarMembers.Section, fallbackSection)

  return {
    Button: rootPicks.Button,
    Link: rootPicks.Link,
    Code: rootPicks.Code,
    Select: rootPicks.Select,
    Icon: rootPicks.Icon,
    Sidebar: {
      Root: rootPicks.Sidebar,
      Item: sidebarItem,
      Section: sidebarSection,
    },
  }
}
