// shared layout for every page in the docs site.
// wraps each page in <aside data-aui="sidebar"> (left), the content
// area (center), and <aside data-aui="panel"> (right).
//
// the content area is `<Elevated data-aui="content">` when the user
// has provided a `admin/components/elevated.tsx` convention file,
// otherwise the plain `<main data-aui="content">` fallback. the
// Elevated variant lets the user replace the content surface with
// their own surface-elevation primitive (or any React component).
//
// CSS is loaded via side-effect imports of the three virtual CSS modules:
// tokens, items, user overrides. Vite injects them in import order, so
// the order here is: tokens → items → user overrides (overrides win).

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import Panel from 'modo.panel'
import { SCRIPT as headScript } from 'modo.head'
import Elevated, { isProvided as elevatedIsProvided } from 'virtual:modo-elevated'
import { name as siteName, description as siteDescription } from 'virtual:config.loader'
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
      {/*
        blocking <script> at the top of <body>. inline scripts (no
        async/defer) block the parser — the browser pauses to execute
        this before any visible <body> content is parsed, so a
        stored theme/color-scheme is applied to <html> before the
        first paint. on client-side nav, the script stays in the DOM
        (React reuses the same <script> element via reconciliation)
        and the theme is already set, so no flash.
      */}
      <script dangerouslySetInnerHTML={{ __html: headScript }} />
      <aside data-aui="sidebar">
        <div data-aui="sidebar-header">
          <a href="/" data-aui="sidebar-brand">{siteName}</a>
        </div>
        <SidebarNav />
      </aside>

      {elevatedIsProvided ? (
        <Elevated data-aui="content">{children}</Elevated>
      ) : (
        <main data-aui="content">{children}</main>
      )}

      <aside data-aui="panel">
        <Panel />
      </aside>
    </div>
  )
}
