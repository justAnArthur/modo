import type { CSSProperties, ReactElement } from 'react'
import { tokens as groups } from 'virtual:modo-tokens'
import type { Group, Swatch } from '../../lib/css'

const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }
const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }

const swatchStyles = {
  card: {
    border: '1px solid var(--border, #e4e4e7)',
    borderRadius: 'var(--radius-md, 6px)',
    padding: 'var(--space-3, 12px)',
    background: 'var(--background, #fafafa)',
  },
  row: {
    border: '1px solid var(--border, #e4e4e7)',
    borderRadius: 'var(--radius-sm, 4px)',
    padding: 'var(--space-2, 8px) var(--space-3, 12px)',
  },
  muted: { color: 'var(--muted-foreground, #71717a)', fontSize: '0.75rem' },
}

export function TokenGroupView({ group }: { group: string }) {
  const g = groups.find((gg) => gg.name === group)
  if (!g) {
    return (
      <article>
        <h1 data-aui="page-title">Tokens / {group}</h1>
        <p data-aui="page-lead">No tokens found for group "{group}".</p>
      </article>
    )
  }
  const isColors = g.name === 'colors'
  return (
    <article>
      <header>
        <h1 data-aui="page-title">Tokens / {g.name}</h1>
        <p data-aui="page-lead">{g.vars.length} variables</p>
      </header>
      <section data-aui="section" style={isColors ? grid : stack}>
        {g.vars.map((v) => <SwatchCard key={v.name} v={v} />)}
      </section>
    </article>
  )
}

function SwatchCard({ v }: { v: Group['vars'][number] }) {
  const sw = v.swatch
  const card = sw?.kind === 'color' ? swatchStyles.card : swatchStyles.row
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Swatch sw={sw} />
        <code style={{ fontSize: '0.8125rem' }}>{v.name}</code>
      </div>
      <div style={{ ...swatchStyles.muted, marginTop: 4 }}>
        <code>{v.value}</code>
        {sw ? <span> · {meta(sw)}</span> : null}
      </div>
    </div>
  )
}

function Swatch({ sw }: { sw?: Swatch }): ReactElement | null {
  if (!sw) return null
  const base = {
    display: 'inline-block',
    border: '1px solid var(--border, #e4e4e7)',
    borderRadius: 'var(--radius-sm, 4px)',
  }
  const box = (style: CSSProperties) => <span data-aui="swatch" style={{ ...base, ...style }} />
  const text = (style: CSSProperties) => <span data-aui="swatch" style={{ ...base, padding: '0 6px', ...style }}>Aa</span>
  switch (sw.kind) {
    case 'color': return box({ width: 24, height: 24, background: sw.hex })
    case 'length': return box({ width: Math.min(sw.px, 80), height: 8, background: 'var(--accent, #3b82f6)' })
    case 'duration': return box({ width: 24, height: 24, background: 'var(--accent, #3b82f6)' })
    case 'font-family': return text({ fontFamily: sw.family })
    case 'font-size': return text({ fontSize: sw.px })
  }
}

function meta(sw: Swatch): string {
  switch (sw.kind) {
    case 'color': return sw.hex
    case 'length': return `${sw.px}px`
    case 'duration': return `${sw.ms}ms`
    case 'font-family': return sw.family
    case 'font-size': return `${sw.px}px`
  }
}
