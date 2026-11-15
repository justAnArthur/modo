import { config } from 'virtual:modo-config'
import { panelItems, shell } from 'virtual:modo-shell'
import { type ReactNode, useEffect, useState } from 'react'
import { usePath } from '../location'
import { Markdown } from '../markdown'
import { SidebarNav } from '../nav'
import { Header } from './header'
import { Toc } from './toc'

export function Shell({ children }: { children: ReactNode }) {
  const { Root, Section } = shell.Sidebar
  const path = usePath()
  // Below md the nav is a drawer under the header; a navigation closes it.
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [path])
  useDrawerFocus(menuOpen, setMenuOpen)
  return (
    <div data-modo="app">
      <aside data-modo="sidebar" data-open={menuOpen || undefined}>
        <Header menuOpen={menuOpen} onMenu={() => setMenuOpen(o => !o)} />
        <Root>
          <SidebarNav />
        </Root>
      </aside>
      {menuOpen ? <div data-modo="sidebar-scrim" aria-hidden onClick={() => setMenuOpen(false)} /> : null}

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

/** An open drawer takes focus to its first link; Escape closes it and returns focus to the toggle. */
function useDrawerFocus(open: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return
    document.querySelector<HTMLElement>('[data-modo="sidebar-nav"] a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      // The host Button may not forward a ref; its wrapper finds it.
      document.querySelector<HTMLElement>('[data-modo="menu-toggle"] button')?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])
}
