import { SIDEBAR_MEMBERS, SLOTS, type SlotName } from '../lib/contract'
import type { SiteConfig } from '../lib/schema'
import type { Tier } from '../lib/tiers'

/** An item as slot matching sees it. */
export interface MatchableItem {
  name: string
  id: string
  tier: Tier
  props: Array<{ name: string }>
  /** The item's entry in the shared build (.modo-tmp/build/items/<tier>/<id>.mjs). */
  bundlePath: string
}

type PlainName =
  | 'PlainButton'
  | 'PlainLink'
  | 'PlainCode'
  | 'PlainSelect'
  | 'PlainIcon'
  | 'PlainSidebarRoot'
  | 'PlainSidebarItem'
  | 'PlainSidebarSection'
  | 'PlainSiteSwitcher'

// Components are never loaded node-side (the shared build is browser-only): a
// slot resolves to a bundle path or a plain fallback, which the shell's virtual
// module imports in the browser.
export interface BuiltSlot {
  source: 'config' | 'interface-match'
  bundlePath: string
  exportName: string
  cssFiles: string[]
}

export type SlotResolution = BuiltSlot | { source: 'fallback'; fallbackName: PlainName }

export interface ShellResolution {
  Button: SlotResolution
  Link: SlotResolution
  Code: SlotResolution
  Select: SlotResolution
  Icon: SlotResolution
  Sidebar: { Root: SlotResolution; Item: SlotResolution; Section: SlotResolution }
  SiteSwitcher: SlotResolution
}

/** A pinned module's build: null when it didn't build or lacks the export it names. */
export type LoadPinned = (ref: string) => BuiltSlot | null

type Member = keyof typeof SIDEBAR_MEMBERS

function plain(slot: SlotName, member?: Member): SlotResolution {
  return {
    source: 'fallback',
    fallbackName: `Plain${slot}${member ?? (slot === 'Sidebar' ? 'Root' : '')}` as PlainName,
  }
}

export function resolveShellSlots(
  config: Pick<SiteConfig, 'shell'>,
  items: MatchableItem[],
  loadPinned: LoadPinned,
): { shell: ShellResolution; warnings: string[] } {
  const warnings: string[] = []
  // An empty project (no items, no pins) means it; a warning on every boot would be noise.
  const silent = items.length === 0 && Object.keys(config.shell ?? {}).length === 0
  // A plain fallback is a supported outcome: one summary line, not one warning per slot.
  const unresolved: string[] = []

  function pinned(slot: SlotName): BuiltSlot | null {
    const ref = config.shell?.[slot]
    if (!ref) return null
    const loaded = loadPinned(ref)
    // A pin that doesn't load must not fall through to matching in silence.
    if (!loaded) warnings.push(`Shell slot "${slot}" is pinned to "${ref}", which didn't load`)
    return loaded
  }

  function matched(slot: SlotName, member?: Member): BuiltSlot | null {
    const { tier, requiredProps } = member ? SIDEBAR_MEMBERS[member] : SLOTS[slot]
    const name = (member ?? slot).toLowerCase()
    const hit = items
      .filter(it => it.tier === tier && it.name.toLowerCase() === name)
      .filter(it => requiredProps.every(rp => it.props.some(p => p.name === rp)))
      .sort((a, b) => a.id.localeCompare(b.id))[0]
    return hit ? { source: 'interface-match', bundlePath: hit.bundlePath, exportName: 'default', cssFiles: [] } : null
  }

  function pick(slot: SlotName): SlotResolution {
    const found = pinned(slot) ?? matched(slot)
    if (found) return found
    // Only a site with pages renders the switcher, so its fallback isn't news on every boot.
    if (slot !== 'SiteSwitcher') unresolved.push(slot)
    return plain(slot)
  }

  // Members are never pinned: a pinned or matched root owns its parts, which
  // the shell reads as `Root.Item ?? Item` in the browser.
  function member(name: Member, root: SlotResolution): SlotResolution {
    if (root.source !== 'fallback') return plain('Sidebar', name)
    return matched('Sidebar', name) ?? plain('Sidebar', name)
  }

  const roots = {
    Button: pick('Button'),
    Link: pick('Link'),
    Code: pick('Code'),
    Select: pick('Select'),
    Icon: pick('Icon'),
    Sidebar: pick('Sidebar'),
    SiteSwitcher: pick('SiteSwitcher'),
  }
  const Root = roots.Sidebar
  const shell: ShellResolution = {
    ...roots,
    Sidebar: { Root, Item: member('Item', Root), Section: member('Section', Root) },
  }

  if (!silent && unresolved.length > 0) {
    warnings.push(
      `Plain fallbacks for ${unresolved.join(', ')}: no item matches by name and required props, and modo.config.ts \`shell\` pins none`,
    )
  }
  return { shell, warnings }
}
