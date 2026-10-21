import { type CSSProperties, type ReactElement, type ReactNode, useSyncExternalStore } from 'react'
import type { Group, Swatch } from '../../lib/css'
import { Heading } from '../anchor'

export type Var = Group['vars'][number]

/** Token files declare light and dark blocks; the first declaration (`:root`)
    names the token, the live cascade decides what it renders as. */
export function declared(vars: Var[]): Var[] {
  return vars.filter((v, i) => vars.findIndex(w => w.name === v.name) === i)
}

// A host switches theme through <html> (a class, an attribute, an inline
// style) or follows the OS; either way the token views render again.
const dark = typeof matchMedia === 'undefined' ? undefined : matchMedia('(prefers-color-scheme: dark)')

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true })
  dark?.addEventListener('change', onChange)
  return () => {
    observer.disconnect()
    dark?.removeEventListener('change', onChange)
  }
}

function themeSnapshot(): string {
  const attrs = [...document.documentElement.attributes].map(a => `${a.name}=${a.value}`)
  return `${attrs.join(' ')} ${dark?.matches}`
}

/** Renders the caller again when the host switches theme, so live values are read anew. */
export function useTheme(): void {
  useSyncExternalStore(subscribeTheme, themeSnapshot, () => '')
}

/** Smallest first, by the length each token resolves to on the page (a host
    theme can override the file's value, or write it as calc(), min(), var());
    the file's own value where the page gives none, else last. */
export function byLength(vars: Var[]): Var[] {
  const declaredPx = (v: Var) =>
    v.swatch?.kind === 'length' || v.swatch?.kind === 'font-size' ? v.swatch.px : Infinity
  const px = (v: Var) => {
    const live = resolvedPx(v.name)
    return live === Infinity ? declaredPx(v) : live
  }
  const order = new Map(vars.map(v => [v, px(v)]))
  return [...vars].sort((a, b) => order.get(a)! - order.get(b)!)
}

/** The token as the page lays it out, in px (Infinity when it is no length). */
function resolvedPx(name: string): number {
  if (typeof document === 'undefined') return Infinity
  // An invalid var() makes the whole width `auto` (0 on an empty absolute box),
  // so the offset tells a resolved 0 from no length at all.
  const OFFSET = 100_000
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;width:calc(var(${name}) + ${OFFSET}px)`
  document.body.append(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width >= OFFSET / 2 ? width - OFFSET : Infinity
}

/** A titled part of a token page, anchored so the TOC lists it. */
export function TokenSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-modo="section">
      <Heading level={2} label={title} modo="section-title" />
      {children}
    </section>
  )
}

/** The tokens a page's own views don't cover, as plain rows. */
export function OtherTokens({ vars }: { vars: Var[] }) {
  if (vars.length === 0) return null
  return (
    <TokenSection title="Other">
      <TokenList vars={vars} />
    </TokenSection>
  )
}

function TokenList({ vars }: { vars: Var[] }) {
  return (
    <div data-modo="token-list">
      {vars.map(v => (
        <TokenRow key={v.name} v={v} />
      ))}
    </div>
  )
}

/** A token's name over its value, beside or under its specimen. */
export function TokenLabel({ v, children }: { v: Var; children?: ReactNode }) {
  return (
    <div data-modo="token-label">
      <code>{v.name}</code>
      <span data-modo="token-meta">
        {v.value}
        {children}
      </span>
    </div>
  )
}

function TokenRow({ v }: { v: Var }) {
  const sw = v.swatch
  return (
    <div data-modo="token-row">
      <div data-modo="token-name">
        <TokenSwatch sw={sw} />
        <code>{v.name}</code>
      </div>
      <div data-modo="token-meta">
        <code>{v.value}</code>
        {sw ? <span> · {meta(sw)}</span> : null}
      </div>
    </div>
  )
}

// Only the token's own value is inline; the frame is [data-modo="swatch"] CSS.
function TokenSwatch({ sw }: { sw?: Swatch }): ReactElement | null {
  if (!sw) return null
  const box = (style?: CSSProperties) => <span data-modo="swatch" data-kind={sw.kind} style={style} />
  const text = (style: CSSProperties) => (
    <span data-modo="swatch" data-kind={sw.kind} style={style}>
      Aa
    </span>
  )
  switch (sw.kind) {
    case 'length':
      return box({ width: Math.min(sw.px, 80) })
    case 'duration':
      return box()
    case 'font-family':
      return text({ fontFamily: sw.family })
    case 'font-size':
      return text({ fontSize: sw.px })
    case 'font-weight':
      return text(sw.value.includes('"wght"') ? { fontVariationSettings: sw.value } : { fontWeight: sw.value })
  }
}

function meta(sw: Swatch): string {
  switch (sw.kind) {
    case 'length':
      return `${sw.px}px`
    case 'duration':
      return `${sw.ms}ms`
    case 'font-family':
      return sw.family
    case 'font-size':
      return `${sw.px}px`
    case 'font-weight':
      return sw.value
  }
}
