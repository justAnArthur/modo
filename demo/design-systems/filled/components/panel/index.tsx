import './panel.css'

/**
 * Right-side panel wrapper. The lib's docs chrome renders this inside
 * `<aside data-aui="panel">`.
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
export default function Panel({ children }: {
  /** Panel body. */
  children?: React.ReactNode
}) {
  return (
    <div data-aui="shell-panel" className="my-panel">
      {children}
    </div>
  )
}
