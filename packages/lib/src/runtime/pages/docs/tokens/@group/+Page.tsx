// /docs/tokens/:group — per-token-group page.
import { tokens, errors as tokensErrors, css as tokensCss } from 'virtual:modo-tokens'
import { usePageContext } from 'vike-react/usePageContext'

export default function TokenPage() {
  const pageContext = usePageContext()
  const group = (pageContext.routeParams as { group: string }).group
  const t = tokens as any
  const data = t[group]

  if (!data) {
    return (
      <>
        <h1 data-aui="page-title">token group not found</h1>
        <p>no tokens for group <code>{group}</code>.</p>
      </>
    )
  }

  return (
    <>
      <style>{tokensCss}</style>
      <h1 data-aui="page-title">{group}</h1>
      {data.description && <p data-aui="page-lead">{data.description}</p>}

      {tokensErrors.length > 0 && (
        <div data-aui="errors">{tokensErrors.join('\n')}</div>
      )}

      <TokenGroup group={group} data={data} />
    </>
  )
}

function TokenGroup({ group, data }: { group: string; data: any }) {
  if (group === 'colors' && data.items) {
    return (
      <div data-aui="swatch-grid">
        {Object.entries(data.items).map(([name, token]: [string, any]) => {
          const cssVar = '--' + name.replace(/_/g, '-')
          return (
            <div key={name} data-aui="swatch">
              <div data-aui="swatch-color" style={{ background: `var(${cssVar}, ${token.value})` }} />
              <div data-aui="swatch-meta">
                <span data-aui="swatch-role">{token.role} · {token.semantic}</span>
                <span data-aui="swatch-name">{name}</span>
                <span data-aui="swatch-value">{token.value}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  if (group === 'surfaces' && data.levels) {
    return (
      <>
        <div data-aui="surfaces-ladder">
          {Object.entries(data.levels).map(([n, lvl]: [string, any]) => (
            <div key={n} data-aui="surface-level" data-level={n}>
              <span data-aui="surface-level-num">{n}</span>
              <span data-aui="surface-level-swatch" style={{ background: `var(--surface-${n})`, boxShadow: `var(--shadow-${n})` }} />
              <span data-aui="surface-level-meta">bg: surface-{n} · shadow: shadow-{n}</span>
            </div>
          ))}
        </div>
        {data.conventions && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <strong>conventions:</strong>{' '}
            {Object.entries(data.conventions).map(([name, c]: [string, any]) => `${name} = +${c.offset}`).join(' · ')}
          </div>
        )}
      </>
    )
  }
  if (group === 'typography') {
    return (
      <div data-aui="typo-families">
        {data.families && (
          <div data-aui="typo-family-list">
            {Object.entries(data.families).map(([name, value]: [string, any]) => (
              <div key={name} data-aui="typo-family" style={{ fontFamily: String(value) }}>
                <span data-aui="typo-family-name">{name}</span>
                <span data-aui="typo-family-sample">The quick brown fox jumps over the lazy dog — {name}</span>
                <span data-aui="typo-family-value">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
        {data.scale && (
          <div data-aui="typo-scale">
            {Object.entries(data.scale).map(([name, def]: [string, any]) => (
              <div key={name} data-aui="typo-scale-row" style={{ fontSize: def.size, lineHeight: def.lineHeight, letterSpacing: def.letterSpacing }}>
                <span data-aui="typo-scale-name">{name}</span>
                <span data-aui="typo-scale-sample">Modo — fluid functionalism — 0123456789</span>
                <span data-aui="typo-scale-meta">{def.size} / {def.lineHeight} / {def.letterSpacing}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  if (group === 'spacing' && data.scale) {
    return (
      <div data-aui="spacing-scale">
        {Object.entries(data.scale).map(([name, def]: [string, any]) => (
          <div key={name} data-aui="spacing-row">
            <span data-aui="spacing-name">{name}</span>
            <span data-aui="spacing-bar" style={{ width: `var(--space-${name}, ${def.value})` }} />
            <span data-aui="spacing-meta">{def.value} · {def.px}px</span>
          </div>
        ))}
      </div>
    )
  }
  if (group === 'radius' && data.scale) {
    return (
      <div data-aui="radius-scale">
        {Object.entries(data.scale).map(([name, def]: [string, any]) => (
          <div key={name} data-aui="radius-tile">
            <div data-aui="radius-preview" style={{ borderRadius: `var(--radius-${name}, ${def.value})` }} />
            <span data-aui="radius-name">{name}</span>
            <span data-aui="radius-value">{def.value}</span>
          </div>
        ))}
      </div>
    )
  }
  if (group === 'motion' && data.durations) {
    return (
      <div data-aui="motion-scale">
        {Object.entries(data.durations).map(([name, def]: [string, any]) => (
          <div key={name} data-aui="motion-row">
            <span data-aui="motion-name">{name}</span>
            <div data-aui="motion-bar" style={{ animation: `modo-motion-bar 2s var(--ease-standard) infinite`, animationDuration: def.value }} />
            <span data-aui="motion-value">{def.value} · {def.ms}ms</span>
          </div>
        ))}
      </div>
    )
  }
  return <pre data-aui="raw-json">{JSON.stringify(data, null, 2)}</pre>
}
