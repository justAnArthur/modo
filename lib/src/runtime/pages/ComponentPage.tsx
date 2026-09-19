import { ItemPage } from '../items/item-page'

export function ComponentPage({ id }: { id: string }) {
  return (
    <ItemPage tier="components" id={id}/>
  )
}
