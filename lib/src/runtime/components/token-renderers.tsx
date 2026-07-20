// shared renderers for the docs site. used by:
//   - pages/index/+Page.tsx                : renders all token groups on
//                                           the home page
//   - pages/docs/tokens/@group/+Page.tsx   : renders one group at a time
//                                           based on the :group route param
//
// each renderer takes the relevant token group shape (loosely typed —
// the parser output is `any` in many places) and emits a self-contained
// section of the docs page. data-* attributes match what the lib's
// structural CSS in styles/base.css expects.

import type { ReactNode } from 'react'

// ── colors ────────────────────────────────────────────────────────────

export function ColorSwatchGrid({ items }: { items: Record<string, { value: string; semantic: string; role: string }> }) {
  return (
    <div data-aui="swatch-grid">
      {Object.entries(items).map(([name, token]) => (
        <div key={name} data-aui="swatch">
          <div
            data-aui="swatch-color"
            style={{ background: `var(--${name.replace(/_/g, '-')}, ${token.value})` }}
          />
          <div data-aui="swatch-meta">
            <span data-aui="swatch-role">{token.role} · {token.semantic}</span>
            <span data-aui="swatch-name">{name}</span>
            <span data-aui="swatch-value">{token.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── typography ────────────────────────────────────────────────────────

export function TypographyScale({ typography }: { typography: any }) {
  const families = typography?.families ?? {}
  const scale = typography?.scale ?? {}
  return (
    <div data-aui="typo-families">
      <div data-aui="typo-family-list">
        {Object.entries(families).map(([name, value]: [string, any]) => (
          <div key={name} data-aui="typo-family" style={{ fontFamily: String(value) }}>
            <span data-aui="typo-family-name">{name}</span>
            <span data-aui="typo-family-sample">The quick brown fox jumps over the lazy dog — {name}</span>
            <span data-aui="typo-family-value">{String(value)}</span>
          </div>
        ))}
      </div>
      <div data-aui="typo-scale">
        {Object.entries(scale).map(([name, def]: [string, any]) => (
          <div
            key={name}
            data-aui="typo-scale-row"
            style={{ fontSize: def.size, lineHeight: def.lineHeight, letterSpacing: def.letterSpacing }}
          >
            <span data-aui="typo-scale-name">{name}</span>
            <span data-aui="typo-scale-sample">Modo — fluid functionalism — 0123456789</span>
            <span data-aui="typo-scale-meta">{def.size} / {def.lineHeight} / {def.letterSpacing}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── spacing ───────────────────────────────────────────────────────────

export function SpacingScale({ spacing }: { spacing: any }) {
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

// ── radius ────────────────────────────────────────────────────────────

export function RadiusScale({ radius }: { radius: any }) {
  const scale = radius?.scale ?? {}
  return (
    <div data-aui="radius-scale">
      {Object.entries(scale).map(([name, def]: [string, any]) => (
        <div key={name} data-aui="radius-tile">
          <div
            data-aui="radius-preview"
            style={{ borderRadius: `var(--radius-${name}, ${def.value})` }}
          />
          <span data-aui="radius-name">{name}</span>
          <span data-aui="radius-value">{def.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── motion ────────────────────────────────────────────────────────────

export function MotionScale({ motion }: { motion: any }) {
  const durations = motion?.durations ?? {}
  return (
    <div data-aui="motion-scale">
      {Object.entries(durations).map(([name, def]: [string, any]) => {
        const ms = def.ms ?? 0
        // bar width = ms * 0.8px (clamped in CSS). the animation also
        // travels ms * 0.8px so visually "shorter" = faster.
        const distance = `clamp(16px, ${ms * 0.8}px, 400px)`
        return (
          <div key={name} data-aui="motion-row">
            <span data-aui="motion-name">{name}</span>
            <div
              data-aui="motion-bar"
              style={{
                ['--motion-ms' as any]: ms,
                ['--motion-duration' as any]: def.value,
                ['--motion-bar-distance' as any]: distance,
                animationDuration: def.value,
              }}
            />
            <span data-aui="motion-value">{def.value} · {ms}ms</span>
          </div>
        )
      })}
    </div>
  )
}

// ── one entry point: pick a renderer for a group name ────────────────

export function TokenGroup({ group, data }: { group: string; data: any }): ReactNode {
  if (group === 'colors' && data.items) {
    return <ColorSwatchGrid items={data.items} />
  }
  if (group === 'typography') {
    return <TypographyScale typography={data} />
  }
  if (group === 'spacing' && data.scale) {
    return <SpacingScale spacing={data} />
  }
  if (group === 'radius' && data.scale) {
    return <RadiusScale radius={data} />
  }
  if (group === 'motion' && data.durations) {
    return <MotionScale motion={data} />
  }
  return <pre data-aui="raw-json">{JSON.stringify(data, null, 2)}</pre>
}
