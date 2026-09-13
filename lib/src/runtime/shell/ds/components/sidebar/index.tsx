import type { ReactNode } from 'react'
import './sidebar.css'

function SidebarRoot({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <nav data-aui="shell-sidebar" className={className}>
      {children}
    </nav>
  )
}

function SidebarItem({ href, active, children, className }: { href: string; active?: boolean; children?: ReactNode; className?: string }) {
  return (
    <a
      data-aui="shell-sidebar-item"
      data-active={active ? 'true' : undefined}
      href={href}
      className={className}
    >
      {children}
    </a>
  )
}

function SidebarSection({ title, children, className }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div data-aui="shell-sidebar-section" className={className}>
      <h3 data-aui="shell-sidebar-section-title">{title}</h3>
      <div data-aui="shell-sidebar-section-items">{children}</div>
    </div>
  )
}

const Sidebar = Object.assign(SidebarRoot, {
  Item: SidebarItem,
  Section: SidebarSection,
})

export default Sidebar
