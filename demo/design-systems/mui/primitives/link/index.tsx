import MuiLink from '@mui/material/Link'
import { MuiProvider } from '../../theme'

/**
 * Inline anchor. Thin modo adapter over MUI's Link; the docs chrome
 * inherits it for item links in the content area.
 *
 * @example {@include ./examples.mdx}
 */
export default function Link({
  href,
  underline,
  color,
  children,
}: {
  /** Target URL. */
  href: string
  /** Underline behavior. @default 'always' */
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
