/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-core.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { defaultShortcut, useSidebar } from './sidebar-context'

/** Who answers a keypress when focus is on the page rather than in a provider. */
export type SidebarShortcutScope = 'nearest' | 'page'

interface MountedProvider {
  el: HTMLElement
  key: string | null
  scope: SidebarShortcutScope
}

// The listener is global (the key works without focus in the sidebar), but
// only one provider may answer a keypress. Mount order can't decide it: a
// persistent app-shell provider mounts once while demos mount later on
// navigation.
const mounted: MountedProvider[] = []

const outermost = (list: MountedProvider[]) => list.filter(p => !list.some(o => o !== p && o.el.contains(p.el)))

/**
 * The provider that answers `key` pressed on `target`:
 * - focus on an element that wraps providers (a docs preview frame holding
 *   keyboard scope for its demo, or `<body>`): the outermost wrapped one;
 * - focus inside providers: the innermost one holding it (an app shell
 *   wrapping doc previews);
 * - focus elsewhere: the outermost one.
 * Among several outermost, a `page`-scoped provider wins, else the first.
 */
function answering(target: HTMLElement, key: string) {
  const own = mounted.filter(p => p.key === key)
  const wrapped = own.filter(p => target.contains(p.el))
  if (wrapped.length === 0) {
    const holding = own.filter(p => p.el.contains(target))
    const innermost = holding.find(p => !holding.some(o => o !== p && p.el.contains(o.el)))
    if (innermost) return innermost.el
  }
  const candidates = outermost(wrapped.length > 0 ? wrapped : own)
  return (candidates.find(p => p.scope === 'page') ?? candidates[0])?.el
}

/** Binds the provider's bare toggle key, skipped while typing and with a modifier held (⌘[ / ⌘] keep their browser meaning). */
export function useSidebarShortcut(
  root: RefObject<HTMLElement | null>,
  shortcut: string | null,
  scope: SidebarShortcutScope,
  toggle: () => void,
) {
  const key = shortcut?.toLowerCase() ?? null
  const entry = useRef<MountedProvider | null>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const self = { el, key, scope }
    entry.current = self
    mounted.push(self)
    return () => {
      mounted.splice(mounted.indexOf(self), 1)
    }
  }, [root, key, scope])

  useEffect(() => {
    if (key == null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select') || target.isContentEditable) return
      if (answering(target, key) !== entry.current?.el) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, toggle])
}

/** The toggle keystroke the tooltips show: the side's default even when the binding is off. */
export function useShortcutKey(): string {
  const { side, shortcut } = useSidebar()
  return shortcut ?? defaultShortcut(side)
}

/** Keystroke chip inside the (inverted) tooltip surface. */
export function ShortcutKbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="-my-1 flex h-4 min-w-4 items-center justify-center rounded border border-background/30 px-1 font-sans text-micro-compact text-background/80">
      {children}
    </kbd>
  )
}
