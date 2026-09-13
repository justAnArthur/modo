import './sidebar.css'

function SidebarRoot({ children }: { children?: React.ReactNode }) {
  return <nav className="my-sidebar">{children}</nav>
}

function SidebarItem({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
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

const Sidebar = Object.assign(SidebarRoot, {
  Item: SidebarItem,
  Section: SidebarSection,
})

export default Sidebar
