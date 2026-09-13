import { items } from 'virtual:modo-items'
import { tokens } from 'virtual:modo-tokens'
import { shell } from 'virtual:modo-shell'

const Link = shell.Link
const TIERS = ['primitives', 'components', 'blocks'] as const
type Tier = (typeof TIERS)[number]
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export function HomePage() {
  return (
    <main data-aui="content">
      <header>
        <h1 data-aui="page-title">Foundations</h1>
        <p data-aui="page-lead">Tokens, primitives, components, and blocks in this design system.</p>
      </header>
      {tokens.length > 0 && (
        <section data-aui="section">
          <h2 data-aui="section-title">Tokens</h2>
          <ul>
            {tokens.map((g) => (
              <li key={g.name}>
                <Link href={`/docs/tokens/${g.name}`}>{g.name}</Link>{' '}
                <small>({g.vars.length} vars)</small>
              </li>
            ))}
          </ul>
        </section>
      )}
      {TIERS.map((tier) => {
        const list = items.filter((it) => it.tier === tier)
        if (!list.length) return null
        return <TierSection key={tier} title={cap(tier)} tier={tier} list={list} />
      })}
    </main>
  )
}

function TierSection({ title, tier, list }: {
  title: string
  tier: Tier
  list: typeof items
}) {
  return (
    <section data-aui="section">
      <h2 data-aui="section-title">{title}</h2>
      <ul>
        {list.map((it) => (
          <li key={it.id}>
            <Link href={`/docs/${tier}/${it.id}`}>{it.name}</Link>
            {it.description ? <> — <span>{it.description.split('\n')[0]}</span></> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
