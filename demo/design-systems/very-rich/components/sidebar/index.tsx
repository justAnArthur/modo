import './sidebar.css'

/**
 * Compound navigation column. `Sidebar.Item` and `Sidebar.Section` attach as
 * static properties on the default export so consumers can write
 * `<Sidebar.Item href="…">…</Sidebar.Item>`.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Sidebar>
 *   <Sidebar.Section title="Guides">
 *     <Sidebar.Item href="/docs/intro">Intro</Sidebar.Item>
 *     <Sidebar.Item href="/docs/install">Install</Sidebar.Item>
 *   </Sidebar.Section>
 * </Sidebar>
 * ```
 *
 * @example
 * # Active item
 *
 * Pass `active` to highlight the current page.
 *
 * ```tsx
 * <Sidebar.Item href="/docs/intro" active>Intro</Sidebar.Item>
 * ```
 */
function Sidebar({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="my-sidebar" data-modo="sidebar">
      {children}
    </aside>
  )
}

function SidebarItem({
  href,
  active,
  children,
}: {
  /** Target URL. */
  href: string
  /** Marks the current page. @default false */
  active?: boolean
  /** Link text. */
  children?: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={active ? 'my-sidebar-item active' : 'my-sidebar-item'}
      data-modo="sidebar-link"
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </a>
  )
}

function SidebarSection({
  title,
  children,
}: {
  /** Section heading. */
  title: string
  /** Items in the section. */
  children?: React.ReactNode
}) {
  return (
    <section className="my-sidebar-section" data-modo="sidebar-section">
      <h3 className="my-sidebar-section-title">{title}</h3>
      {children}
    </section>
  )
}

Sidebar.Item = SidebarItem
Sidebar.Section = SidebarSection

export default Sidebar
