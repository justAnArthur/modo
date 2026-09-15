import { ItemPage } from '../items/item-page'

export function ComponentPage({ id }: { id: string }) {
  return (
    <main data-modo="content">
      <ItemPage tier="components" id={id} />
    </main>
  )
}
