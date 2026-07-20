// home page. renders every token group + every item. structured data
// comes from the source plugin via virtual:modo-items + virtual:modo-tokens;
// the actual swatch/ladder/scale markup lives in components/token-renderers
// and is shared with the per-group pages.

import { tokens, errors as tokensErrors } from 'virtual:modo-tokens'
import { items, byId, components as itemComponents, examples as itemExamples } from 'virtual:modo-items'
import { config as siteConfig } from 'virtual:modo-config'
import { ItemExamples } from '../../components/item-examples'
import { PropTable } from '../../components/prop-table'
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
      <p data-aui="item-section-lead">
        <strong>{meta.name}</strong>
        {meta.description && <> — {meta.description}</>}
      </p>
      <ItemExamples
        examples={examples}
        componentName={meta.name}
        Component={Component}
        compiledBodies={compiledBodies}
      />
      {propDefs.length > 0 && (
        <div data-aui="item-props">
          <h3 data-aui="item-props-title">props</h3>
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
      <p data-aui="section-lead">
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
