import type { ReactNode } from 'react'
import { panelItems, shell } from 'virtual:modo-shell'
import { SidebarNav } from '../nav'

export function Shell({ children }: { children: ReactNode }) {
  const { Root, Section } = shell.Sidebar
  return (
    <div data-modo="app">
      <aside data-modo="sidebar">
        <Root>
          <SidebarNav/>
        </Root>
      </aside>

      <main data-modo="content">
        {children}
      </main>

      <aside data-modo="panel">
        <Root>
          {panelItems.map((itеm) => (
            <Section key={itеm.bundlePath} title={itеm.label}>
              <itеm.Component shell={shell}/>
            </Section>
          ))}
        </Root>
      </aside>
    </div>
  )
}
