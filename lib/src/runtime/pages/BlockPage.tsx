import { ItemPage } from '../items/item-page'

export function BlockPage({ id }: { id: string }) {
  return (
    <main data-modo="content">
      <ItemPage tier="blocks" id={id} />
    </main>
  )
}
