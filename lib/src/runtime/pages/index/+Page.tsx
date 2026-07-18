import { tokens, errors as tokensErrors, css as tokensCss } from 'virtual:modo-tokens'
import { items, byId } from 'virtual:modo-items'
import { config as siteConfig } from 'virtual:modo-config'
import { ExampleBlock } from '../../components/example-renderer'

// all item components + parsed metadata are pre-bundled by the source
// plugin and exposed via the `virtual:modo-items` module. importing the
// module here returns a fully-typed map keyed by `category/id`.
import { components as itemComponents } from 'virtual:modo-items'

type Item = (typeof items)[number]
type Tokens = typeof tokens

function ColorSwatch({ name, token }: { name: string; token: { value: string; semantic: string; role: string } }) {
  const cssVar = '--' + name.replace(/_/g, '-')
  return (
    <div data-aui="swatch">
      <div data-aui="swatch-color" style={{ background: `var(${cssVar}, ${token.value})` }} />
      <div data-aui="swatch-meta">
        <span data-aui="swatch-role">{token.role} · {token.semantic}</span>
        <span data-aui="swatch-name">{name}</span>
        <span data-aui="swatch-value">{token.value}</span>
      </div>
    </div>
  )
}

function SurfacesLadder({ surfaces }: { surfaces: { levels: Record<string, { bg: string; shadow: string }> } }) {
  return (
    <div data-aui="surfaces-ladder">
      {Object.entries(surfaces.levels).map(([n, lvl]) => {
        const bgVar = '--' + lvl.bg.replace(/_/g, '-')
        return (
          <div key={n} data-aui="surface-level" data-level={n}>
            <span data-aui="surface-level-num">{n}</span>
            <span data-aui="surface-level-swatch" style={{ background: `var(${bgVar})`, boxShadow: `var(--${lvl.shadow})` }} />
            <span data-aui="surface-level-meta">
              bg: {lvl.bg} · shadow: {lvl.shadow}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TypographyScale({ typography }: { typography: any }) {
  const families = typography?.families ?? {}
  const scale = typography?.scale ?? {}
  return (
    <div data-aui="typo-families">
      <div data-aui="typo-family-list">
        {Object.entries(families).map(([name, value]) => (
          <div key={name} data-aui="typo-family" style={{ fontFamily: String(value) }}>
            <span data-aui="typo-family-name">{name}</span>
            <span data-aui="typo-family-sample">The quick brown fox jumps over the lazy dog — {name}</span>
            <span data-aui="typo-family-value">{String(value)}</span>
          </div>
        ))}
      </div>
      <div data-aui="typo-scale">
        {Object.entries(scale).map(([name, def]: [string, any]) => (
          <div key={name} data-aui="typo-scale-row" style={{ fontSize: def.size, lineHeight: def.lineHeight, letterSpacing: def.letterSpacing }}>
            <span data-aui="typo-scale-name">{name}</span>
            <span data-aui="typo-scale-sample">Modo — fluid functionalism — 0123456789</span>
            <span data-aui="typo-scale-meta">{def.size} / {def.lineHeight} / {def.letterSpacing}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpacingScale({ spacing }: { spacing: any }) {
  const scale = spacing?.scale ?? {}
  return (
    <div data-aui="spacing-scale">
      {Object.entries(scale).map(([name, def]: [string, any]) => (
        <div key={name} data-aui="spacing-row">
          <span data-aui="spacing-name">{name}</span>
          <span data-aui="spacing-bar" style={{ width: `var(--space-${name}, ${def.value})` }} />
          <span data-aui="spacing-meta">{def.value} · {def.px}px</span>
        </div>
      ))}
    </div>
  )
}

function RadiusScale({ radius }: { radius: any }) {
  const scale = radius?.scale ?? {}
  return (
    <div data-aui="radius-scale">
      {Object.entries(scale).map(([name, def]: [string, any]) => (
        <div key={name} data-aui="radius-tile">
          <div data-aui="radius-preview" style={{ borderRadius: `var(--radius-${name}, ${def.value})` }} />
          <span data-aui="radius-name">{name}</span>
          <span data-aui="radius-value">{def.value}</span>
        </div>
      ))}
    </div>
  )
}

function MotionScale({ motion }: { motion: any }) {
  const durations = motion?.durations ?? {}
  return (
    <div data-aui="motion-scale">
      {Object.entries(durations).map(([name, def]: [string, any]) => (
        <div key={name} data-aui="motion-row">
          <span data-aui="motion-name">{name}</span>
          <div
            data-aui="motion-bar"
            style={{
              animation: `modo-motion-bar 2s var(--ease-standard) infinite`,
              animationDuration: def.value,
            }}
          />
          <span data-aui="motion-value">{def.value} · {def.ms}ms</span>
        </div>
      ))}
    </div>
  )
}

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

  return (
    <section data-aui="section">
      <h2 data-aui="section-title">{item.category} / {item.id}</h2>
      <p style={{ color: 'var(--muted-foreground)', margin: '0 0 16px' }}>
        <strong style={{ color: 'var(--foreground)' }}>{meta.name}</strong>
        {meta.description && <> — {meta.description}</>}
      </p>
      <div data-aui="examples">
        {examples.map((ex: any, i: number) => (
          <ExampleBlock key={i} example={ex} componentName={meta.name} Component={Component} />
        ))}
      </div>
      {propDefs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
            props
          </h3>
          <table data-aui="prop-table">
            <thead>
              <tr><th>prop</th><th>type</th><th>default</th><th>values</th><th>description</th></tr>
            </thead>
            <tbody>
              {propDefs.map((p: any) => (
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
    <>
      <style>{tokensCss}</style>
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
            <div data-aui="swatch-grid">
              {Object.entries(t.colors.items).map(([name, token]: [string, any]) => (
                <ColorSwatch key={name} name={name} token={token} />
              ))}
            </div>
          </TokenSection>
        )}

        {t.surfaces && (
          <TokenSection group="surfaces" name="surfaces (8-level ladder)">
            <SurfacesLadder surfaces={t.surfaces} />
            {t.surfaces.conventions && (
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted-foreground)' }}>
                <strong>conventions:</strong>{' '}
                {Object.entries(t.surfaces.conventions).map(([name, c]: [string, any]) =>
                  `${name} = +${c.offset}`
                ).join(' · ')}
              </div>
            )}
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
    </>
  )
}
