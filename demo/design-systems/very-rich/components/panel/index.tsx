import './panel.css'

/**
 * Right-side chrome wrapper. The lib's docs site renders this inside
 * `<aside data-modo="panel">` — `children` is whatever the user wants to ship
 * in the panel (theme switcher, table of contents, etc.).
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Panel>
 *   <p>Make them yours.</p>
 * </Panel>
 * ```
 */
export default function Panel({
  children,
}: {
  /** Panel body. */
  children?: React.ReactNode
}) {
  return (
    <div className="my-panel" data-modo="panel">
      {children}
    </div>
  )
}
