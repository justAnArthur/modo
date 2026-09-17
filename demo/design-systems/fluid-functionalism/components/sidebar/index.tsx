import type { CSSProperties, ReactNode } from 'react'
import {
  Sidebar as FluidSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from './sidebar'

/**
 * Fluid Functionalism Sidebar — modo's Sidebar shell contract (Root with
 * children, plus static .Item and .Section members) implemented over the
 * @fluid sidebar compound: the provider's width/mobile-drawer machinery with
 * a non-collapsible column, scroll-faded SidebarContent, group labels, and
 * menu buttons with the fluid hover highlight that glides between rows.
 * Pulled via `bunx shadcn@latest add @fluid/sidebar`; this adapter is the
 * modo-shaped composition (the registry ships the compound parts, not this
 * Root/Item/Section API). Resolves the docs chrome's Sidebar slot by
 * interface matching.
 *
 * @example # Sections and items
 * The modo nav shape: sections with titled groups and anchor items.
 *
 * ```tsx
 * <Sidebar className="!min-h-0" style={{ maxWidth: 220 }}>
 *   <Sidebar.Section title="Foundations">
 *     <Sidebar.Item href="#colors" active>Colors</Sidebar.Item>
 *     <Sidebar.Item href="#surfaces">Surfaces</Sidebar.Item>
 *   </Sidebar.Section>
 *   <Sidebar.Section title="Components">
 *     <Sidebar.Item href="#button">Button</Sidebar.Item>
 *     <Sidebar.Item href="#select">Select</Sidebar.Item>
 *   </Sidebar.Section>
 * </Sidebar>
 * ```
 *
 * @example # Single group
 * ```tsx
 * <Sidebar className="!min-h-0" style={{ maxWidth: 180 }}>
 *   <Sidebar.Section title="Project">
 *     <Sidebar.Item href="#overview" active>Overview</Sidebar.Item>
 *     <Sidebar.Item href="#settings">Settings</Sidebar.Item>
 *   </Sidebar.Section>
 * </Sidebar>
 * ```
 */
export default function Sidebar({ children, className, style }: {
  /** Nav sections and items (Sidebar.Section / Sidebar.Item). */
  children?: ReactNode
  /** Class on the sidebar wrapper; pass a min-height override when embedding outside a full-height column. */
  className?: string
  /** Inline style on the sidebar wrapper (e.g. a maxWidth when embedding). */
  style?: CSSProperties
}) {
  return (
    <SidebarProvider persist={false} shortcut={null} className={className} style={style}>
      {/* modo's chrome owns the column (its aside already provides height,
          scrolling and a border), so the @fluid sidebar renders
          non-collapsible at the column's width. */}
      <FluidSidebar collapsible="none" bordered={false} style={{ width: '100%', height: 'auto' }}>
        <SidebarContent>{children}</SidebarContent>
      </FluidSidebar>
    </SidebarProvider>
  )
}

/* Declaration merging: the static members of the Sidebar compound. */
interface Sidebar {
  /** A nav anchor rendered as a @fluid menu button. */
  Item: typeof SidebarItem
  /** A titled group of nav items. */
  Section: typeof SidebarSection
}

function SidebarItem({ href, active = false, children }: {
  /** Navigation target. */
  href: string
  /** Marks the current page. */
  active?: boolean
  /** Item label. */
  children?: ReactNode
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active}>
          <a href={href}>{children}</a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function SidebarSection({ title, children }: {
  /** Group label. */
  title: string
  /** Sidebar.Item entries. */
  children?: ReactNode
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarGroupContent>{children}</SidebarGroupContent>
    </SidebarGroup>
  )
}

Sidebar.Item = SidebarItem
Sidebar.Section = SidebarSection
