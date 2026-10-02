import { MuiProvider } from '../../theme'
import Paper from '@mui/material/Paper'

/**
 * Elevated surface. Paper-based.
 *
 * {@include ./panel.mdx}
 */
export default function Panel({
  elevation = 1,
  children,
}: {
  /** Shadow depth, 0–24. @default 1 */
  elevation?: number
  /** Panel body. */
  children?: React.ReactNode
}) {
  return (
    <MuiProvider>
      <Paper elevation={elevation}>{children}</Paper>
    </MuiProvider>
  )
}
