import type { ReactNode } from 'react'
import { shell, panelItems } from 'virtual:modo-shell'
import { SidebarNav } from '../nav'

export function Shell({ children }: { children: ReactNode }) {
  const { Root, Section } = shell.Sidebar
  return (
    <div data-modo="app">
      <aside data-modo="sidebar">
        <Root>
          <SidebarNav />
        </Root>
      </aside>
      {children}
      <aside data-modo="panel">
        <Root>
          {panelItems.map((it) => (
            <Section key={it.bundlePath} title={it.label}>
              <it.Component shell={shell} />
            </Section>
          ))}
        </Root>
      </aside>
    </div>
  )
}
