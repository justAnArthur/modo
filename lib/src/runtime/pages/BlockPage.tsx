import { ItemPage } from '../items/item-page'

export function BlockPage({ id }: { id: string }) {
  return (
    <main data-aui="content">
      <ItemPage tier="blocks" id={id} />
    </main>
  )
}
