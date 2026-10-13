interface BadgeProps {
  /** The label. */
  label: string
}

/**
 * A badge kept in a sibling file.
 *
 * @example {@include ./examples.mdx}
 */
export default function Badge({ label }: BadgeProps) {
  return <span>{label}</span>
}
