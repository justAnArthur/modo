import type { ComponentType, MouseEvent, ReactNode } from 'react'
import type { Tier } from './tiers'

/** The icons the chrome asks for, plus any `socials` key (`github`, `npm`, …). */
export type IconName =
  | 'code'
  | 'copy'
  | 'check'
  | 'link'
  | 'maximize'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | (string & {})

/** The chrome's icon buttons: copy code, show code, open full screen, theme toggle, menu, canvas zoom. */
export interface ButtonSlotProps {
  variant: 'ghost'
  size: 'icon-sm'
  'aria-label': string
  /** Set on toggles (show code, menu). */
  'aria-pressed'?: boolean
  /** Forward the event: Open full screen opens a new tab on a modified click. */
  onClick: (event?: MouseEvent<HTMLElement>) => void
  /** Set on Open full screen: a middle click opens a new tab. */
  onAuxClick?: (event: MouseEvent<HTMLElement>) => void
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
  /** The heading this option sits under: ungrouped options first, then each group in first-seen order. A Select that ignores it shows a flat list. */
  group?: string
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

/** The viewport corner the site view's switcher sits in; the lib places it there and moves it when dragged. */
export type SiteCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

/** One page the site view's switcher lists. */
export interface SiteSwitcherPage {
  /** The item's folder name under `pages/`. */
  id: string
  title: string
  /** The page's `/site/<id>` url, base included. */
  href: string
  /** The page on screen. */
  current: boolean
}

/** A `panel.items` entry, rendered: its label and its component, handed `shell`. */
export interface SiteSwitcherSection {
  label: string
  content: ReactNode
}

export interface SiteSwitcherLink {
  label: string
  /** Base included. */
  href: string
}

/**
 * The site view's page switcher (`/site`): a trigger and the menu it opens. The lib draws the
 * fixed box around it, in `corner`, and drags that box to another corner; a press that ends a drag
 * never reaches the trigger, so the slot only opens and closes its menu.
 */
export interface SiteSwitcherSlotProps {
  /** The site's name (`config.name`). */
  name: string
  /** The site's mark: the `logo` component or image; undefined when there is none. */
  logo?: ReactNode
  /** The pages to switch between, in menu order (`pages.primary`, else nav order). */
  pages: SiteSwitcherPage[]
  /** The title of the page on screen, listed or not; undefined when the id names no page. */
  current?: string
  /** The `panel.items`, in order (a brand or theme switcher). */
  sections: SiteSwitcherSection[]
  /** The way back out of the site view: Docs, Canvas. */
  links: SiteSwitcherLink[]
  /** Where the trigger sits: open the menu away from the edges. */
  corner: SiteCorner
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
  SiteSwitcher: ComponentType<SiteSwitcherSlotProps>
}

/** The props of a `panel.items[].component`. */
export interface PanelItemProps {
  shell: ShellComponents
}

export type SlotName = 'Button' | 'Link' | 'Code' | 'Icon' | 'Select' | 'Sidebar' | 'SiteSwitcher'

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
  SiteSwitcher: { tier: 'components', requiredProps: ['pages', 'sections'] },
} as const satisfies {
  Button: SlotMatch<ButtonSlotProps>
  Link: SlotMatch<LinkSlotProps>
  Code: SlotMatch<CodeSlotProps>
  Icon: SlotMatch<IconSlotProps>
  Select: SlotMatch<SelectSlotProps>
  Sidebar: SlotMatch<SidebarSlotProps>
  SiteSwitcher: SlotMatch<SiteSwitcherSlotProps>
}

/** The Sidebar's parts, matched as their own items when no Sidebar root is. */
export const SIDEBAR_MEMBERS = {
  Item: { tier: 'components', requiredProps: ['href', 'children'] },
  Section: { tier: 'components', requiredProps: ['title', 'children'] },
} as const satisfies { Item: SlotMatch<SidebarItemProps>; Section: SlotMatch<SidebarSectionProps> }
