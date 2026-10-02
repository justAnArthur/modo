import { shell } from 'virtual:modo-shell'

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
}

/**
 * Hover-revealed `#` link to a heading; sits inside the heading it targets.
 * The hook is on a wrapper: a host Link needn't forward data attributes.
 */
export function Anchor({ id, label }: { id: string; label: string }) {
  const { Link, Icon } = shell
  return (
    <span data-modo="anchor">
      <Link href={`#${id}`} aria-label={`Link to ${label}`}>
        <Icon name="link" label="#" />
      </Link>
    </span>
  )
}
