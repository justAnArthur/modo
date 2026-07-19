// home page. renders every token group + every item. structured data
// comes from the source plugin via virtual:modo-items + virtual:modo-tokens;
// the actual swatch/ladder/scale markup lives in components/token-renderers
// and is shared with the per-group pages.

import { tokens, errors as tokensErrors } from 'virtual:modo-tokens'
import { items, byId, components as itemComponents, examples as itemExamples } from 'virtual:modo-items'
import { config as siteConfig } from 'virtual:modo-config'
import { ExampleBlock } from '../../components/example-renderer'
import {
  ColorSwatchGrid,
  SurfacesLadder,
  TypographyScale,
  SpacingScale,
  RadiusScale,
  MotionScale,
} from '../../components/token-renderers'

type Item = (typeof items)[number]
type Tokens = typeof tokens

function ExampleCard({ name, children, code }: { name: string; children: React.ReactNode; code?: string }) {
  return (
    <div data-aui="example-card">
      <div data-aui="example-card-stage">{children}</div>
      <span data-aui="example-card-name">{name}</span>
      {code && <code style={{ fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{code}</code>}
    </div>
  )
}

function PropTable({ props }: { props: ReadonlyArray<{ name: string; type: string; values?: readonly string[]; default?: unknown; description?: string }> }) {
  if (!props.length) return null
  return (
    <table data-aui="prop-table">
      <thead>
        <tr>
          <th>prop</th>
          <th>type</th>
          <th>default</th>
          <th>values</th>
          <th>description</th>
        </tr>
      </thead>
      <tbody>
        {props.map((p) => (
          <tr key={p.name}>
            <td>{p.name}</td>
            <td>{p.type}</td>
            <td>{p.default !== undefined ? String(p.default) : '—'}</td>
            <td>{p.values ? p.values.join(' · ') : '—'}</td>
            <td>{p.description ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ItemSection({ item }: { item: Item }) {
  const key = `${item.category}/${item.id}`
  const Component = itemComponents[key]
  if (!Component) {
    return (
      <section data-aui="section">
        <h2 data-aui="section-title">{key}</h2>
        <div data-aui="errors">no component for {key}</div>
      </section>
    )
  }
  const parsed = byId[key]
  const meta = parsed ?? { name: item.id, description: '' }
  const propDefs = parsed?.props ?? []
  const examples = parsed?.examples ?? []
  const compiledBodies = itemExamples[key] ?? {}

  return (
    <section data-aui="section">
      <h2 data-aui="section-title">{item.category} / {item.id}</h2>
      <p style={{ color: 'var(--muted-foreground)', margin: '0 0 16px' }}>
        <strong style={{ color: 'var(--foreground)' }}>{meta.name}</strong>
        {meta.description && <> — {meta.description}</>}
      </p>
      <div data-aui="examples">
        {examples.map((ex: any, i: number) => (
          <ExampleBlock
            key={i}
            example={ex}
            componentName={meta.name}
            Component={Component}
            compiledBody={compiledBodies[i]}
          />
        ))}
      </div>
      {propDefs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
            props
          </h3>
          <PropTable props={propDefs} />
        </div>
      )}
      {item.errors.length > 0 && (
        <div data-aui="errors" style={{ marginTop: 12 }}>{item.errors.join('\n')}</div>
      )}
    </section>
  )
}

function TokenSection({ group, name, children }: { group: string; name: string; children: React.ReactNode }) {
  return (
    <section data-aui="section">
      <h2 data-aui="section-title">{name}</h2>
      <p style={{ color: 'var(--muted-foreground)', margin: '0 0 16px', fontSize: 12 }}>
        {String((tokens as any)[group]?.description ?? '')}
      </p>
      {children}
    </section>
  )
}

export default function Page() {
  const t = tokens as Tokens
  return (
    <div data-aui="page">
      <header data-aui="header">
        <h1>{(siteConfig as { name?: string }).name ?? 'design system'}</h1>
        {(siteConfig as { description?: string }).description && (
          <p>{(siteConfig as { description?: string }).description}</p>
        )}
      </header>

      {tokensErrors.length > 0 && (
        <div data-aui="errors" style={{ marginBottom: 24 }}>
          {tokensErrors.join('\n')}
        </div>
      )}

      {t.colors && (
        <TokenSection group="colors" name="color tokens">
          <ColorSwatchGrid items={t.colors.items} />
        </TokenSection>
      )}

      {t.surfaces && (
        <TokenSection group="surfaces" name="surfaces (8-level ladder)">
          <SurfacesLadder levels={t.surfaces.levels} conventions={t.surfaces.conventions} />
        </TokenSection>
      )}

      {t.typography && (
        <TokenSection group="typography" name="typography">
          <TypographyScale typography={t.typography} />
        </TokenSection>
      )}

      {t.spacing && (
        <TokenSection group="spacing" name="spacing">
          <SpacingScale spacing={t.spacing} />
        </TokenSection>
      )}

      {t.radius && (
        <TokenSection group="radius" name="radius">
          <RadiusScale radius={t.radius} />
        </TokenSection>
      )}

      {t.motion && (
        <TokenSection group="motion" name="motion">
          <MotionScale motion={t.motion} />
        </TokenSection>
      )}

      {(items as Item[]).map((item) => (
        <ItemSection key={`${item.category}/${item.id}`} item={item} />
      ))}
    </div>
  )
}
