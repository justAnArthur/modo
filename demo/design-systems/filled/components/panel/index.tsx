import './panel.css'

/**
 * Right-side panel wrapper surface.
 *
 * @example {@include ./examples.mdx}
 */
export default function Panel({ children }: {
  /** Panel body. */
  children?: React.ReactNode
}) {
  return (
    <div data-modo="shell-panel" className="my-panel">
      {children}
    </div>
  )
}
