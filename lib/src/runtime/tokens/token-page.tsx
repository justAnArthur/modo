import type { CSSProperties, ReactElement } from 'react'
import { tokens as groups } from 'virtual:modo-tokens'
import type { Group, Swatch } from '../../lib/css'

export function TokenGroupView({ group }: { group: string }) {
  const g = groups.find(gg => gg.name === group)
  if (!g) {
    return (
      <article>
        <h1 data-modo="page-title">Tokens / {group}</h1>
        <p data-modo="page-lead">No tokens found for group "{group}".</p>
      </article>
    )
  }
  const isColors = g.name === 'colors'
  return (
    <article>
      <header>
        <p data-modo="page-eyebrow">Tokens</p>
        <h1 data-modo="page-title">{g.name}</h1>
        <p data-modo="page-lead">{g.vars.length} variables</p>
      </header>
      <section data-modo="section">
        <div data-modo={isColors ? 'token-grid' : 'token-list'}>
          {g.vars.map(v => (
            <SwatchCard key={v.name} v={v} isColor={isColors} />
          ))}
        </div>
      </section>
    </article>
  )
}

function SwatchCard({ v, isColor }: { v: Group['vars'][number]; isColor: boolean }) {
  const sw = v.swatch
  return (
    <div data-modo={isColor ? 'token-card' : 'token-row'}>
      <div data-modo="token-name">
        {/* The browser resolves the var itself, so light-dark(), color-mix()
            and var() chains show the color the page actually uses. */}
        {isColor ? (
          <span data-modo="swatch" data-kind="color" style={{ background: `var(${v.name})` }} />
        ) : (
          <Swatch sw={sw} />
        )}
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
function Swatch({ sw }: { sw?: Swatch }): ReactElement | null {
  if (!sw) return null
  const box = (style?: CSSProperties) => <span data-modo="swatch" data-kind={sw.kind} style={style} />
  const text = (style: CSSProperties) => (
    <span data-modo="swatch" data-kind={sw.kind} style={style}>
      Aa
    </span>
  )
  switch (sw.kind) {
    case 'color':
      return box({ background: sw.hex })
    case 'length':
      return box({ width: Math.min(sw.px, 80) })
    case 'duration':
      return box()
    case 'font-family':
      return text({ fontFamily: sw.family })
    case 'font-size':
      return text({ fontSize: sw.px })
  }
}

function meta(sw: Swatch): string {
  switch (sw.kind) {
    case 'color':
      return sw.hex
    case 'length':
      return `${sw.px}px`
    case 'duration':
      return `${sw.ms}ms`
    case 'font-family':
      return sw.family
    case 'font-size':
      return `${sw.px}px`
  }
}
