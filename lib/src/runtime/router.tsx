import { useEffect, useState, type ReactNode } from 'react'
import { routes } from './routes'
import { NotFoundPage } from './pages/NotFoundPage'

export function Router(): ReactNode {
  const [path, setPath] = useState(() => window.location.pathname || '/')

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/')
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/')) return
      if (a.target && a.target !== '_self') return
      e.preventDefault()
      window.history.pushState({}, '', href)
      setPath(href)
    }
    window.addEventListener('popstate', onPop)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('click', onClick)
    }
  }, [])

  for (const r of routes) {
    const m = path.match(r.pattern)
    if (m) return r.render(m)
  }
  return <NotFoundPage />
}
