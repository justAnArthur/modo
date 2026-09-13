import type { ReactNode } from 'react'
import { shell, panelItems } from 'virtual:modo-shell'
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
        <shell.Panel>
          {panelItems.map((it) => (
            <PanelItem key={it.bundlePath} item={it} />
          ))}
        </shell.Panel>
      </aside>
    </div>
  )
}

function PanelItem({ item }: { item: (typeof panelItems)[number] }) {
  const LabelComp = shell.primitives[item.label]
  return (
    <section data-aui="panel-item">
      {LabelComp ? <LabelComp>{item.label}</LabelComp> : <span>{item.label}</span>}
      <item.Component />
    </section>
  )
}
