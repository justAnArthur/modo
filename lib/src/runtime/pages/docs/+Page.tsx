// /docs — overview. lists all foundations + items as cards.
import { tokens, errors as tokensErrors, css as tokensCss } from 'virtual:modo-tokens'
import { items } from 'virtual:modo-items'

export default function DocsHome() {
  return (
    <>
      <style>{tokensCss}</style>
      <h1 data-aui="page-title">Documentation</h1>
      <p data-aui="page-lead">auto-rendered from your tokens, primitives, components, and blocks. zero-config.</p>

      {tokensErrors.length > 0 && (
        <div data-aui="errors">{tokensErrors.join('\n')}</div>
      )}

      <h2 data-aui="section-title">foundations</h2>
      <ul data-aui="docs-foundation-list">
        {tokens.colors && <li><a href="/docs/colors">colors</a></li>}
        {tokens.surfaces && <li><a href="/docs/surfaces">surfaces</a></li>}
        {tokens.typography && <li><a href="/docs/typography">typography</a></li>}
        {tokens.spacing && <li><a href="/docs/spacing">spacing</a></li>}
        {tokens.radius && <li><a href="/docs/radius">radius</a></li>}
        {tokens.motion && <li><a href="/docs/motion">motion</a></li>}
      </ul>

      <h2 data-aui="section-title">primitives</h2>
      <ul data-aui="docs-item-list">
        {(items as any[]).filter((i) => i.category === 'primitives').map((i) => (
          <li key={i.id}><a href={`/docs/primitives/${i.id}`}>{i.id}</a></li>
        ))}
      </ul>

      <h2 data-aui="section-title">components</h2>
      <ul data-aui="docs-item-list">
        {(items as any[]).filter((i) => i.category === 'components').map((i) => (
          <li key={i.id}><a href={`/docs/components/${i.id}`}>{i.id}</a></li>
        ))}
      </ul>

      <h2 data-aui="section-title">blocks</h2>
      <ul data-aui="docs-item-list">
        {(items as any[]).filter((i) => i.category === 'blocks').map((i) => (
          <li key={i.id}><a href={`/docs/blocks/${i.id}`}>{i.id}</a></li>
        ))}
      </ul>
    </>
  )
}
