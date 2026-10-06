import './panel.css'

/**
 * Muted surface that pads and groups its content.
 *
 * @example {@include ./examples.mdx}
 */
export default function Panel({
  children,
}: {
  /** Panel body. */
  children?: React.ReactNode
}) {
  return <div className="my-panel">{children}</div>
}
