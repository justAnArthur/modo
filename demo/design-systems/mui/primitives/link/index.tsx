import { MuiProvider } from '../../theme'
import MuiLink from '@mui/material/Link'

/**
 * Inline anchor. Thin modo adapter over MUI's Link; the docs chrome
 * inherits it for item links in the content area.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Link href="/docs/mui">Read the MUI docs</Link>
 * ```
 *
 * @example
 * # Always underlined
 *
 * ```tsx
 * <Link href="https://mui.com" underline="always">mui.com</Link>
 * ```
 */
export default function Link({
  href,
  underline,
  color,
  children,
}: {
  /** Target URL. */
  href: string
  /** Underline behavior. @default 'hover' */
  underline?: 'always' | 'hover' | 'none'
  /** Link color. @default 'primary' */
  color?: 'primary' | 'secondary' | 'error' | 'inherit' | 'textPrimary' | 'textSecondary'
  /** Link text. */
  children?: React.ReactNode
}) {
  return (
    <MuiProvider>
      <MuiLink href={href} underline={underline} color={color}>
        {children}
      </MuiLink>
    </MuiProvider>
  )
}
