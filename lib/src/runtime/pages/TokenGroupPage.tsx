import { TokenGroupView } from '../tokens/token-page'

export function TokenGroupPage({ group }: { group: string }) {
  return (
    <>
      <TokenGroupView group={group}/>
    </>
  )
}
