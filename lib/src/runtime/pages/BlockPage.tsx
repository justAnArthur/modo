import { ItemPage } from '../items/item-page'

export function BlockPage({ id }: { id: string }) {
  return (
    <ItemPage tier="blocks" id={id}/>
  )
}
