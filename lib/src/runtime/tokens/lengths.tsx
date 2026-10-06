import { byLength, TokenLabel, type Var } from './token-row'

export function RadiusView({ vars }: { vars: Var[] }) {
  return (
    <section data-modo="section">
      <div data-modo="radius-grid">
        {byLength(vars).map(v => (
          <figure data-modo="radius-tile" key={v.name}>
            <div data-modo="radius-shape" style={{ borderRadius: `var(${v.name})` }} />
            <TokenLabel v={v} />
          </figure>
        ))}
      </div>
    </section>
  )
}

export function RadiusPreview({ vars }: { vars: Var[] }) {
  return (
    <div data-modo="token-preview">
      {byLength(vars)
        .slice(0, 5)
        .map(v => (
          <div key={v.name} data-modo="radius-shape" style={{ borderRadius: `var(${v.name})` }} />
        ))}
    </div>
  )
}

export function SpacingView({ vars }: { vars: Var[] }) {
  return (
    <section data-modo="section">
      <div data-modo="space-scale">
        {byLength(vars).map(v => (
          <div data-modo="space-step" key={v.name}>
            <TokenLabel v={v} />
            <div data-modo="space-bar" style={{ inlineSize: `var(${v.name})` }} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function SpacingPreview({ vars }: { vars: Var[] }) {
  return (
    <div data-modo="space-preview">
      {byLength(vars)
        .slice(0, 6)
        .map(v => (
          <div key={v.name} data-modo="space-bar" style={{ inlineSize: `var(${v.name})` }} />
        ))}
    </div>
  )
}
