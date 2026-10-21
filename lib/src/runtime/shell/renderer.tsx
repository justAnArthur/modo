import { config } from 'virtual:modo-config'
import { panelItems, shell } from 'virtual:modo-shell'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import { SidebarNav } from '../nav'
import { usePath, withBase } from '../router'
import { Toc } from './toc'

const NAV_ID = 'modo-nav'

export function Shell({ children }: { children: ReactNode }) {
  const { Root, Section } = shell.Sidebar
  const nav = useDrawer()
  return (
    <div data-modo="app">
      <MobileBar open={nav.open} onToggle={nav.toggle} toggleRef={nav.toggleRef} />

      <aside data-modo="sidebar" id={NAV_ID} data-open={nav.open || undefined}>
        <Root>
          <SidebarNav />
        </Root>
      </aside>
      {nav.open ? <div data-modo="sidebar-scrim" aria-hidden onClick={nav.close} /> : null}

      <main data-modo="content">{children}</main>

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

/** Below md the nav is a drawer (shell.css): it closes on navigation, on the scrim and on Escape. */
function useDrawer() {
  const path = usePath()
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLSpanElement>(null)

  useEffect(() => setOpen(false), [path])

  useEffect(() => {
    if (!open) return
    document.querySelector<HTMLElement>(`#${NAV_ID} a`)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.querySelector('button')?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return { open, toggleRef, toggle: () => setOpen(o => !o), close: () => setOpen(false) }
}

/** The phone header (hidden from md up): the nav toggle and the site's name. */
function MobileBar({
  open,
  onToggle,
  toggleRef,
}: {
  open: boolean
  onToggle: () => void
  toggleRef: RefObject<HTMLSpanElement>
}) {
  const { Button, Icon, Link } = shell
  const label = open ? 'Close navigation' : 'Open navigation'
  return (
    <header data-modo="mobile-bar">
      {/* The host Button may not forward a ref; its wrapper finds it for focus return. */}
      <span data-modo="mobile-bar-toggle" ref={toggleRef}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-expanded={open}
          aria-controls={NAV_ID}
          onClick={onToggle}
        >
          <Icon name={open ? 'close' : 'menu'} label={label} />
        </Button>
      </span>
      <span data-modo="mobile-bar-title">
        <Link href={withBase('/')}>{config.name}</Link>
      </span>
    </header>
  )
}
