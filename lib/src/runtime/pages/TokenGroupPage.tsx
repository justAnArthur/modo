import { TokenGroupView } from '../tokens/token-page'

export function TokenGroupPage({ group }: { group: string }) {
  return (
    <main data-modo="content">
      <TokenGroupView group={group} />
    </main>
  )
}
