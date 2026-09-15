import { ItemPage } from '../items/item-page'

export function PrimitivePage({ id }: { id: string }) {
  return (
    <main data-modo="content">
      <ItemPage tier="primitives" id={id} />
    </main>
  )
}
