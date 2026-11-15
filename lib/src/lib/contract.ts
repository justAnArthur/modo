import type { ComponentType, ReactNode } from 'react'
import type { Tier } from './tiers'

/** The icons the chrome asks for, plus any `socials` key (`github`, `npm`, …). */
export type IconName = 'code' | 'copy' | 'check' | 'link' | 'menu' | 'sun' | 'moon' | (string & {})

/** The chrome's icon buttons: copy code, show code, theme toggle, menu, canvas zoom. */
export interface ButtonSlotProps {
  variant: 'ghost'
  size: 'icon-sm'
  'aria-label': string
  /** Set on toggles (show code, menu). */
  'aria-pressed'?: boolean
  onClick: () => void
  /** An `Icon`, or a short text glyph. */
  children: ReactNode
}

/** Every chrome and Markdown link: nav, header, heading anchors, Source links, links in prose. */
export interface LinkSlotProps {
  /** A root-relative href already includes the site's base. */
  href: string
  children: ReactNode
  /** On icon-only anchors: heading `#` links, socials. */
  'aria-label'?: string
  /** A Markdown link's title. */
  title?: string
}

/** Every code block: fenced Markdown, `{@includeCode}`, Show code on examples. */
export interface CodeSlotProps {
  language?: string
  /** The code, as one string. */
  children: string
}

/** An icon drawn inside the chrome's Button or Link. */
export interface IconSlotProps {
  name: IconName
  /** The accessible text: draw it for a name you have no glyph for. */
  label: string
}

export interface SelectOption {
  value: string
  label: string
}

/** Handed to panel items as `shell.Select`; the chrome renders none. */
export interface SelectSlotProps {
  value: string
  /** Called with the chosen value, not an event. */
  onValueChange: (value: string) => void
  options: SelectOption[]
}

/** Both side navs: the nav and the panel. */
export interface SidebarSlotProps {
  children?: ReactNode
}

/** One entry of a side nav. */
export interface SidebarItemProps {
  href: string
  /** The current page, or the TOC's current heading. */
  active?: boolean
  children?: ReactNode
}

/** A titled group of side-nav entries: a tier, a group folder, the TOC, a panel item. */
export interface SidebarSectionProps {
  title: string
  children?: ReactNode
}

/** The components the chrome renders with, one per slot, as panel items receive them. */
export interface ShellComponents {
  Button: ComponentType<ButtonSlotProps>
  Link: ComponentType<LinkSlotProps>
  Code: ComponentType<CodeSlotProps>
  Icon: ComponentType<IconSlotProps>
  Select: ComponentType<SelectSlotProps>
  /** A host root's own `Item` / `Section` statics win over the matched or plain ones. */
  Sidebar: {
    Root: ComponentType<SidebarSlotProps>
    Item: ComponentType<SidebarItemProps>
    Section: ComponentType<SidebarSectionProps>
  }
}

/** The props of a `panel.items[].component`. */
export interface PanelItemProps {
  shell: ShellComponents
}

export type SlotName = 'Button' | 'Link' | 'Code' | 'Icon' | 'Select' | 'Sidebar'

interface SlotMatch<P> {
  tier: Tier
  /** The props an item must declare to fill the slot by name. */
  requiredProps: ReadonlyArray<keyof P & string>
}

/** Where each slot's item is matched, and the props it must declare. */
export const SLOTS = {
  Button: { tier: 'primitives', requiredProps: ['children'] },
  Link: { tier: 'primitives', requiredProps: ['href', 'children'] },
  Code: { tier: 'primitives', requiredProps: ['children'] },
  Icon: { tier: 'primitives', requiredProps: ['name'] },
  Select: { tier: 'components', requiredProps: ['value', 'onValueChange', 'options'] },
  Sidebar: { tier: 'components', requiredProps: ['children'] },
} as const satisfies {
  Button: SlotMatch<ButtonSlotProps>
  Link: SlotMatch<LinkSlotProps>
  Code: SlotMatch<CodeSlotProps>
  Icon: SlotMatch<IconSlotProps>
  Select: SlotMatch<SelectSlotProps>
  Sidebar: SlotMatch<SidebarSlotProps>
}

/** The Sidebar's parts, matched as their own items when no Sidebar root is. */
export const SIDEBAR_MEMBERS = {
  Item: { tier: 'components', requiredProps: ['href', 'children'] },
  Section: { tier: 'components', requiredProps: ['title', 'children'] },
} as const satisfies { Item: SlotMatch<SidebarItemProps>; Section: SlotMatch<SidebarSectionProps> }
