import type { ReactNode } from 'react'
import { shell } from 'virtual:modo-shell'
import { SidebarNav } from '../nav'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div data-aui="app">
      <aside data-aui="sidebar">
        <shell.Sidebar.Root>
          <SidebarNav />
        </shell.Sidebar.Root>
      </aside>
      {children}
      <aside data-aui="panel">
        <shell.Panel>{null}</shell.Panel>
      </aside>
    </div>
  )
}
