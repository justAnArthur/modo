import type { SiteConfig, ThemeConfig } from './schema'

/** One page's `<head>` entries. `path` is the app path without the base (`docs/primitives/button`, `''` for home). */
export interface PageHead {
  path: string
  title?: string
  /** Markdown; its first paragraph, as plain text, becomes the meta description. */
  description?: string
}

const OPEN = '<!--modo:head-->'
const CLOSE = '<!--/modo:head-->'

/** The per-page tags between markers, so each emitted route can swap them. */
export function headTags(site: SiteConfig, page: PageHead): string {
  const title = page.title ? `${page.title} · ${site.name}` : site.name
  const description = plainText(page.description ?? '') || site.description
  const url = site.url && new URL(page.path ? `${page.path}/` : '', site.url.replace(/\/?$/, '/')).href
  const tags = [
    `<title>${esc(title)}</title>`,
    description && `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    description && `<meta property="og:description" content="${esc(description)}" />`,
    url && `<meta property="og:url" content="${esc(url)}" />`,
    url && `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ]
  return [OPEN, ...tags.filter(Boolean), CLOSE].join('\n    ')
}

/** Replaces the marked block (or the bare `<title>` of the runtime's index.html) with `tags`. */
export function withHead(html: string, tags: string): string {
  const marked = new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}`)
  return marked.test(html) ? html.replace(marked, tags) : html.replace(/<title>[\s\S]*?<\/title>/, tags)
}

/** The first paragraph of Markdown as one plain line, cut near 160 characters. */
export function plainText(md: string): string {
  const text = (md.trim().split(/\n\s*\n/)[0] ?? '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, '')}…` : text
}

/**
 * Runs before first paint: applies the stored theme (else the OS one) and exposes
 * `window.__modoTheme` for the header toggle, which fires `modo:themechange`.
 */
export function themeScript(theme: ThemeConfig): string {
  const { attribute = 'class', dark = 'dark', light } = theme
  return `<script>(() => {
  const KEY = 'modo-theme', root = document.documentElement
  const cfg = ${JSON.stringify({ attribute, dark, light: light ?? null })}
  const apply = mode => {
    const value = mode === 'dark' ? cfg.dark : cfg.light
    if (cfg.attribute === 'class') {
      root.classList.remove(cfg.dark)
      if (cfg.light) root.classList.remove(cfg.light)
      if (value) root.classList.add(value)
    } else if (value) root.setAttribute(cfg.attribute, value)
    else root.removeAttribute(cfg.attribute)
    root.style.colorScheme = mode
  }
  let mode
  try { mode = localStorage.getItem(KEY) } catch {}
  if (mode !== 'dark' && mode !== 'light') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  apply(mode)
  window.__modoTheme = {
    get: () => mode,
    set: next => {
      mode = next
      apply(mode)
      try { localStorage.setItem(KEY, mode) } catch {}
      window.dispatchEvent(new Event('modo:themechange'))
    },
  }
})()</script>`
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}
