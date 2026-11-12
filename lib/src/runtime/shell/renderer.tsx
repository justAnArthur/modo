import { config } from 'virtual:modo-config'
import { panelItems, shell } from 'virtual:modo-shell'
import { type ReactNode, useEffect, useState } from 'react'
import { Markdown } from '../markdown'
import { SidebarNav } from '../nav'
import { usePath } from '../router'
import { Header } from './header'
import { Toc } from './toc'

export function Shell({ children }: { children: ReactNode }) {
  const { Root, Section } = shell.Sidebar
  const path = usePath()
  // Below md the nav folds under the header; a navigation folds it again.
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [path])
  return (
    <div data-modo="app">
      <aside data-modo="sidebar" data-open={menuOpen || undefined}>
        <Header menuOpen={menuOpen} onMenu={() => setMenuOpen(o => !o)} />
        <Root>
          <SidebarNav />
        </Root>
      </aside>

      <main data-modo="content">
        {children}
        {config.footer ? (
          <footer data-modo="footer">
            <Markdown source={config.footer} />
          </footer>
        ) : null}
      </main>

      <aside data-modo="panel">
        <Root>
          <Toc />
          {panelItems.map((item, i) => (
            <Section key={`${i}-${item.label}`} title={item.label}>
              <item.Component shell={shell} />
            </Section>
          ))}
        </Root>
      </aside>
    </div>
  )
}
