// shared layout for every page in the docs site.
// wraps each page in <aside data-aui="sidebar"> (left) and
// <main data-aui="content"> (center).
//
// CSS is loaded via side-effect imports of the three virtual CSS modules:
// tokens, items, user overrides. Vite injects them in import order, so
// the order here is: tokens → items → user overrides (overrides win).

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import Panel from 'modo.panel'
import { name as siteName, description as siteDescription } from 'virtual:modo-config'
import { useConfig } from 'vike-react/useConfig'
import { SidebarNav } from '../sidebar-nav'
import '../styles/base.css'
import './+Layout.css'
import 'virtual:modo-tokens-css'
import 'virtual:modo-items-css'
import 'virtual:modo-user-css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // set the page title + description from the user's modo.config.ts.
  // the +config.ts static fallback is overridden here so the rendered
  // HTML matches the project name, not the lib's name. called once
  // in useEffect — invoking useConfig's returned setter on every
  // render causes applyHead() to thrash document.title during client
  // navigation, which breaks vike-react's <a> interception on some
  // browsers. useEffect is the safe pattern.
  const setConfig = useConfig()
  useEffect(() => {
    setConfig({
      title: siteName,
      description: siteDescription || undefined,
    })
  }, [siteName, siteDescription, setConfig])
  return (
    <div data-aui="app">
      <aside data-aui="sidebar">
        <div data-aui="sidebar-header">
          <a href="/" data-aui="sidebar-brand">{siteName}</a>
        </div>
        <SidebarNav />
      </aside>
      <main data-aui="content">
        {children}
      </main>
      <aside data-aui="panel">
        <Panel />
      </aside>
    </div>
  )
}
