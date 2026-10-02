import './card.css'
import Button from '../../primitives/button'

/**
 * Composed card with title, body, and a primary action.
 */
export default function Card({ title, children }: {
  /** Card heading. */
  title: string
  /** Card body. */
  children?: React.ReactNode
}) {
  return (
    <div className="my-card">
      <h3 className="my-card-title">{title}</h3>
      <div className="my-card-body">{children}</div>
      <Button>OK</Button>
    </div>
  )
}
