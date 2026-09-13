import './code.css'

/**
 * Inline code block. Monospace, padded, bordered.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Code>const x = 42</Code>
 * ```
 *
 * @example
 * # With language hint
 *
 * ```tsx
 * <Code language="tsx">{"<Button>Save</Button>"}</Code>
 * ```
 */
export default function Code({
  children,
  language,
}: {
  /** Code contents. */
  children?: React.ReactNode
  /** Language hint — affects CSS class only, no syntax highlighting. */
  language?: string
}) {
  return (
    <pre className="my-code">
      <code data-language={language}>{children}</code>
    </pre>
  )
}
