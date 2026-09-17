import './sidebar.css'

/**
 * Navigation sidebar. Compound component: Root + `Sidebar.Item` + `Sidebar.Section`.
 * The docs chrome inherits it — the nav on the left side of this site is this component.
 *
 * @example # Sections and items
 * <Sidebar>
 *   <Sidebar.Section title="Foundations">
 *     <Sidebar.Item href="#colors">Colors</Sidebar.Item>
 *     <Sidebar.Item href="#spacing" active>Spacing</Sidebar.Item>
 *   </Sidebar.Section>
 *   <Sidebar.Section title="Components">
 *     <Sidebar.Item href="#button">Button</Sidebar.Item>
 *   </Sidebar.Section>
 * </Sidebar>
 */
export default function Sidebar({ children }: { children?: React.ReactNode }) {
  return <nav className="my-sidebar">{children}</nav>
}

function SidebarItem({
  href,
  active,
  children,
}: {
  /** Target anchor. */
  href: string
  /** Marks the current page. */
  active?: boolean
  /** Link label. */
  children?: React.ReactNode
}) {
  return (
    <a href={href} data-active={active ? 'true' : undefined} className="my-sidebar-item">
      {children}
    </a>
  )
}

function SidebarSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="my-sidebar-section">
      <h3 className="my-sidebar-section-title">{title}</h3>
      <div className="my-sidebar-section-items">{children}</div>
    </div>
  )
}

interface Sidebar {
  /** A nav link. */
  Item: typeof SidebarItem
  /** A titled group of links. */
  Section: typeof SidebarSection
}

Sidebar.Item = SidebarItem
Sidebar.Section = SidebarSection
