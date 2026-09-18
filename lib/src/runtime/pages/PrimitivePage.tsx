import { ItemPage } from '../items/item-page'

export function PrimitivePage({ id }: { id: string }) {
  return (
    <>
      <ItemPage tier="primitives" id={id} />
    </>
  )
}
